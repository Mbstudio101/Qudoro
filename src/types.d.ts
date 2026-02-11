export {};

declare global {
  interface Window {
    electron: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      store: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: (key: string) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (key: string, value: any) => void;
      };
      updater: {
        checkForUpdates: () => Promise<any>;
        downloadUpdate: () => Promise<any>;
        quitAndInstall: () => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdateAvailable: (callback: (info: any) => void) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdateNotAvailable: (callback: (info: any) => void) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDownloadProgress: (callback: (progress: any) => void) => void;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onUpdateDownloaded: (callback: (info: any) => void) => void;
        onUpdateError: (callback: (err: string) => void) => void;
        onUpdateStatus: (callback: (status: string) => void) => void;
        removeAllListeners: () => void;
      };
    };
  }
}
