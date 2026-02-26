import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, ipcMain, shell, session, safeStorage, net } from 'electron';
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
ipcMain.handle('fetch-url', async (_event, url) => {
  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
  };

  const setId = url.match(/quizlet\.com\/(\d+)/)?.[1];

  // ── Strategy A: Direct Quizlet webapi via net.fetch (fast, no bot detection) ──
  if (setId) {
    try {
      const apiUrl =
        `https://quizlet.com/webapi/3.4/studiable-item-documents` +
        `?filters[studiableContainerId]=${setId}&filters[studiableContainerType]=1&perPage=1000&page=1`;

      const resp = await Promise.race([
        net.fetch(apiUrl, {
          headers: {
            ...BROWSER_HEADERS,
            'Referer': `https://quizlet.com/${setId}/`,
          },
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000)),
      ]);

      if (resp && 'ok' in resp && resp.ok) {
        const json = await (resp as Response).text();
        if (json && json.length > 50 && json.includes('studiableItem')) {
          const escaped = json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
          const html = `<!doctype html><html><head><title>Quizlet Set ${setId}</title></head><body>` +
            `<script id="__QUIZLET_WEBAPI__" type="application/json">${escaped}</script></body></html>`;
          console.log(`[fetch-url] webapi success for set ${setId}, length=${json.length}`);
          return { success: true, data: html };
        }
      }
    } catch (e) {
      console.warn('[fetch-url] Strategy A (direct webapi) failed:', e);
    }
  }

  // ── Strategy B: Hidden BrowserWindow — loads page, then calls webapi in-page ──
  let win: BrowserWindow | null = null;
  try {
    win = new BrowserWindow({
      show: false,
      width: 1000,
      height: 800,
      webPreferences: { offscreen: false },
    });
    win.webContents.setUserAgent(BROWSER_HEADERS['User-Agent']);

    const result = await Promise.race<{ success: boolean; data?: string; error?: string }>([
      (async () => {
        await win!.loadURL(url);

        let content = '';
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 1000));
          content = await win!.webContents.executeJavaScript('document.documentElement.outerHTML');
          const title = await win!.webContents.executeJavaScript('document.title') as string;
          const ready = !content.includes('Just a moment') &&
            (content.includes('__NEXT_DATA__') || content.includes('SetPageTerms-term') ||
             content.includes('TermText') || content.includes('studiableItem') ||
             (title && content.length > 50000));
          if (ready) {
            await new Promise(r => setTimeout(r, 2000));
            content = await win!.webContents.executeJavaScript('document.documentElement.outerHTML');
            break;
          }
          await win!.webContents.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)');
        }

        if (setId && win && !win.isDestroyed()) {
          // Try webapi from within page context (has session cookies + cf_clearance)
          try {
            const apiJson = await Promise.race<string | null>([
              win.webContents.executeJavaScript(`(async()=>{try{const r=await fetch('/webapi/3.4/studiable-item-documents?filters[studiableContainerId]=${setId}&filters[studiableContainerType]=1&perPage=1000&page=1',{credentials:'include',headers:{'Accept':'application/json'}});if(!r.ok){console.log('webapi status:'+r.status);return null;}const d=await r.json();return JSON.stringify(d);}catch(e){console.log('webapi err:'+e);return null;}})()`) as Promise<string | null>,
              new Promise<null>(r => setTimeout(() => r(null), 10000)),
            ]);
            if (typeof apiJson === 'string' && apiJson.length > 50) {
              // Debug: save to file
              fs.writeFileSync('/tmp/quizlet-webapi-dump.json', apiJson.substring(0, 500000));
              if (apiJson.includes('studiableItem') || apiJson.includes('cardSides')) {
                const escaped = apiJson.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
                content = content.replace('</body>', `<script id="__QUIZLET_WEBAPI__" type="application/json">${escaped}</script></body>`);
                console.log(`[fetch-url] in-page webapi injected, length=${apiJson.length}`);
              }
            }
          } catch (e) { console.warn('[fetch-url] in-page webapi failed:', e); }

          // DOM scraping fallback: extract cards directly from rendered page
          try {
            const domCards = await Promise.race<string | null>([
              win.webContents.executeJavaScript(`(()=>{
                const results=[];
                // Try data-testid based selectors (Quizlet 2024+)
                const termEls=document.querySelectorAll('[data-testid="set-page-card-side-word"] .TermText,[class*="SetPageTerm-wordText"] .TermText,.SetPageTerm-wordText');
                const defEls=document.querySelectorAll('[data-testid="set-page-card-side-definition"] .TermText,[class*="SetPageTerm-definitionText"] .TermText,.SetPageTerm-definitionText');
                if(termEls.length>0&&termEls.length===defEls.length){
                  termEls.forEach((el,i)=>{if(defEls[i])results.push({term:el.innerText.trim(),def:defEls[i].innerText.trim()});});
                }
                // Fallback: all TermText elements in pairs
                if(results.length===0){
                  const all=document.querySelectorAll('.TermText');
                  for(let i=0;i<all.length-1;i+=2)results.push({term:all[i].innerText.trim(),def:all[i+1].innerText.trim()});
                }
                // Debug: dump __NEXT_DATA__ keys
                const nd=document.getElementById('__NEXT_DATA__');
                const ndKeys=nd?Object.keys(JSON.parse(nd.textContent||'{}')).join(','):'none';
                console.log('[DOM] cards found:'+results.length+' __NEXT_DATA__ keys:'+ndKeys);
                return results.length>0?JSON.stringify(results):null;
              })()`) as Promise<string | null>,
              new Promise<null>(r => setTimeout(() => r(null), 5000)),
            ]);
            if (typeof domCards === 'string' && domCards.length > 10) {
              fs.writeFileSync('/tmp/quizlet-dom-cards.json', domCards);
              const escaped = domCards.replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
              content = content.replace('</body>', `<script id="__QUIZLET_DOM_CARDS__" type="application/json">${escaped}</script></body>`);
              console.log('[fetch-url] DOM cards injected');
            }
          } catch (e) { console.warn('[fetch-url] DOM scraping failed:', e); }

          // Debug: save __NEXT_DATA__ structure
          try {
            const ndRaw = await win.webContents.executeJavaScript(`document.getElementById('__NEXT_DATA__')?.textContent||''`) as string;
            if (ndRaw) fs.writeFileSync('/tmp/quizlet-next-data.json', ndRaw.substring(0, 1000000));
          } catch { /* ignore */ }
        }

        return { success: true, data: content };
      })(),
      new Promise<{ success: boolean; error: string }>(r =>
        setTimeout(() => r({ success: false, error: 'Fetch timed out after 35 seconds' }), 35000)
      ),
    ]);

    return result;
  } catch (error: any) {
    console.error('[fetch-url] Strategy B failed:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
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
