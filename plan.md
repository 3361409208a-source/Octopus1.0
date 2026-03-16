# 八爪鱼 (Octopus) - AI终端管理桌面宠物

## 项目概述
开发一款名为"八爪鱼"的桌面宠物应用，用于可视化管理多个AI终端。八爪鱼的8个触手分别连接不同的AI终端，用户可以通过与宠物互动来管理和切换不同的AI对话窗口。

## 核心功能

### 1. 八爪鱼形象
- 可爱的八爪鱼角色，有"身体"和8个触手
- 触手可以动态伸展、收缩、摆动
- 身体有表情和动画反馈
- 支持皮肤/颜色自定义

### 2. AI终端管理
- 支持接入多个AI终端：
  - Claude Code
  - OpenClaw
  - OpenCode
  - 其他兼容的AI终端
- 每个触手代表一个AI终端连接
- 点击触手可展开/收起对应AI的对话窗口
- 支持拖拽排序触手（调整AI终端优先级）

### 3. 命名系统
- 为每个AI终端命名（如"代码助手"、"写作伙伴"）
- 为八爪鱼本身命名
- 名字显示在触手末端或身体旁边

### 4. 交互功能
- 拖动八爪鱼在桌面任意位置
- 点击身体显示/隐藏所有AI终端窗口
- 右键菜单进行设置
- 双击触手直接打开对应AI终端
- 支持快捷键快速切换AI

### 5. 状态反馈
- 触手颜色表示AI终端状态：
  - 绿色：正在对话中
  - 蓝色：空闲
  - 灰色：未连接
  - 红色：错误/断线
- 身体动画表示整体状态
- 消息通知气泡

## 技术方案

### 技术栈
- **桌面框架**: Electron + React
- **动画**: SVG + CSS（触手摆动）+ Framer Motion（交互动画）
- **状态管理**: React Context + useReducer
- **终端集成**: Node-pty + xterm.js（应用内渲染终端）
- **跨平台**: Windows/Mac/Linux支持

### 架构设计
```
八爪鱼核心 (Octopus Core)
├── 渲染层 (React UI)
│   ├── 八爪鱼角色组件
│   ├── 触手组件
│   ├── 设置面板
│   └── 终端窗口管理器
├── 终端管理器 (TerminalManager)
│   └── 统一适配器 + 配置表驱动
│       ├── 终端配置表（命令、参数、工作目录）
│       ├── 独立pty进程池（每个终端隔离运行）
│       │   ├── 进程1 (Claude)
│       │   ├── 进程2 (OpenClaw)
│       │   └── 进程N (...)
│       ├── 进程监控与健康检查
│       └── 窗口状态同步
├── 状态管理 (React Context + useReducer)
│   ├── AI终端列表
│   ├── 连接状态
│   └── 用户配置
└── 系统集成 (System)
    ├── 全局快捷键
    ├── 托盘图标
    └── 窗口管理
```

### 数据结构（src/shared/types.ts）

```typescript
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

// ============ 错误处理 ============

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

export interface PlatformConfig {
  ptyBackend: 'conpty' | 'winpty' | 'unix';
  defaultShell: string;
  encoding: BufferEncoding;
  pathSeparator: string;
  supportsSignals: boolean;
}
```

## 项目结构

```
octopus/
├── src/
│   ├── main/                    # Electron主进程
│   │   ├── index.ts            # 入口
│   │   ├── terminal/           # 终端管理
│   │   │   ├── manager.ts      # TerminalManager
│   │   │   ├── adapter.ts      # 统一适配器
│   │   │   └── lifecycle.ts    # 进程生命周期
│   │   └── platform/           # 平台适配
│   │       └── config.ts       # 平台配置
│   ├── renderer/               # React渲染进程
│   ├── renderer/               # React渲染进程
│   │   ├── components/         # 组件
│   │   │   ├── Octopus/        # 八爪鱼容器
│   │   │   │   ├── Octopus.tsx         # 主容器
│   │   │   │   ├── OctopusBody.tsx     # 身体部分
│   │   │   │   └── OctopusTentacles.tsx # 触手容器
│   │   │   ├── Tentacle/       # 触手组件
│   │   │   │   ├── Tentacle.tsx        # 单个触手
│   │   │   │   ├── TentacleAnimation.css
│   │   │   │   └── useTentacle.ts      # 触手状态hook
│   │   │   └── Terminal/       # 终端窗口
│   │   │       ├── Terminal.tsx
│   │   │       └── Terminal.css
│   │   ├── hooks/             # 自定义hooks
│   │   ├── context/           # React Context
│   │   │   ├── OctopusContext.tsx   # UI状态：位置、展开、主题
│   │   │   └── TerminalContext.tsx  # 终端状态：配置、运行时
│   │   └── styles/            # CSS/SVG动画
│   │       ├── components/    # CSS Modules
│   │       │   ├── Octopus.module.css
│   │       │   └── Tentacle.module.css
│   │       └── animations/    # SVG动画
│   │           ├── tentacle-sway.css
│   │           └── body-idle.css
├── src/
│   ├── shared/                # 共享类型和工具
│   │   ├── types.ts          # TypeScript类型定义
│   │   └── errors.ts         # 错误处理和分类
├── public/                     # 静态资源
├── electron-builder.json      # 打包配置
└── package.json
```

