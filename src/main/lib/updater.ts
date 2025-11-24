import { app, BrowserWindow } from 'electron';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;

let mainWindow: BrowserWindow | null = null;
const updateFeedUrl = process.env.UPDATE_FEED_URL;
const hasCustomFeed = Boolean(updateFeedUrl);
const updatesConfigured = hasCustomFeed || app.isPackaged;

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface UpdateStatus {
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  downloadProgress: number;
  readyToInstall: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
  lastCheckComplete: boolean; // True when a manual check just completed
}

let currentStatus: UpdateStatus = {
  checking: false,
  updateAvailable: false,
  downloading: false,
  downloadProgress: 0,
  readyToInstall: false,
  error: null,
  updateInfo: null,
  lastCheckComplete: false
};

// Configure autoUpdater
autoUpdater.autoDownload = false; // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true; // Auto-install on quit after download

// Configure update feed if provided
if (updateFeedUrl) {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateFeedUrl
  });
  console.log('Auto-update feed configured from UPDATE_FEED_URL');
} else if (app.isPackaged) {
  console.log('Using bundled auto-update configuration (GitHub releases)');
} else {
  console.log('Auto-update feed not configured; skipping feed setup');
}

// Set update check interval (check every 4 hours)
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

let checkInterval: NodeJS.Timeout | null = null;

export function initializeUpdater(window: BrowserWindow | null): void {
  mainWindow = window;

  // Set up event listeners
  autoUpdater.on('checking-for-update', () => {
    currentStatus = {
      ...currentStatus,
      checking: true,
      error: null
    };
    notifyStatusChange();
  });

  autoUpdater.on('update-available', (info) => {
    let releaseDate: string;
    try {
      const releaseDateValue = info.releaseDate as Date | string | undefined;
      if (releaseDateValue) {
        if (typeof releaseDateValue === 'string') {
          releaseDate = releaseDateValue;
        } else {
          releaseDate = (releaseDateValue as Date).toISOString();
        }
      } else {
        releaseDate = new Date().toISOString();
      }
    } catch {
      releaseDate = new Date().toISOString();
    }

    let releaseNotes: string | undefined;
    try {
      const releaseNotesValue = info.releaseNotes as
        | string
        | Array<{ note?: string } | string>
        | undefined;
      if (releaseNotesValue) {
        if (typeof releaseNotesValue === 'string') {
          releaseNotes = releaseNotesValue;
        } else if (Array.isArray(releaseNotesValue)) {
          releaseNotes = releaseNotesValue
            .map((note) => (typeof note === 'string' ? note : note.note || ''))
            .join('\n');
        }
      }
    } catch {
      // Ignore errors parsing release notes
    }

    currentStatus = {
      ...currentStatus,
      checking: false,
      updateAvailable: true,
      updateInfo: {
        version: info.version,
        releaseDate,
        releaseNotes
      }
    };
    notifyStatusChange();
  });

  autoUpdater.on('update-not-available', () => {
    currentStatus = {
      ...currentStatus,
      checking: false,
      updateAvailable: false,
      updateInfo: null,
      lastCheckComplete: true
    };
    notifyStatusChange();
    // Clear the check complete flag after 3 seconds
    setTimeout(() => {
      currentStatus = {
        ...currentStatus,
        lastCheckComplete: false
      };
      notifyStatusChange();
    }, 3000);
  });

  autoUpdater.on('error', (error) => {
    currentStatus = {
      ...currentStatus,
      checking: false,
      downloading: false,
      lastCheckComplete: true,
      error: error.message || 'Unknown error occurred'
    };
    notifyStatusChange();
    // Clear error after 5 seconds
    setTimeout(() => {
      currentStatus = {
        ...currentStatus,
        lastCheckComplete: false,
        error: null
      };
      notifyStatusChange();
    }, 5000);
  });

  autoUpdater.on('download-progress', (progress) => {
    currentStatus = {
      ...currentStatus,
      downloading: true,
      downloadProgress: progress.percent
    };
    notifyStatusChange();
  });

  autoUpdater.on('update-downloaded', () => {
    currentStatus = {
      ...currentStatus,
      downloading: false,
      downloadProgress: 100,
      readyToInstall: true
    };
    notifyStatusChange();
  });
}

function notifyStatusChange(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status-changed', currentStatus);
  }
}

export function checkForUpdates(): void {
  const isDev = process.env.ELECTRON_RENDERER_URL !== undefined;

  // Only check in production (not in dev mode)
  if (isDev && !hasCustomFeed) {
    console.log('Skipping update check in development mode');
    currentStatus = {
      ...currentStatus,
      checking: false,
      lastCheckComplete: true,
      error: 'Update checks are disabled in development mode'
    };
    notifyStatusChange();
    setTimeout(() => {
      currentStatus = {
        ...currentStatus,
        lastCheckComplete: false,
        error: null
      };
      notifyStatusChange();
    }, 3000);
    return;
  }

  if (!updatesConfigured) {
    currentStatus = {
      ...currentStatus,
      checking: false,
      downloading: false,
      lastCheckComplete: true,
      error: 'Auto-update feed is not configured'
    };
    notifyStatusChange();
    setTimeout(() => {
      currentStatus = {
        ...currentStatus,
        lastCheckComplete: false,
        error: null
      };
      notifyStatusChange();
    }, 4000);
    return;
  }

  // Don't check if already checking or downloading
  if (currentStatus.checking || currentStatus.downloading) {
    return;
  }

  // Reset check complete flag
  currentStatus = {
    ...currentStatus,
    lastCheckComplete: false,
    error: null
  };
  notifyStatusChange();

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('Failed to check for updates:', error);
    currentStatus = {
      ...currentStatus,
      checking: false,
      lastCheckComplete: true,
      error: error.message || 'Failed to check for updates'
    };
    notifyStatusChange();
    // Clear error after 5 seconds
    setTimeout(() => {
      currentStatus = {
        ...currentStatus,
        lastCheckComplete: false,
        error: null
      };
      notifyStatusChange();
    }, 5000);
  });
}

export function downloadUpdate(): void {
  if (!currentStatus.updateAvailable || currentStatus.downloading) {
    return;
  }

  autoUpdater.downloadUpdate().catch((error) => {
    console.error('Failed to download update:', error);
    currentStatus = {
      ...currentStatus,
      downloading: false,
      error: error.message || 'Failed to download update'
    };
    notifyStatusChange();
  });
}

export function installUpdate(): void {
  if (!currentStatus.readyToInstall) {
    return;
  }

  // Quit and install will happen automatically due to autoInstallOnAppQuit
  autoUpdater.quitAndInstall(false, true);
}

export function getUpdateStatus(): UpdateStatus {
  return { ...currentStatus };
}

export function startPeriodicUpdateCheck(): void {
  if (!updatesConfigured) {
    return;
  }

  // Check immediately on startup
  checkForUpdates();

  // Then check periodically
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  checkInterval = setInterval(() => {
    checkForUpdates();
  }, CHECK_INTERVAL_MS);
}

export function stopPeriodicUpdateCheck(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
