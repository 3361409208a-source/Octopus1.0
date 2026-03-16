import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { TerminalManager } from './terminal/manager';
import { IPCChannels, TerminalConfig } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let terminalManager: TerminalManager | null = null;

function createWindow(): void {
  console.log('创建窗口...');

  mainWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: false, // 改为不透明以便看到内容
    backgroundColor: '#1a1a2e', // 深色背景
    frame: true, // 显示边框以便调试
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  console.log('窗口已创建，加载页面...');

  // 加载渲染进程
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('加载文件:', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // 窗口加载完成后显示
  mainWindow.once('ready-to-show', () => {
    console.log('窗口准备显示');
    mainWindow?.show();
  });

  // 监听加载失败
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('加载失败:', errorCode, errorDescription);
  });

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    console.log('窗口关闭');
    mainWindow = null;
  });
}

// 初始化终端管理器
function initTerminalManager(): void {
  if (!mainWindow) return;
  terminalManager = new TerminalManager(mainWindow.webContents);

  // IPC 事件处理
  ipcMain.on(IPCChannels.TERMINAL_REGISTER, (event, config: TerminalConfig) => {
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
