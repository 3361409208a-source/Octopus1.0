import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { TerminalManager } from './terminal/manager';
import { IPCChannels, TerminalConfig } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let terminalManager: TerminalManager | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 加载渲染进程
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 初始化终端管理器
function initTerminalManager(): void {
  if (!mainWindow) return;
  terminalManager = new TerminalManager(mainWindow.webContents);

  // IPC 事件处理
  ipcMain.on('terminal:register', (event, config: TerminalConfig) => {
    terminalManager?.registerConfig(config);
  });

  ipcMain.on(IPCChannels.TERMINAL_CREATE, (event, payload) => {
    terminalManager?.createTerminal(payload);
  });

  ipcMain.on(IPCChannels.TERMINAL_INPUT, (event, payload) => {
    terminalManager?.sendInput(payload.terminalId, payload.data);
  });

  ipcMain.on(IPCChannels.TERMINAL_RESIZE, (event, payload) => {
    terminalManager?.resizeTerminal(payload.terminalId, payload.cols, payload.rows);
  });

  ipcMain.on(IPCChannels.TERMINAL_KILL, (event, payload) => {
    terminalManager?.killTerminal(payload.terminalId);
  });
}

// Electron 应用生命周期
app.whenReady().then(() => {
  createWindow();
  initTerminalManager();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // 清理所有终端进程
  terminalManager?.dispose();
  terminalManager = null;

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('正在清理所有终端进程...');
  terminalManager?.dispose();
});
