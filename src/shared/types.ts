// ============ 配置类型（静态，用户设置） ============

export type TerminalType = 'claude' | 'openclaw' | 'opencode' | 'custom';
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface TerminalConfig {
  id: string;
  type: TerminalType;
  name: string;                    // 用户自定义名称
  command: string;                 // 启动命令
  args: string[];                  // 启动参数
  cwd?: string;                    // 工作目录
  env?: Record<string, string>;    // 环境变量
}

// ============ 运行时类型（动态，进程状态） ============

export interface TerminalRuntimeState {
  id: string;
  configId: string;                // 关联到TerminalConfig.id
  status: ConnectionStatus;
  pid?: number;                    // 进程ID
  ptyId?: string;                  // pty实例标识
  startTime?: Date;
  lastActivity?: Date;
  errorMessage?: string;           // 错误信息
}

// ============ 八爪鱼状态 ============

export interface OctopusState {
  name: string;
  position: { x: number; y: number };
  isExpanded: boolean;
  theme: 'default' | 'dark' | 'colorful';
}

// ============ IPC通信 ============

export enum IPCChannels {
  TERMINAL_CREATE = 'terminal:create',
  TERMINAL_DATA = 'terminal:data',
  TERMINAL_INPUT = 'terminal:input',
  TERMINAL_RESIZE = 'terminal:resize',
  TERMINAL_KILL = 'terminal:kill',
  TERMINAL_STATUS = 'terminal:status',
}

export interface IPCMessage<T> {
  channel: IPCChannels;
  payload: T;
}

export interface TerminalCreatePayload {
  configId: string;
  cols: number;
  rows: number;
}

export interface TerminalDataPayload {
  terminalId: string;
  data: string;
}

export interface TerminalStatusPayload {
  terminalId: string;
  status: ConnectionStatus;
  error?: string;
}

// ============ 平台配置 ============

export interface PlatformConfig {
  ptyBackend: 'conpty' | 'winpty' | 'unix';
  defaultShell: string;
  encoding: BufferEncoding;
  pathSeparator: string;
  supportsSignals: boolean;
}
