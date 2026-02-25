import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, ipcMain, shell, session, safeStorage } from 'electron';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';
import { UpdateService } from './services/UpdateService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store() as any;

let mainWindow: BrowserWindow | null = null;
let donationWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in main process:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection in main process:', reason);
});

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
});

// Set App Name for Menu Bar (macOS)
if (process.platform === 'darwin') {
    app.setName('Qudoro');
}

const resolveAppIconPath = (): string | undefined => {
  const candidates = [
    path.join(__dirname, '../renderer/main_window/icon.png'),
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(process.cwd(), 'dist/icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(__dirname, '../../public/icon.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

const isSafeExternalUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const isAllowedAppNavigation = (rawUrl: string): boolean => {
  if (rawUrl.startsWith('file://')) return true;
  const devServerUrl =
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'string'
      ? MAIN_WINDOW_VITE_DEV_SERVER_URL
      : undefined;
  if (devServerUrl && rawUrl.startsWith(devServerUrl)) return true;
  return false;
};

const createWindow = () => {
  const appIconPath = resolveAppIconPath();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: appIconPath, // For Windows/Linux
    title: 'Qudoro',
    frame: false, // Frameless
    titleBarStyle: 'hidden', 
    backgroundColor: '#0f172a', // Dark background color (slate-900) to match dark theme
    trafficLightPosition: { x: -100, y: -100 }, // Hide macOS controls
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppNavigation(url)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        void shell.openExternal(url);
      }
    }
  });

  // Block common DevTools shortcuts in packaged app.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!app.isPackaged) return;
    const isToggleDevTools =
      (input.meta && input.alt && input.key.toLowerCase() === 'i') ||
      (input.ctrl && input.shift && input.key.toLowerCase() === 'i') ||
      input.key === 'F12';
    if (isToggleDevTools) {
      event.preventDefault();
    }
  });

  if (app.isPackaged) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details.reason, details.exitCode);
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Reload once to recover from transient renderer crashes.
    mainWindow.reload();
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Main window renderer became unresponsive.');
  });

  // Initialize Update Service
  new UpdateService(mainWindow);

  const loadMainWindow = async () => {
    const devServerUrl =
      typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === 'string'
        ? MAIN_WINDOW_VITE_DEV_SERVER_URL
        : undefined;
    const viteRendererName =
      typeof MAIN_WINDOW_VITE_NAME === 'string' ? MAIN_WINDOW_VITE_NAME : undefined;
    const rendererName = viteRendererName || 'main_window';
    const fallbackCandidates = [
      path.join(__dirname, `../renderer/${rendererName}/index.html`),
      path.join(app.getAppPath(), 'dist/index.html'),
      path.join(process.cwd(), 'dist/index.html'),
    ];

    if (devServerUrl) {
      try {
        await mainWindow.loadURL(devServerUrl);
        return;
      } catch (error) {
        console.warn(
          `Failed to load dev server URL (${devServerUrl}), falling back to local renderer.`,
          error,
        );
      }
    }

    const fallbackPath = fallbackCandidates.find((candidate) => fs.existsSync(candidate));
    if (fallbackPath) {
      await mainWindow.loadFile(fallbackPath);
      return;
    }

    const errorHtml = `<!doctype html><html><head><meta charset="UTF-8"><title>Qudoro Launch Error</title></head><body style="font-family: -apple-system, sans-serif; background:#0f172a; color:#e2e8f0; padding:24px;"><h2>Qudoro could not load its UI</h2><p>No local renderer file was found.</p><p>Expected one of:</p><pre>${fallbackCandidates.join('\n')}</pre></body></html>`;
    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  };

  void loadMainWindow().catch((error) => {
    console.error('Failed to load main window content', error);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

const isDonationCompleteUrl = (rawUrl: string): boolean => {
  const u = rawUrl.toLowerCase();
  return (
    u.includes('status=complete') ||
    u.includes('payment=complete') ||
    u.includes('payment-complete') ||
    u.includes('/success') ||
    u.includes('/receipt') ||
    u.includes('/thank')
  );
};

const openDonationWindow = (parent: BrowserWindow) => {
  if (donationWindow && !donationWindow.isDestroyed()) {
    donationWindow.focus();
    return;
  }

  donationWindow = new BrowserWindow({
    width: 460,
    height: 760,
    minWidth: 420,
    minHeight: 640,
    title: 'Support Qudoro — Cash App',
    autoHideMenuBar: true,
    parent,
    modal: false,
    show: false,
    webPreferences: {
      sandbox: true,
    },
  });

  donationWindow.once('ready-to-show', () => {
    donationWindow?.show();
  });

  donationWindow.on('closed', () => {
    donationWindow = null;
  });

  const maybeAutoClose = (url: string) => {
    if (isDonationCompleteUrl(url)) {
      donationWindow?.close();
    }
  };

  donationWindow.webContents.on('did-navigate', (_event, url) => {
    maybeAutoClose(url);
  });

  donationWindow.webContents.on('did-redirect-navigation', (_event, url) => {
    maybeAutoClose(url);
  });

  donationWindow.loadURL('https://cash.app/$Marveyy2x').catch((err) => {
    console.error('Failed to open donation window', err);
  });
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

ipcMain.on('open-donation-window', (event) => {
  const parent = BrowserWindow.fromWebContents(event.sender);
  if (!parent) return;
  openDonationWindow(parent);
});

ipcMain.handle('open-external-url', async (event, url) => {
    if (!isSafeExternalUrl(url)) {
      throw new Error('Blocked unsafe external URL.');
    }
    await shell.openExternal(url);
});

ipcMain.handle('encrypt-sensitive', async (_event, plaintext: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }
  const encrypted = safeStorage.encryptString(plaintext);
  return encrypted.toString('base64');
});

ipcMain.handle('decrypt-sensitive', async (_event, encryptedBase64: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }
  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  return safeStorage.decryptString(encryptedBuffer);
});

// Store IPC
ipcMain.handle('get-store-value', (event, key) => {
  return store.get(key);
});

ipcMain.on('set-store-value', (event, key, value) => {
  store.set(key, value);
});

let PDFParseCtor: null | (new (data: Uint8Array) => { getText: () => Promise<{ text: string }> }) =
  null;

const getPDFParseCtor = async () => {
  if (PDFParseCtor) return PDFParseCtor;
  try {
    const mod = await import('pdf-parse');
    if (!mod?.PDFParse) {
      throw new Error('pdf-parse did not export PDFParse');
    }
    PDFParseCtor = mod.PDFParse;
    return PDFParseCtor;
  } catch (error) {
    console.error('Failed to load pdf-parse module:', error);
    return null;
  }
};

// Handle PDF parsing
ipcMain.handle('parse-pdf', async (event, buffer) => {
  try {
    const PDFParse = await getPDFParseCtor();
    if (!PDFParse) {
      return {
        success: false,
        error: 'PDF parser module is unavailable in this build.',
      };
    }

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
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });
    session.defaultSession.setPermissionCheckHandler(() => false);

    // Set Dock Icon for macOS (especially useful in dev)
    if (process.platform === 'darwin') {
        const iconPath = resolveAppIconPath();
        if (iconPath) {
          app.dock.setIcon(iconPath);
        }
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
