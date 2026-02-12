import path from 'path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';
import { UpdateService } from './services/UpdateService';
import http from 'http';
import url from 'url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store() as any;

// OAuth Server State
let authServer: http.Server | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set App Name for Menu Bar (macOS)
if (process.platform === 'darwin') {
    app.setName('Qudoro');
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../public/icon.png'), // For Windows/Linux
    title: 'Qudoro',
    frame: false, // Frameless
    titleBarStyle: 'hidden', 
    backgroundColor: '#0f172a', // Dark background color (slate-900) to match dark theme
    trafficLightPosition: { x: -100, y: -100 }, // Hide macOS controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Initialize Update Service
  new UpdateService(mainWindow);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// IPC Handlers
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.minimize();
});

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (process.platform === 'darwin') {
      const isFullScreen = win.isFullScreen();
      win.setFullScreen(!isFullScreen);
  } else {
      if (win.isMaximized()) {
          win.unmaximize();
      } else {
          win.maximize();
      }
  }
});

ipcMain.on('exit-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (win.isFullScreen()) {
        win.setFullScreen(false);
    }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
});

ipcMain.handle('open-external-url', async (event, url) => {
    await shell.openExternal(url);
});

ipcMain.handle('start-auth-server', async () => {
  return new Promise<{ success: boolean; port: number; error?: string }>((resolve) => {
    if (authServer) {
      authServer.close();
      authServer = null;
    }

    const server = http.createServer();
    // Use port 54321
    server.listen(54321, '127.0.0.1', () => {
      resolve({ success: true, port: 54321 });
    });

    server.on('error', (err) => {
        resolve({ success: false, port: 0, error: err.message });
    });

    authServer = server;
  });
});

ipcMain.handle('start-browser-login', async (event, schoolUrl: string) => {
    return new Promise<{ success: boolean; token?: string; error?: string; authType?: 'Bearer' | 'Cookie' }>((resolve) => {
        const loginWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            },
            title: 'Login to Blackboard'
        });

        const cleanUrl = schoolUrl.replace(/\/$/, '');
        loginWindow.loadURL(cleanUrl);

        let tokenFound = false;

        // Intercept requests to find Authorization header
        const filter = {
            urls: ['*://*/*']
        };

        // 1. Try to catch Bearer Token (Preferred)
        loginWindow.webContents.session.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
            if (!tokenFound) {
                // Check if request is to the school's API (roughly) or contains Bearer token
                const authHeader = Object.entries(details.requestHeaders).find(
                    ([key]) => key.toLowerCase() === 'authorization'
                )?.[1];

                if (authHeader && authHeader.match(/^Bearer /i)) {
                    const token = authHeader.substring(7);
                    tokenFound = true;
                    console.log('Intercepted Bearer Token');
                    loginWindow.close();
                    resolve({ success: true, token, authType: 'Bearer' });
                }
            }
            callback({ requestHeaders: details.requestHeaders });
        });

        // 2. Fallback: Catch Cookies on Navigation to Dashboard
        loginWindow.webContents.on('did-navigate', async (event, url) => {
            // Check if we are on a dashboard-like page (not login page)
            // Common Blackboard dashboard paths: /ultra/, /webapps/portal/, /
            if (!url.includes('login') && (url.includes('/ultra/') || url.includes('/webapps/portal/') || url === cleanUrl + '/')) {
                
                // Wait a moment for cookies to be set
                setTimeout(async () => {
                    if (tokenFound) return;

                    try {
                        const cookies = await loginWindow.webContents.session.cookies.get({ url });
                        // Look for session cookies
                        const sessionCookie = cookies.find(c => c.name === 'JSESSIONID' || c.name.includes('Session'));
                        
                        if (sessionCookie) {
                             // Construct Cookie string
                             const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                             
                             // If we haven't found a Bearer token yet, maybe this is enough?
                             // Let's force a fetch to be sure
                             const hasApiAccess = await loginWindow.webContents.executeJavaScript(`
                                fetch('/learn/api/public/v1/users/me').then(r => r.ok).catch(() => false)
                             `);

                             if (hasApiAccess && !tokenFound) {
                                 tokenFound = true;
                                 console.log('Intercepted Session Cookies');
                                 loginWindow.close();
                                 resolve({ success: true, token: cookieString, authType: 'Cookie' });
                             }
                        }
                    } catch (err) {
                        console.error('Cookie check failed', err);
                    }
                }, 2000);
            }
        });
        
        // 3. Force API Check Injection
        loginWindow.webContents.on('did-finish-load', () => {
             const url = loginWindow.webContents.getURL();
             if (url.includes('blackboard') && !url.includes('login')) {
                 // Attempt to force a request that might trigger the token sniffer
                 loginWindow.webContents.executeJavaScript(`
                    fetch('/learn/api/public/v1/users/me').catch(e => console.error(e));
                 `);
             }
        });

        loginWindow.on('closed', () => {
            if (!tokenFound) {
                resolve({ success: false, error: 'Login window closed without capturing token.' });
            }
        });
    });
});

