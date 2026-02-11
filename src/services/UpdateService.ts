import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { ipcMain, BrowserWindow } from 'electron';

export class UpdateService {
  constructor(private mainWindow: BrowserWindow) {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    // Disable auto download - User wants to be notified first
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    this.initListeners();
    this.initIpc();
  }

  private initListeners() {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      this.send('update-status', 'checking');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      this.send('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('Update error:', err);
      this.send('update-error', err.toString());
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.send('update-downloaded', info);
    });
  }

  private initIpc() {
    // Remove existing handlers to avoid duplicates if HMR triggers re-creation
    ipcMain.removeHandler('check-for-updates');
    ipcMain.removeHandler('download-update');
    ipcMain.removeHandler('quit-and-install');

    ipcMain.handle('check-for-updates', async () => {
      try {
        // In dev mode, this might throw if not configured, so we wrap it
        const result = await autoUpdater.checkForUpdates();
        return result;
      } catch (error) {
        log.error('Failed to check for updates:', error);
        throw error;
      }
    });

    ipcMain.handle('download-update', async () => {
      return await autoUpdater.downloadUpdate();
    });

    ipcMain.handle('quit-and-install', () => {
      autoUpdater.quitAndInstall();
    });
  }

  private send(channel: string, ...args: unknown[]) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }
}
