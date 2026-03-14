/**
 * 任务状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 任务优先级
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 子任务定义
 */
export interface SubTask {
  id: string
  description: string
  dependencies: string[] // 依赖的子任务 ID
  status: TaskStatus
  result?: any
  error?: Error
  retryCount: number
  maxRetries: number
  estimatedDuration?: number // 预估耗时（秒）
  actualDuration?: number // 实际耗时（秒）
  startTime?: Date
  endTime?: Date
}

/**
 * 主任务定义
 */
export interface Task {
  id: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  subTasks: SubTask[]
  context: Record<string, any> // 任务上下文
  checkpoints: Checkpoint[] // 检查点
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

/**
 * 检查点定义
 */
export interface Checkpoint {
  id: string
  taskId: string
  timestamp: Date
  state: any // 序列化的状态
  description: string
}

/**
 * 工具调用结果
 */
export interface ToolResult {
  success: boolean
  data?: any
  error?: Error
  duration: number
}

/**
 * 执行计划
 */
export interface ExecutionPlan {
  taskId: string
  steps: ExecutionStep[]
  estimatedDuration: number
  parallelizable: boolean
}

/**
 * 执行步骤
 */
export interface ExecutionStep {
  id: string
  subTaskId: string
  tool: string
  params: Record<string, any>
  canRunInParallel: boolean
  dependencies: string[]
}

/**
 * 系统配置
 */
export interface SystemConfig {
  maxParallelTasks: number
  defaultRetries: number
  checkpointInterval: number // 检查点间隔（秒）
  timeoutPerTask: number // 单个任务超时（秒）
  enableAutoRecovery: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
