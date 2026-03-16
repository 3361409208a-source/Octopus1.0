import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  TerminalConfig,
  TerminalRuntimeState,
  ConnectionStatus,
  IPCChannels,
} from '../../shared/types';

// 获取 electron API
const electronAPI = window.electronAPI;

interface TerminalContextType {
  configs: TerminalConfig[];
  runtimes: TerminalRuntimeState[];
  addConfig: (config: Omit<TerminalConfig, 'id'>) => void;
  removeConfig: (id: string) => void;
  startTerminal: (configId: string) => void;
  stopTerminal: (id: string) => void;
  sendInput: (id: string, data: string) => void;
}

const TerminalContext = createContext<TerminalContextType | null>(null);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [configs, setConfigs] = useState<TerminalConfig[]>([]);
  const [runtimes, setRuntimes] = useState<TerminalRuntimeState[]>([]);

  // 监听终端状态更新
  useEffect(() => {
    const unsubscribe = electronAPI.on(IPCChannels.TERMINAL_STATUS, (payload: unknown) => {
      const data = payload as { terminalId: string; status: ConnectionStatus; error?: string };
      setRuntimes((prev) => {
        const existing = prev.find((r) => r.configId === data.terminalId);
        if (existing) {
          return prev.map((r) =>
            r.configId === data.terminalId
              ? { ...r, status: data.status, errorMessage: data.error }
              : r
          );
        } else {
          const newRuntime: TerminalRuntimeState = {
            id: data.terminalId,
            configId: data.terminalId,
            status: data.status,
            errorMessage: data.error,
          };
          return [...prev, newRuntime];
        }
      });
    });

    return unsubscribe;
  }, []);

  const addConfig = useCallback((config: Omit<TerminalConfig, 'id'>) => {
    const newConfig: TerminalConfig = {
      ...config,
      id: `terminal-${Date.now()}`,
    };
    setConfigs((prev) => [...prev, newConfig]);

    // 注册到主进程
    electronAPI.send(IPCChannels.TERMINAL_REGISTER, newConfig);
  }, []);

  const removeConfig = useCallback((id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setRuntimes((prev) => prev.filter((r) => r.configId !== id));
  }, []);

  const startTerminal = useCallback((configId: string) => {
    electronAPI.send(IPCChannels.TERMINAL_CREATE, {
      configId,
      cols: 80,
      rows: 24,
    });
  }, []);

  const stopTerminal = useCallback((id: string) => {
    electronAPI.send(IPCChannels.TERMINAL_KILL, { terminalId: id });
  }, []);

  const sendInput = useCallback((id: string, data: string) => {
    electronAPI.send(IPCChannels.TERMINAL_INPUT, { terminalId: id, data });
  }, []);

  return (
    <TerminalContext.Provider
      value={{
        configs,
        runtimes,
        addConfig,
        removeConfig,
        startTerminal,
        stopTerminal,
        sendInput,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminals = (): TerminalContextType => {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error('useTerminals must be used within TerminalProvider');
  }
  return context;
};
