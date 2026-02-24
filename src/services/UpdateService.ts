import { autoUpdater, type UpdateInfo, type UpdateCheckResult } from 'electron-updater';
import log from 'electron-log';
import { ipcMain, BrowserWindow } from 'electron';

export class UpdateService {
  private lastValidatedUpdate: UpdateInfo | null = null;
  private allowedUpdateHosts: string[];

  constructor(private mainWindow: BrowserWindow) {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    this.allowedUpdateHosts = (process.env.QUDORO_UPDATE_ALLOWED_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    
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
      const validationError = this.validateUpdateInfo(info);
      if (validationError) {
        this.lastValidatedUpdate = null;
        log.warn('Rejected update metadata', {
          reason: validationError,
          info: this.auditSafeUpdateInfo(info),
        });
        this.send('update-error', `Rejected update metadata: ${validationError}`);
        return;
      }
      this.lastValidatedUpdate = info;
      log.info('Update available', this.auditSafeUpdateInfo(info));
      this.send('update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.lastValidatedUpdate = null;
      log.info('Update not available', this.auditSafeUpdateInfo(info));
      this.send('update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
      const message = this.errorMessage(err);
      log.error('Update error:', message);
      this.send('update-error', message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.send('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      const validationError = this.validateUpdateInfo(info);
      if (validationError) {
        this.lastValidatedUpdate = null;
        log.error('Downloaded update failed validation', {
          reason: validationError,
          info: this.auditSafeUpdateInfo(info),
        });
        this.send('update-error', `Downloaded update failed validation: ${validationError}`);
        return;
      }
      this.lastValidatedUpdate = info;
      log.info('Update downloaded', this.auditSafeUpdateInfo(info));
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
        this.enforceCheckResultValidation(result);
        return result;
      } catch (error) {
        log.error('Failed to check for updates:', this.errorMessage(error));
        throw error;
      }
    });

    ipcMain.handle('download-update', async () => {
      if (!this.lastValidatedUpdate) {
        throw new Error('Update metadata not validated. Run check-for-updates first.');
      }
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

  private enforceCheckResultValidation(result: UpdateCheckResult | null): void {
    const updateInfo = result?.updateInfo;
    if (!updateInfo) return;
    const validationError = this.validateUpdateInfo(updateInfo);
    if (validationError) {
      this.lastValidatedUpdate = null;
      throw new Error(`Unsafe update metadata: ${validationError}`);
    }
    this.lastValidatedUpdate = updateInfo;
  }

  private validateUpdateInfo(info: UpdateInfo): string | null {
    if (!info.version) {
      return 'missing version';
    }
    if (!Array.isArray(info.files) || info.files.length === 0) {
      return 'missing files';
    }
    const hasSha512 = Boolean(info.sha512) || info.files.every((file) => Boolean(file.sha512));
    if (!hasSha512) {
      return 'missing sha512 checksums';
    }
    for (const file of info.files) {
      if (!file.url) {
        return 'missing file url';
      }
      let parsed: URL;
      try {
        parsed = new URL(file.url);
      } catch {
        return 'invalid file url';
      }
      if (parsed.protocol !== 'https:') {
        return `non-https update url (${parsed.protocol})`;
      }
      if (this.allowedUpdateHosts.length > 0 && !this.allowedUpdateHosts.includes(parsed.hostname.toLowerCase())) {
        return `host not allowed (${parsed.hostname})`;
      }
    }
    return null;
  }

  private auditSafeUpdateInfo(info: UpdateInfo): Record<string, unknown> {
    return {
      version: info.version,
      releaseDate: info.releaseDate,
      files: info.files.map((file) => ({
        size: file.size,
        hasSha512: Boolean(file.sha512),
        host: this.safeHost(file.url),
        protocol: this.safeProtocol(file.url),
      })),
    };
  }

  private safeHost(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'invalid';
    }
  }

  private safeProtocol(url: string): string {
    try {
      return new URL(url).protocol;
    } catch {
      return 'invalid';
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