## 实现阶段

### 阶段1: MVP核心 (2周)
- [ ] 基础八爪鱼形象（静态图片）
- [ ] 支持1个AI终端连接（Claude）
- [ ] 基础拖拽移动功能
- [ ] 简单的状态显示

### 阶段2: 完整功能 (2周)
- [ ] 八爪鱼动画效果（触手摆动）
- [ ] 支持多个AI终端（最多8个）
- [ ] 命名系统
- [ ] 状态反馈系统
- [ ] 设置面板

### 阶段3: 体验优化 (1周)
- [ ] 触手交互动画
- [ ] 消息通知系统
- [ ] 主题皮肤
- [ ] 快捷键支持
- [ ] 托盘菜单

## 风险与考虑
1. **终端集成复杂度**: 不同AI终端的启动方式和接口不同 → 使用统一配置表驱动
2. **跨平台兼容**: Windows/Mac的窗口管理差异 → xterm.js提供一致体验
3. **性能**: 动画流畅度与系统资源占用平衡 → CSS动画为主，减少JS计算
4. **安全性**: 与本地AI终端的进程通信安全 → 验证命令白名单，隔离环境变量

## 错误处理策略

### 核心错误边界（MVP必须实现）

| 操作 | 可能的失败 | 错误码 | 处理策略 | 用户反馈 |
|------|-----------|--------|----------|----------|
| 启动AI终端 | 命令不存在 | COMMAND_NOT_FOUND | 启动前验证路径 | "AI终端未安装" |
| | 权限不足 | PERMISSION_DENIED | 检查文件权限 | "需要管理员权限" |
| pty创建 | 系统资源不足 | RESOURCE_EXHAUSTED | 限制终端数量 | "资源不足" |
| | 平台不支持 | PLATFORM_UNSUPPORTED | 启动时检测 | "不支持当前系统" |
| 进程通信 | 进程崩溃 | PROCESS_CRASHED | 清理状态 | "连接已断开" |

**使用统一错误处理器：**
```typescript
import { TerminalError, ErrorCode, handleTerminalError } from '../shared/errors';

try {
  await terminalManager.start(config);
} catch (error) {
  const terminalError = new TerminalError(
    '启动失败',
    ErrorCode.COMMAND_NOT_FOUND,
    true, // recoverable
    error
  );

  handleTerminalError(terminalError, {
    retry: () => terminalManager.start(config),
    notify: (msg) => showNotification(msg),
    log: (err) => console.error(err)
  });
}
```

### 错误恢复机制
- **自动重试**: 端口冲突时自动重试3次
- **优雅降级**: 资源不足时限制功能而非崩溃
- **状态同步**: 进程异常退出时更新UI状态
- **日志记录**: 所有错误写入应用日志，便于调试

## 跨平台兼容性策略

### 平台检测与适配
```typescript
interface PlatformConfig {
  ptyBackend: 'conpty' | 'winpty' | 'unix';
  defaultShell: string;
  encoding: string;
  pathSeparator: string;
  supportsSignals: boolean;
}

const platformConfigs: Record<string, PlatformConfig> = {
  win32: {
    ptyBackend: 'conpty',
    defaultShell: process.env.ComSpec || 'cmd.exe',
    encoding: 'utf8',
    pathSeparator: '\\',
    supportsSignals: false
  },
  darwin: {
    ptyBackend: 'unix',
    defaultShell: process.env.SHELL || '/bin/zsh',
    encoding: 'utf8',
    pathSeparator: '/',
    supportsSignals: true
  },
  linux: {
    ptyBackend: 'unix',
    defaultShell: process.env.SHELL || '/bin/bash',
    encoding: 'utf8',
    pathSeparator: '/',
    supportsSignals: true
  }
};
```

### 启动时检测
- 检测当前平台并加载对应配置
- 验证pty可用性
- 根据平台调整终端启动参数
- 设置合适的编码和换行符处理

## 进程生命周期管理

