import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPCChannels } from '../shared/types';

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息到主进程
  send: (channel: IPCChannels, payload: unknown) => {
    const validChannels = Object.values(IPCChannels);
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, payload);
    }
  },

  // 监听主进程消息
  on: (channel: IPCChannels, callback: (payload: unknown) => void) => {
    const validChannels = Object.values(IPCChannels);
    if (validChannels.includes(channel)) {
      const subscription = (_: IpcRendererEvent, payload: unknown) => callback(payload);
      ipcRenderer.on(channel, subscription);
      // 返回取消订阅函数
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    return () => {};
  },

  // 一次性监听
  once: (channel: IPCChannels, callback: (payload: unknown) => void) => {
    const validChannels = Object.values(IPCChannels);
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (_, payload) => callback(payload));
    }
  },
});

// 类型声明（供 TypeScript 使用）
declare global {
  interface Window {
    electronAPI: {
      send: (channel: IPCChannels, payload: unknown) => void;
      on: (channel: IPCChannels, callback: (payload: unknown) => void) => () => void;
      once: (channel: IPCChannels, callback: (payload: unknown) => void) => void;
    };
  }
}
