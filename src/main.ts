import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the WorldMonitor Electron application.
 * Handles window creation, lifecycle events, and IPC communication.
 */

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

/**
 * Creates the main application window with appropriate settings
 * based on the current environment.
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH || '1280', 10),
    height: parseInt(process.env.WINDOW_HEIGHT || '800', 10),
    minWidth: 800,
    minHeight: 600,
    title: 'WorldMonitor',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false, // Don't show until ready-to-show
    backgroundColor: '#1a1a2e',
  });

  // Load the app
  if (isDev) {
    const devPort = process.env.DEV_SERVER_PORT || '3000';
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when fully loaded to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Handle external links — open in default browser instead of Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (!isMac) {
    app.quit();
  }
});

// IPC handlers for renderer process communication
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-platform', () => {
  return process.platform;
});

ipcMain.handle('app:open-external', async (_event, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});