ipcMain.handle('wait-for-auth-code', async () => {
    if (!authServer) throw new Error('Auth server not started');
    
    return new Promise<string>((resolve, reject) => {
        // Set a timeout of 5 minutes
        const timeout = setTimeout(() => {
            if (authServer) {
                authServer.close();
                authServer = null;
            }
            reject(new Error('Auth timed out'));
        }, 300000);

        authServer?.on('request', (req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            
            if (parsedUrl.pathname === '/callback') {
                const code = parsedUrl.query.code as string;
                
                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end('<h1>Login Successful</h1><p>You can close this window and return to Qudoro.</p><script>window.close()</script>');
                    
                    if (authServer) {
                        authServer.close();
                        authServer = null;
                    }
                    clearTimeout(timeout);
                    resolve(code);
                    
                    // Focus the app
                    const wins = BrowserWindow.getAllWindows();
                    if (wins.length > 0) {
                        if (wins[0].isMinimized()) wins[0].restore();
                        wins[0].focus();
                    }
                } else {
                    res.writeHead(400);
                    res.end('No code returned');
                }
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });
    });
});

// Store IPC
ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.on('set-store-value', (event, key, value) => {
  store.set(key, value);
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

// Handle PDF parsing
ipcMain.handle('parse-pdf', async (event, buffer) => {
  try {
    const dataBuffer = Buffer.from(buffer);
    // pdf-parse expects a buffer, verify we have one
    if (!Buffer.isBuffer(dataBuffer)) {
        throw new Error('Invalid buffer provided to PDF parser');
    }
    // Convert to Uint8Array as required by pdf-parse v2
    const uint8Array = new Uint8Array(dataBuffer);
    const parser = new PDFParse(uint8Array);
    const data = await parser.getText();
    return { success: true, text: data.text };
  } catch (error) {
    console.error('PDF Parse error:', error);
    return { success: false, error: error.message };
  }
});

// Fetch URL (for Quizlet Import)
ipcMain.handle('fetch-url', async (event, url) => {
  try {
    const win = new BrowserWindow({
      show: false,
      width: 1000,
      height: 800,
      webPreferences: {
        offscreen: false, 
      }
    });

    // Set a proper user agent
    win.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await win.loadURL(url);
    
    // Wait for potential Cloudflare challenges or dynamic content loading
    // We wait up to 30 seconds, checking every 1s
    let attempts = 0;
    let content = '';
    
    while (attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        content = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
        
        // Check if we passed the challenge (title is not "Just a moment...")
        // And if we have some quizlet data markers
        // We log the title for debugging
        const title = await win.webContents.executeJavaScript('document.title');

        if (!content.includes('<title>Just a moment...</title>') && 
           (content.includes('SetPageTerms-term') || 
            content.includes('__NEXT_DATA__') || 
            content.includes('window.Quizlet') ||
            content.includes('application/ld+json') ||
            content.includes('StudiableItem') ||
            content.includes('TermText') ||
            // Fallback: If title is the set title (not "Just a moment..."), we might have loaded
            (title && !title.includes('Just a moment') && content.length > 50000))) {
             
             // Additional wait to ensure dynamic content settles
             await new Promise(resolve => setTimeout(resolve, 3000));
             // Re-fetch content after settling
             content = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
             break;
        }
        
        // Attempt to scroll to trigger lazy loading if we are not on the challenge page
        if (!content.includes('<title>Just a moment...</title>')) {
             await win.webContents.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)');
             // Also simulate a mouse move to trigger hydration
             if (win.webContents) {
                win.webContents.sendInputEvent({ type: 'mouseMove', x: 100, y: 100 });
             }
        }

        attempts++;
    }

    win.destroy();
    return { success: true, data: content };
  } catch (error) {
    console.error('Fetch error:', error);
    return { success: false, error: error.message };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    // Set Dock Icon for macOS (especially useful in dev)
    if (process.platform === 'darwin') {
        const iconPath = path.join(__dirname, '../../public/icon.png');
        app.dock.setIcon(iconPath);
    }
    createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
