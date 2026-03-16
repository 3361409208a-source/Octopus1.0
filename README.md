# 八爪鱼 (Octopus) - AI终端管理桌面宠物

一款可爱的桌面宠物应用，用八爪鱼的8个触手来可视化管理多个AI终端。

## 功能特性

- 🐙 可爱的八爪鱼形象，8个触手动态摆动
- 💻 支持多个AI终端管理（Claude, OpenClaw, OpenCode等）
- 🎨 状态可视化（绿色=连接中，蓝色=空闲，灰色=未连接，红色=错误）
- 🖱️ 拖拽移动，点击触手展开终端
- ⚡ 基于 Electron + React + TypeScript

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

## 项目结构

```
octopus/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts    # 入口
│   │   ├── preload.ts  # 预加载脚本
│   │   └── terminal/   # 终端管理
│   ├── renderer/       # React 渲染进程
│   │   ├── components/ # UI组件
│   │   ├── context/    # 状态管理
│   │   └── styles/     # 样式
│   └── shared/         # 共享类型
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈

- **桌面框架**: Electron 28
- **前端框架**: React 18 + TypeScript
- **样式**: CSS Modules
- **终端集成**: node-pty + xterm.js
- **构建工具**: Vite + TypeScript

## 使用说明

1. 八爪鱼身体可拖拽移动
2. 点击身体展开/收起所有触手
3. 点击触手连接对应的AI终端
4. 触手颜色表示终端状态：
   - 🟢 绿色：正在对话中
   - 🔵 蓝色：连接中
   - ⚪ 灰色：未连接
   - 🔴 红色：错误/断线

## 许可证

MIT
