import { Task, SubTask, TaskStatus } from '../types/index.js'
import { EventEmitter } from 'events'

/**
 * 进度事件
 */
export interface ProgressEvent {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'subtask_started' | 'subtask_completed' | 'subtask_failed' | 'checkpoint_created'
  taskId: string
  subTaskId?: string
  timestamp: Date
  data?: any
}

/**
 * 进度统计
 */
export interface ProgressStats {
  taskId: string
  totalSubTasks: number
  completedSubTasks: number
  failedSubTasks: number
  progress: number // 0-100
  estimatedTimeRemaining?: number // 秒
  elapsedTime: number // 秒
  status: TaskStatus
}

/**
 * 进度跟踪器
 * 负责实时监控任务进度、发送事件和生成统计
 */
export class ProgressTracker extends EventEmitter {
  private taskStartTimes: Map<string, Date> = new Map()
  private events: ProgressEvent[] = []
  private maxEventLogSize: number = 10000

  /**
   * 开始跟踪任务
   */
  startTracking(task: Task): void {
    this.taskStartTimes.set(task.id, new Date())
    this.emitEvent({
      type: 'task_started',
      taskId: task.id,
      timestamp: new Date(),
      data: { description: task.description },
    })
  }

  /**
   * 任务完成
   */
  taskCompleted(task: Task): void {
    this.emitEvent({
      type: 'task_completed',
      taskId: task.id,
      timestamp: new Date(),
      data: this.getProgressStats(task),
    })
  }

  /**
   * 任务失败
   */
  taskFailed(task: Task, error: Error): void {
    this.emitEvent({
      type: 'task_failed',
      taskId: task.id,
      timestamp: new Date(),
      data: { error: error.message, stats: this.getProgressStats(task) },
    })
  }

  /**
   * 子任务开始
   */
  subTaskStarted(task: Task, subTask: SubTask): void {
    this.emitEvent({
      type: 'subtask_started',
      taskId: task.id,
      subTaskId: subTask.id,
      timestamp: new Date(),
      data: { description: subTask.description },
    })
  }

  /**
   * 子任务完成
   */
  subTaskCompleted(task: Task, subTask: SubTask): void {
    this.emitEvent({
      type: 'subtask_completed',
      taskId: task.id,
      subTaskId: subTask.id,
      timestamp: new Date(),
      data: { 
        description: subTask.description,
        duration: subTask.actualDuration,
      },
    })
  }

  /**
   * 子任务失败
   */
  subTaskFailed(task: Task, subTask: SubTask, error: Error): void {
    this.emitEvent({
      type: 'subtask_failed',
      taskId: task.id,
      subTaskId: subTask.id,
      timestamp: new Date(),
      data: { 
        description: subTask.description,
        error: error.message,
      },
    })
  }

  /**
   * 检查点创建
   */
  checkpointCreated(taskId: string, checkpointId: string): void {
    this.emitEvent({
      type: 'checkpoint_created',
      taskId,
      timestamp: new Date(),
      data: { checkpointId },
    })
  }

  /**
   * 获取进度统计
   */
  getProgressStats(task: Task): ProgressStats {
    const totalSubTasks = task.subTasks.length
    const completedSubTasks = task.subTasks.filter(
      st => st.status === TaskStatus.COMPLETED
    ).length
    const failedSubTasks = task.subTasks.filter(
      st => st.status === TaskStatus.FAILED
    ).length
    
    const progress = totalSubTasks > 0 
      ? Math.round((completedSubTasks / totalSubTasks) * 100)
      : 0
    
    const startTime = this.taskStartTimes.get(task.id)
    const elapsedTime = startTime 
      ? (Date.now() - startTime.getTime()) / 1000
      : 0
    
    // 估算剩余时间
    let estimatedTimeRemaining: number | undefined
    if (completedSubTasks > 0 && completedSubTasks < totalSubTasks) {
      const avgTimePerTask = elapsedTime / completedSubTasks
      estimatedTimeRemaining = Math.round(avgTimePerTask * (totalSubTasks - completedSubTasks))
    }
    
    return {
      taskId: task.id,
      totalSubTasks,
      completedSubTasks,
      failedSubTasks,
      progress,
      estimatedTimeRemaining,
      elapsedTime: Math.round(elapsedTime),
      status: task.status,
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: ProgressEvent): void {
    this.events.push(event)
    
    // 限制事件日志大小
    if (this.events.length > this.maxEventLogSize) {
      this.events.shift()
    }
    
    // 发送事件
    this.emit(event.type, event)
    this.emit('progress', event)
  }

  /**
   * 获取事件历史
   */
  getEventHistory(taskId?: string): ProgressEvent[] {
    if (taskId) {
      return this.events.filter(e => e.taskId === taskId)
    }
    return [...this.events]
  }

  /**
   * 清除事件历史
   */
  clearEventHistory(): void {
    this.events = []
  }

  /**
   * 打印进度
   */
  printProgress(task: Task): void {
    const stats = this.getProgressStats(task)
    
    console.log('\n' + '─'.repeat(60))
    console.log(`📊 任务进度: ${task.description}`)
    console.log('─'.repeat(60))
    console.log(`状态: ${this.getStatusEmoji(stats.status)} ${stats.status}`)
    console.log(`进度: ${'█'.repeat(Math.floor(stats.progress / 5))}${'░'.repeat(20 - Math.floor(stats.progress / 5))} ${stats.progress}%`)
    console.log(`完成: ${stats.completedSubTasks}/${stats.totalSubTasks} 个子任务`)
    if (stats.failedSubTasks > 0) {
      console.log(`失败: ${stats.failedSubTasks} 个子任务`)
    }
    console.log(`耗时: ${this.formatDuration(stats.elapsedTime)}`)
    if (stats.estimatedTimeRemaining) {
      console.log(`预计剩余: ${this.formatDuration(stats.estimatedTimeRemaining)}`)
    }
    console.log('─'.repeat(60) + '\n')
  }

  /**
   * 获取状态表情符号
   */
  private getStatusEmoji(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.PENDING: return '⏳'
      case TaskStatus.PLANNING: return '📋'
      case TaskStatus.EXECUTING: return '⚙️'
      case TaskStatus.PAUSED: return '⏸️'
      case TaskStatus.COMPLETED: return '✅'
      case TaskStatus.FAILED: return '❌'
      case TaskStatus.CANCELLED: return '🚫'
      default: return '❓'
    }
  }

  /**
   * 格式化时长
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${minutes}分${secs}秒`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}小时${minutes}分`
    }
  }
}