### 进程表设计
```typescript
interface ProcessEntry {
  id: string;
  ptyProcess: IPty;
  startTime: Date;
  config: TerminalConfig;
}

// 全局进程表
const activeProcesses = new Map<string, ProcessEntry>();
```

### 生命周期钩子
```
// main.ts
app.on('before-quit', () => {
  console.log('正在清理所有终端进程...');
  activeProcesses.forEach((entry, id) => {
    try {
      entry.ptyProcess.kill();
      console.log(`已终止进程: ${id}`);
    } catch (e) {
      console.error(`终止进程失败 ${id}:`, e);
    }
  });
  activeProcesses.clear();
});

// 窗口关闭时清理
window.on('closed', () => {
  const entries = findProcessesByWindow(window.id);
  entries.forEach(entry => {
    entry.ptyProcess.kill();
    activeProcesses.delete(entry.id);
  });
});
```

### 健康检查
- 定期检查pty进程状态
- 检测僵尸进程并清理
- 记录进程启动/终止日志

## 测试策略

### 测试金字塔

```
       /\
      /  \     E2E (3个关键场景)
     /____\
    /      \   集成 (IPC、进程通信)
   /________\
  /          \ 单元 (工具函数、组件)
 /____________\
```

### 关键E2E测试（"2am周五"信心测试）

#### 测试1：黄金路径
**场景：** 完整的终端使用流程
```gherkin
Given 应用已启动
When 用户点击触手添加Claude终端
And 输入 "claude --version"
Then 应该看到Claude版本输出
And 终端状态显示为绿色
```

#### 测试2：压力测试
**场景：** 多终端资源管理
```gherkin
Given 应用已启动
When 用户连续打开8个终端
And 每个终端执行命令
And 用户关闭应用
Then 所有pty进程应该被清理
And 无僵尸进程残留
```

#### 测试3：错误恢复
**场景：** 错误处理和用户反馈
```gherkin
Given 应用已启动
When 用户配置无效的AI命令 "invalid-command"
Then 应该看到错误提示 "命令未找到"
When 用户修正为有效命令
Then 终端应该成功启动
```

### 测试覆盖要求

| 模块 | 单元测试 | 集成测试 | E2E |
|------|---------|---------|-----|
| `TerminalManager` | ✅ 启动/停止 | ✅ pty创建 | - |
| `adapter.ts` | ✅ 配置验证 | - | - |
| `lifecycle.ts` | ✅ 进程管理 | ✅ 清理逻辑 | - |
| `Octopus.tsx` | - | ✅ 拖拽状态 | ✅ 黄金路径 |
| `Tentacle.tsx` | ✅ 点击处理 | ✅ 状态同步 | - |
| `Terminal.tsx` | ✅ xterm集成 | ✅ 数据流 | ✅ 黄金路径 |
| `errors.ts` | ✅ 错误类 | ✅ 处理器 | ✅ 错误恢复 |
| IPC通信 | - | ✅ 类型安全 | - |

### 测试工具
- **单元测试**: Vitest
- **组件测试**: React Testing Library
- **E2E测试**: Playwright (Electron支持)
- **覆盖率**: Istanbul (目标: 80%+)

### IPC集成测试

使用 Electron 的 `ipcMain`/`ipcRenderer` 模拟进行集成测试：

```typescript
// src/main/__tests__/terminal.ipc.test.ts
import { ipcMain } from 'electron';
import { IPCChannels, TerminalCreatePayload } from '../../shared/ipc';

describe('Terminal IPC Integration', () => {
  test('TERMINAL_CREATE 流程完整', async () => {
    const payload: TerminalCreatePayload = {
      configId: 'claude-1',
      cols: 80,
      rows: 24
    };

    // 模拟渲染进程发送消息
    ipcRenderer.send(IPCChannels.TERMINAL_CREATE, payload);

    // 验证主进程正确处理
    await waitFor(() => {
      expect(mockTerminalManager.create).toBeCalledWith(payload);
    });

    // 验证响应返回渲染进程
    expect(ipcRenderer.on).toBeCalledWith(
      IPCChannels.TERMINAL_STATUS,
      expect.any(Function)
    );
  });

  test('IPC消息序列化正确', () => {
    const message = {
      channel: IPCChannels.TERMINAL_DATA,
      payload: { terminalId: 't1', data: 'hello\n' }
    };

    const serialized = JSON.stringify(message);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.channel).toBe(IPCChannels.TERMINAL_DATA);
  });

  test('IPC错误传递', async () => {
    mockTerminalManager.create.mockRejectedValue(
      new TerminalError('Failed', ErrorCode.PTY_CREATION_FAILED, false)
    );

    ipcRenderer.send(IPCChannels.TERMINAL_CREATE, invalidPayload);

    await waitFor(() => {
      expect(ipcRenderer.on).toBeCalledWith(
        IPCChannels.TERMINAL_STATUS,
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});

### 平台特定代码测试

使用依赖注入在单元测试中模拟平台行为：

```typescript
// src/main/__tests__/platform.config.test.ts
import { getPlatformConfig, PlatformType } from '../platform/config';

