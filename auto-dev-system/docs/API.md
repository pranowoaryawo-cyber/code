# API 文档

## 核心类

### Orchestrator

任务协调器，系统的主要入口点。

#### 构造函数

```typescript
constructor(config?: Partial<SystemConfig>)
```

#### 方法

##### initialize()

初始化系统。

```typescript
async initialize(): Promise<void>
```

##### submitTask()

提交新任务。

```typescript
async submitTask(
  description: string,
  priority: TaskPriority = TaskPriority.NORMAL
): Promise<Task>
```

**参数:**
- `description` - 任务描述
- `priority` - 任务优先级（可选）

**返回:** 创建的任务对象

**示例:**
```typescript
const task = await orchestrator.submitTask(
  '创建一个 React 应用',
  TaskPriority.HIGH
)
```

##### resumeTask()

恢复已暂停的任务。

```typescript
async resumeTask(taskId: string): Promise<Task>
```

##### listTasks()

列出所有任务。

```typescript
async listTasks(): Promise<string[]>
```

##### getTaskStatus()

获取任务状态。

```typescript
async getTaskStatus(taskId: string): Promise<Task | null>
```

##### getProgressTracker()

获取进度跟踪器实例。

```typescript
getProgressTracker(): ProgressTracker
```

##### getErrorHandler()

获取错误处理器实例。

```typescript
getErrorHandler(): ErrorHandler
```

---

### TaskDecomposer

任务分解器。

#### 方法

##### decomposeTask()

分解任务为子任务。

```typescript
async decomposeTask(
  description: string,
  priority: TaskPriority = TaskPriority.NORMAL
): Promise<Task>
```

##### generateExecutionPlan()

生成执行计划。

```typescript
async generateExecutionPlan(task: Task): Promise<ExecutionPlan>
```

---

### ExecutionEngine

执行引擎。

#### 构造函数

```typescript
constructor(maxParallelTasks: number = 3)
```

#### 方法

##### registerTool()

注册自定义工具。

```typescript
registerTool(tool: Tool): void
```

**示例:**
```typescript
class MyTool implements Tool {
  name = 'my-tool'
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    // 实现工具逻辑
    return {
      success: true,
      data: { result: 'done' },
      duration: 100,
    }
  }
}

engine.registerTool(new MyTool())
```

##### executeTask()

执行任务。

```typescript
async executeTask(task: Task, plan: ExecutionPlan): Promise<void>
```

##### pauseTask()

暂停任务。

```typescript
pauseTask(taskId: string): void
```

##### resumeTask()

恢复任务。

```typescript
resumeTask(taskId: string): void
```

##### cancelTask()

取消任务。

```typescript
cancelTask(taskId: string): void
```

---

### StateManager

状态管理器。

#### 构造函数

```typescript
constructor(stateDir: string = './state', checkpointInterval: number = 300)
```

#### 方法

##### initialize()

初始化状态目录。

```typescript
async initialize(): Promise<void>
```

##### saveTaskState()

保存任务状态。

```typescript
async saveTaskState(task: Task): Promise<void>
```

##### loadTaskState()

加载任务状态。

```typescript
async loadTaskState(taskId: string): Promise<Task | null>
```

##### createCheckpoint()

创建检查点。

```typescript
async createCheckpoint(task: Task, description: string): Promise<Checkpoint>
```

##### restoreFromCheckpoint()

从检查点恢复。

```typescript
async restoreFromCheckpoint(
  taskId: string,
  checkpointId: string
): Promise<Task | null>
```

##### cleanupOldStates()

清理旧状态。

```typescript
async cleanupOldStates(daysToKeep: number = 7): Promise<number>
```

---

### ProgressTracker

进度跟踪器（继承自 EventEmitter）。

#### 方法

##### startTracking()

开始跟踪任务。

```typescript
startTracking(task: Task): void
```

##### getProgressStats()

获取进度统计。

```typescript
getProgressStats(task: Task): ProgressStats
```

##### printProgress()

打印进度信息。

```typescript
printProgress(task: Task): void
```

##### getEventHistory()

获取事件历史。

```typescript
getEventHistory(taskId?: string): ProgressEvent[]
```

#### 事件

- `task_started` - 任务开始
- `task_completed` - 任务完成
- `task_failed` - 任务失败
- `subtask_started` - 子任务开始
- `subtask_completed` - 子任务完成
- `subtask_failed` - 子任务失败
- `checkpoint_created` - 检查点创建
- `progress` - 所有进度事件

**示例:**
```typescript
progressTracker.on('task_completed', (event: ProgressEvent) => {
  console.log('任务完成:', event.taskId)
})
```

---

### ErrorHandler

错误处理器。

#### 方法

##### handleError()

处理错误。

```typescript
async handleError(
  error: Error,
  task: Task,
  subTaskId?: string
): Promise<RecoveryStrategy>
```

##### getErrorLog()

获取错误日志。

```typescript
getErrorLog(): ErrorInfo[]
```

##### getTaskErrorStats()

获取任务错误统计。

```typescript
getTaskErrorStats(taskId: string): {
  total: number
  byType: Record<ErrorType, number>
  bySeverity: Record<ErrorSeverity, number>
}
```

---

## 类型定义

### Task

```typescript
interface Task {
  id: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  subTasks: SubTask[]
  context: Record<string, any>
  checkpoints: Checkpoint[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}
```

### SubTask

```typescript
interface SubTask {
  id: string
  description: string
  dependencies: string[]
  status: TaskStatus
  result?: any
  error?: Error
  retryCount: number
  maxRetries: number
  estimatedDuration?: number
  actualDuration?: number
  startTime?: Date
  endTime?: Date
}
```

### TaskStatus

```typescript
enum TaskStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
```

### TaskPriority

```typescript
enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}
```

### SystemConfig

```typescript
interface SystemConfig {
  maxParallelTasks: number
  defaultRetries: number
  checkpointInterval: number
  timeoutPerTask: number
  enableAutoRecovery: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
```

---

## 工具接口

### Tool

```typescript
interface Tool {
  name: string
  execute(params: Record<string, any>): Promise<ToolResult>
}
```

### ToolResult

```typescript
interface ToolResult {
  success: boolean
  data?: any
  error?: Error
  duration: number
}
```

---

## 辅助函数

### createAutoDevSystem()

创建系统实例。

```typescript
async function createAutoDevSystem(
  config?: Partial<SystemConfig>
): Promise<Orchestrator>
```

### runTask()

快速运行任务。

```typescript
async function runTask(
  description: string,
  priority: TaskPriority = TaskPriority.NORMAL
): Promise<Task>
```
