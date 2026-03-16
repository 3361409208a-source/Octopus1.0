export enum ErrorCode {
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  PROCESS_CRASHED = 'PROCESS_CRASHED',
  PORT_CONFLICT = 'PORT_CONFLICT',
  PTY_CREATION_FAILED = 'PTY_CREATION_FAILED',
  PLATFORM_UNSUPPORTED = 'PLATFORM_UNSUPPORTED',
}

export class TerminalError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public recoverable: boolean,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TerminalError';
  }
}

export interface ErrorCallbacks {
  retry?: () => void;
  notify: (message: string) => void;
  log: (error: TerminalError) => void;
}

// 统一错误处理器
export function handleTerminalError(
  error: TerminalError,
  callbacks: ErrorCallbacks
): void {
  callbacks.log(error);

  if (error.recoverable && callbacks.retry) {
    callbacks.retry();
  } else {
    callbacks.notify(error.message);
  }
}
