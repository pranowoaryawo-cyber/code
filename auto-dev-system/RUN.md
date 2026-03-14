# 运行指南

## 前置要求

- Node.js 18+ 
- npm 或 pnpm

## 安装步骤

### 1. 进入项目目录

```bash
cd auto-dev-system
```

### 2. 安装依赖

```bash
npm install
```

这会安装所有必需的依赖：
- `commander` - CLI 框架
- `chalk` - 终端颜色
- `ora` - 加载动画
- `inquirer` - 交互式提示
- `typescript` - TypeScript 编译器
- `tsx` - TypeScript 执行器
- `@types/node` - Node.js 类型定义

### 3. 构建项目（可选）

```bash
npm run build
```

这会将 TypeScript 编译为 JavaScript 到 `dist/` 目录。

## 运行方式

### 方式 1: 使用 tsx 直接运行（推荐开发时使用）

```bash
# 运行简单示例
npm run dev examples/simple-task.ts

# 运行高级示例
npm run dev examples/advanced-task.ts
```

### 方式 2: 使用 CLI 工具

```bash
# 运行任务
npm run task -- run "创建一个 React Todo 应用"

# 使用高优先级
npm run task -- run "创建紧急功能" --priority high

# 列出所有任务
npm run task -- list

# 查看任务状态
npm run task -- status <task-id>

# 恢复任务
npm run task -- resume <task-id>
```

### 方式 3: 编译后运行

```bash
# 先构建
npm run build

# 运行编译后的代码
npm start
```

### 方式 4: 在代码中使用

创建一个新文件 `my-task.ts`:

```typescript
import { createAutoDevSystem, TaskPriority } from './src/index.js'

async function main() {
  // 创建系统实例
  const system = await createAutoDevSystem({
    maxParallelTasks: 5,
    enableAutoRecovery: true,
    logLevel: 'info',
  })
  
  // 提交任务
  const task = await system.submitTask(
    '创建一个 Vue.js 应用，包含路由和状态管理',
    TaskPriority.HIGH
  )
  
  console.log('任务完成!', task.id)
}

main().catch(console.error)
```

运行：

```bash
npm run dev my-task.ts
```

## 快速测试

运行内置的简单示例：

```bash
npm run dev examples/simple-task.ts
```

你会看到类似的输出：

```
=== 全自动开发系统示例 ===

✅ 全自动开发系统已初始化

📝 提交任务: 创建一个 React Todo 应用
🔍 分析任务...
📋 生成执行计划...
⚙️  开始执行任务...

  ▶️  创建项目结构
  ✅ 创建项目结构 (0.1s)
  ▶️  安装依赖
  ✅ 安装依赖 (0.1s)
  ▶️  创建组件
  ✅ 创建组件 (0.1s)
  ...

✅ 任务完成!

────────────────────────────────────────────────────────────
📊 任务进度: 创建一个 React Todo 应用
────────────────────────────────────────────────────────────
状态: ✅ completed
进度: ████████████████████ 100%
完成: 7/7 个子任务
耗时: 1秒
────────────────────────────────────────────────────────────
```

## 监控进度

使用高级示例查看详细的进度监控：

```bash
npm run dev examples/advanced-task.ts
```

这会显示：
- 实时进度事件
- 子任务执行状态
- 错误统计
- 性能指标

## 常见问题

### 问题 1: TypeScript 错误

如果看到 TypeScript 类型错误，确保已安装类型定义：

```bash
npm install --save-dev @types/node
```

### 问题 2: 模块未找到

确保使用 `.js` 扩展名导入（即使是 TypeScript 文件）：

```typescript
import { Orchestrator } from './core/orchestrator.js'  // ✅ 正确
import { Orchestrator } from './core/orchestrator'     // ❌ 错误
```

### 问题 3: 权限错误

如果遇到文件系统权限错误，确保有写入权限：

```bash
# Linux/Mac
chmod +x ./state

# Windows
# 右键 -> 属性 -> 安全 -> 编辑权限
```

## 调试

启用调试日志：

```typescript
const system = await createAutoDevSystem({
  logLevel: 'debug',  // 显示详细日志
})
```

## 下一步

1. 查看 [快速开始指南](./docs/QUICKSTART.md)
2. 阅读 [API 文档](./docs/API.md)
3. 探索 [架构文档](./docs/ARCHITECTURE.md)
4. 尝试修改 `examples/` 中的示例

## 生产部署

构建生产版本：

```bash
npm run build
```

运行生产版本：

```bash
node dist/index.js
```

或使用 PM2 管理：

```bash
npm install -g pm2
pm2 start dist/index.js --name auto-dev-system
```
