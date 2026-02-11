import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';
import { UpdateService } from './services/UpdateService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store() as any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../../public/icon.png'), // For Windows/Linux
    frame: false, // Frameless
    titleBarStyle: 'hidden', 
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

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  win?.close();
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
        console.log('Current page title:', title);

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
app.on('ready', createWindow);

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
