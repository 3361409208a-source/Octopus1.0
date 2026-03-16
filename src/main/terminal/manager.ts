import { IPty, spawn } from 'node-pty';
import { WebContents } from 'electron';
import {
  TerminalConfig,
  TerminalRuntimeState,
  ConnectionStatus,
  TerminalCreatePayload,
  IPCChannels,
  PlatformConfig,
} from '../../shared/types';
import { TerminalError, ErrorCode } from '../../shared/errors';

// 平台配置
const platformConfigs: Record<string, PlatformConfig> = {
  win32: {
    ptyBackend: 'conpty',
    defaultShell: process.env.ComSpec || 'cmd.exe',
    encoding: 'utf8',
    pathSeparator: '\\',
    supportsSignals: false,
  },
  darwin: {
    ptyBackend: 'unix',
    defaultShell: process.env.SHELL || '/bin/zsh',
    encoding: 'utf8',
    pathSeparator: '/',
    supportsSignals: true,
  },
  linux: {
    ptyBackend: 'unix',
    defaultShell: process.env.SHELL || '/bin/bash',
    encoding: 'utf8',
    pathSeparator: '/',
    supportsSignals: true,
  },
};

interface ProcessEntry {
  id: string;
  ptyProcess: IPty;
  startTime: Date;
  config: TerminalConfig;
}

export class TerminalManager {
  private activeProcesses = new Map<string, ProcessEntry>();
  private configs = new Map<string, TerminalConfig>();
  private webContents: WebContents;
  private platformConfig: PlatformConfig;

  constructor(webContents: WebContents) {
    this.webContents = webContents;
    this.platformConfig = platformConfigs[process.platform] || platformConfigs.linux;
  }

  // 注册终端配置
  registerConfig(config: TerminalConfig): void {
    this.configs.set(config.id, config);
  }

  // 创建终端
  async createTerminal(payload: TerminalCreatePayload): Promise<void> {
    const config = this.configs.get(payload.configId);
    if (!config) {
      this.sendStatus(payload.configId, 'error', '配置未找到');
      return;
    }

    try {
      this.sendStatus(payload.configId, 'connecting');

      // 检查是否已存在
      if (this.activeProcesses.has(payload.configId)) {
        this.sendStatus(payload.configId, 'connected');
        return;
      }

      // 创建 pty 进程
      const shell = this.platformConfig.defaultShell;
      const ptyProcess = spawn(shell, [], {
        name: 'xterm-color',
        cols: payload.cols || 80,
        rows: payload.rows || 24,
        cwd: config.cwd || process.cwd(),
        env: { ...process.env, ...config.env } as { [key: string]: string },
      });

      // 存储进程
      const entry: ProcessEntry = {
        id: payload.configId,
        ptyProcess,
        startTime: new Date(),
        config,
      };
      this.activeProcesses.set(payload.configId, entry);

      // 监听输出
      ptyProcess.onData((data) => {
        this.webContents.send(IPCChannels.TERMINAL_DATA, {
          terminalId: payload.configId,
          data,
        });
      });

      // 监听退出
      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`终端 ${payload.configId} 退出: code=${exitCode}, signal=${signal}`);
        this.activeProcesses.delete(payload.configId);
        this.sendStatus(payload.configId, 'disconnected');
      });

      // 发送启动命令
      if (config.command) {
        ptyProcess.write(`${config.command} ${config.args?.join(' ') || ''}\r`);
      }

      this.sendStatus(payload.configId, 'connected');

    } catch (error) {
      console.error('创建终端失败:', error);
      const terminalError = new TerminalError(
        'PTY创建失败',
        ErrorCode.PTY_CREATION_FAILED,
        true,
        error as Error
      );
      this.sendStatus(payload.configId, 'error', terminalError.message);
    }
  }

  // 发送输入
  sendInput(terminalId: string, data: string): void {
    const entry = this.activeProcesses.get(terminalId);
    if (entry) {
      entry.ptyProcess.write(data);
    }
  }

  // 调整大小
  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    const entry = this.activeProcesses.get(terminalId);
    if (entry) {
      entry.ptyProcess.resize(cols, rows);
    }
  }

  // 终止终端
  killTerminal(terminalId: string): void {
    const entry = this.activeProcesses.get(terminalId);
    if (entry) {
      entry.ptyProcess.kill();
      this.activeProcesses.delete(terminalId);
      this.sendStatus(terminalId, 'disconnected');
    }
  }

  // 发送状态更新
  private sendStatus(
    terminalId: string,
    status: ConnectionStatus,
    error?: string
  ): void {
    this.webContents.send(IPCChannels.TERMINAL_STATUS, {
      terminalId,
      status,
      error,
    });
  }

  // 清理所有进程
  dispose(): void {
    console.log('正在清理所有终端进程...');
    this.activeProcesses.forEach((entry, id) => {
      try {
        entry.ptyProcess.kill();
        console.log(`已终止进程: ${id}`);
      } catch (e) {
        console.error(`终止进程失败 ${id}:`, e);
      }
    });
    this.activeProcesses.clear();
  }
}
