// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  exitFullscreen: () => ipcRenderer.send('exit-fullscreen'),
  close: () => ipcRenderer.send('close-window'),
  openDonationWindow: () => ipcRenderer.send('open-donation-window'),
  store: {
    get: (key: string) => ipcRenderer.invoke('get-store-value', key),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    set: (key: string, value: any) => ipcRenderer.send('set-store-value', key, value),
  },
  fetchUrl: (url: string) => ipcRenderer.invoke('fetch-url', url),
  parsePdf: (buffer: number[]) => ipcRenderer.invoke('parse-pdf', buffer),
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateNotAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDownloadProgress: (callback: (progress: any) => void) => ipcRenderer.on('download-progress', (_event, progress) => callback(progress)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdateDownloaded: (callback: (info: any) => void) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
    onUpdateError: (callback: (err: string) => void) => ipcRenderer.on('update-error', (_event, err) => callback(err)),
    onUpdateStatus: (callback: (status: string) => void) => ipcRenderer.on('update-status', (_event, status) => callback(status)),
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-not-available');
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-error');
        ipcRenderer.removeAllListeners('update-status');
    }
  },
  openExternal: (url: string) => ipcRenderer.invoke('open-external-url', url),
  crypto: {
    encrypt: (plaintext: string) => ipcRenderer.invoke('encrypt-sensitive', plaintext),
    decrypt: (encryptedBase64: string) => ipcRenderer.invoke('decrypt-sensitive', encryptedBase64),
  },
});
