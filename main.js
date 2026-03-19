const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = process.env.NODE_ENV !== 'production';

function startBackend() {
  backendProcess = fork(path.join(__dirname, 'src/backend/server.js'));
  backendProcess.on('message', (msg) => console.log('Backend:', msg));
  backendProcess.on('error', (err) => console.error('Backend error:', err));
  backendProcess.on('exit', (code) => console.log('Backend exited with code:', code));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0e1a',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