describe('Platform Config', () => {
  test.each([
    ['win32', { ptyBackend: 'conpty', supportsSignals: false }],
    ['darwin', { ptyBackend: 'unix', supportsSignals: true }],
    ['linux', { ptyBackend: 'unix', supportsSignals: true }],
  ])('%s 平台配置正确', (platform, expected) => {
    const config = getPlatformConfig(platform as PlatformType);
    expect(config.ptyBackend).toBe(expected.ptyBackend);
    expect(config.supportsSignals).toBe(expected.supportsSignals);
  });

  test('不支持的平台抛出错误', () => {
    expect(() => getPlatformConfig('sunos' as PlatformType))
      .toThrow('PLATFORM_UNSUPPORTED');
  });
});

// src/main/__tests__/terminal.adapter.test.ts
describe('Terminal Adapter', () => {
  test('Windows使用cmd.exe作为默认shell', () => {
    const config = createTerminalConfig({ platform: 'win32' });
    expect(config.shell).toBe('cmd.exe');
  });

  test('macOS使用zsh作为默认shell', () => {
    const config = createTerminalConfig({ platform: 'darwin' });
    expect(config.shell).toBe('/bin/zsh');
  });
});
```

## 性能优化与资源管理

### 资源限制策略

| 资源 | 限制值 | 行为 |
|------|--------|------|
| 最大终端数 | 8个 | 达到时禁用"添加终端"按钮 |
| 内存警告 | 150MB | 显示警告提示 |
| 内存限制 | 300MB | 阻止创建新终端 |
| 单终端缓冲区 | 10MB | 防止xterm.js缓冲区无限增长 |

### 内存监控

```typescript
// src/main/utils/memory.ts
export function checkMemoryUsage(): MemoryStatus {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.heapUsed / 1024 / 1024);

  if (totalMB > 300) {
    return { status: 'critical', message: '内存不足，请关闭部分终端' };
  }
  if (totalMB > 150) {
    return { status: 'warning', message: '内存使用较高' };
  }
  return { status: 'ok' };
}

// 每30秒检查一次
setInterval(() => {
  const status = checkMemoryUsage();
  if (status.status !== 'ok') {
    ipcRenderer.send(IPCChannels.MEMORY_WARNING, status);
  }
}, 30000);
```

### xterm.js缓冲区限制

```typescript
// 限制终端缓冲区大小
const terminal = new Terminal({
  scrollback: 1000,  // 只保留1000行历史
  cols: 80,
  rows: 24,
});
```

### React渲染优化

```typescript
// src/renderer/components/Octopus/Octopus.tsx
import { useMemo, useCallback } from 'react';

function Octopus() {
  // 使用useMemo缓存触手组件，避免不必要重渲染
  const tentacles = useMemo(() =>
    terminals.map(t => (
      <Tentacle key={t.id} config={t} />
    )),
    [terminals] // 只在终端列表变化时重新渲染
  );

  // 拖拽位置更新使用requestAnimationFrame批处理
  const handleDrag = useCallback((e: MouseEvent) => {
    requestAnimationFrame(() => {
      setPosition({ x: e.clientX, y: e.clientY });
    });
  }, []);

  // 八爪鱼身体使用memo缓存
  const body = useMemo(() => (
    <OctopusBody
      name={octopusName}
      theme={theme}
      status={overallStatus}
    />
  ), [octopusName, theme, overallStatus]);

  return (
    <div onMouseMove={handleDrag}>
      {body}
      {tentacles}
    </div>
  );
}

// Tentacle组件使用React.memo
const Tentacle = React.memo(function Tentacle({ config }) {
  // 触手独立渲染，不受八爪鱼位置影响
  return (
    <div className={styles.tentacle}>
      {/* 触手内容 */}
    </div>
  );
});
```

### 性能指标监控

```typescript
// 开发模式下监控渲染性能
if (process.env.NODE_ENV === 'development') {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    console.log(`Octopus rendered ${renderCount.current} times`);
  });
}
```

## 成功标准
- 语音指令控制
- AI终端间对话转发
- 触手自定义动作
- 社区皮肤市场
- 移动端远程控制
