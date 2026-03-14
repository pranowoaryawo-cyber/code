# 快速开始指南

## 安装

```bash
cd auto-dev-system
npm install
```

## 基本使用

### 1. 使用 CLI

```bash
# 运行任务
npm run task -- run "创建一个 React Todo 应用"

# 列出所有任务
npm run task -- list

# 查看任务状态
npm run task -- status <task-id>

# 恢复任务
npm run task -- resume <task-id>
```

### 2. 使用 API

```typescript
import { createAutoDevSystem, TaskPriority } from './src/index.js'

// 创建系统实例
const system = await createAutoDevSystem()

// 提交任务
const task = await system.submitTask(
  '创建一个 React Todo 应用',
  TaskPriority.NORMAL
)

console.log('任务完成:', task.id)
```

### 3. 快速运行

```typescript
import { runTask, TaskPriority } from './src/index.js'

// 一行代码运行任务
await runTask('创建一个 React Todo 应用', TaskPriority.NORMAL)
```

## 配置选项

```typescript
const system = await createAutoDevSystem({
  maxParallelTasks: 5,        // 最大并行任务数
  defaultRetries: 3,           // 默认重试次数
  checkpointInterval: 60,      // 检查点间隔（秒）
  timeoutPerTask: 3600,        // 任务超时（秒）
  enableAutoRecovery: true,    // 启用自动恢复
  logLevel: 'info',            // 日志级别
})
```

## 监听进度事件

```typescript
const progressTracker = system.getProgressTracker()

// 监听所有进度事件
progressTracker.on('progress', (event) => {
  console.log('进度更新:', event)
})

// 监听特定事件
progressTracker.on('task_completed', (event) => {
  console.log('任务完成:', event.taskId)
})

progressTracker.on('subtask_failed', (event) => {
  console.error('子任务失败:', event.data)
})
```

## 错误处理

```typescript
try {
  await system.submitTask('创建应用')
} catch (error) {
  // 获取错误统计
  const errorHandler = system.getErrorHandler()
  const stats = errorHandler.getTaskErrorStats(task.id)
  
  console.error('错误统计:', stats)
}
```

## 任务恢复

```typescript
// 列出所有任务
const tasks = await system.listTasks()

// 获取任务状态
const task = await system.getTaskStatus(taskId)

// 恢复未完成的任务
if (task.status !== 'completed') {
  await system.resumeTask(taskId)
}
```

## 示例

查看 `examples/` 目录获取更多示例：

- `simple-task.ts` - 简单任务示例
- `advanced-task.ts` - 高级任务示例（带进度监控）

运行示例：

```bash
npm run dev examples/simple-task.ts
```

## 下一步

- 阅读 [架构文档](./ARCHITECTURE.md) 了解系统设计
- 查看 [API 文档](./API.md) 了解详细 API
- 探索 [示例代码](../examples/) 学习最佳实践
