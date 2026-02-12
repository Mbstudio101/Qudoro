export {};

declare global {
  interface UpdateInfo {
    version: string;
    files: { url: string; sha512: string; size: number }[];
    path: string;
    sha512: string;
    releaseDate: string;
    releaseName?: string;
    releaseNotes?: string | { version: string; note: string | null }[];
  }
  
  interface ProgressInfo {
    total: number;
    delta: number;
    transferred: number;
    percent: number;
    bytesPerSecond: number;
  }

  interface Window {
    electron: {
      minimize: () => void;
      maximize: () => void;
      exitFullscreen: () => void;
      close: () => void;
      store: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        get: (key: string) => Promise<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (key: string, value: any) => void;
      };
      fetchUrl: (url: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      openExternal: (url: string) => Promise<void>;
      auth: {
          startServer: () => Promise<{ success: boolean; port: number; error?: string }>;
          waitForCode: () => Promise<string>;
          startBrowserLogin: (schoolUrl: string) => Promise<{ success: boolean; token?: string; error?: string; authType?: 'Bearer' | 'Cookie' }>;
      };
      parsePdf: (buffer: number[]) => Promise<{ success: boolean; text?: string; error?: string }>;
      updater: {
        checkForUpdates: () => Promise<UpdateInfo | null>;
        downloadUpdate: () => Promise<string[]>;
        quitAndInstall: () => void;
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
        onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void;
        onDownloadProgress: (callback: (progress: ProgressInfo) => void) => void;
        onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
        onUpdateError: (callback: (err: string) => void) => void;
        onUpdateStatus: (callback: (status: string) => void) => void;
        removeAllListeners: () => void;
      };
    };
  }
}
