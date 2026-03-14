import { Task, TaskStatus } from '../types/index.js'

/**
 * 错误类型
 */
export enum ErrorType {
  TOOL_EXECUTION = 'tool_execution',
  DEPENDENCY = 'dependency',
  TIMEOUT = 'timeout',
  RESOURCE = 'resource',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  error: Error
  taskId: string
  subTaskId?: string
  timestamp: Date
  retryable: boolean
}

/**
 * 恢复策略
 */
export interface RecoveryStrategy {
  shouldRetry: boolean
  maxRetries: number
  backoffMultiplier: number
  requiresHumanIntervention: boolean
  fallbackAction?: () => Promise<void>
}

/**
 * 错误处理器
 * 负责错误分类、恢复策略和优雅降级
 */
export class ErrorHandler {
  private errorLog: ErrorInfo[] = []
  private maxErrorLogSize: number = 1000

  /**
   * 处理错误
   */
  async handleError(
    error: Error,
    task: Task,
    subTaskId?: string
  ): Promise<RecoveryStrategy> {
    const errorInfo = this.classifyError(error, task, subTaskId)
    this.logError(errorInfo)
    
    const strategy = this.determineRecoveryStrategy(errorInfo)
    
    if (strategy.requiresHumanIntervention) {
      await this.notifyHumanIntervention(errorInfo)
    }
    
    return strategy
  }

  /**
   * 分类错误
   */
  private classifyError(error: Error, task: Task, subTaskId?: string): ErrorInfo {
    let type = ErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let retryable = true

    // 根据错误消息分类
    const message = error.message.toLowerCase()
    
    if (message.includes('timeout') || message.includes('超时')) {
      type = ErrorType.TIMEOUT
      severity = ErrorSeverity.MEDIUM
      retryable = true
    } else if (message.includes('not found') || message.includes('找不到')) {
      type = ErrorType.DEPENDENCY
      severity = ErrorSeverity.HIGH
      retryable = false
    } else if (message.includes('permission') || message.includes('权限')) {
      type = ErrorType.RESOURCE
      severity = ErrorSeverity.HIGH
      retryable = false
    } else if (message.includes('validation') || message.includes('验证')) {
      type = ErrorType.VALIDATION
      severity = ErrorSeverity.LOW
      retryable = false
    } else if (message.includes('execution') || message.includes('执行')) {
      type = ErrorType.TOOL_EXECUTION
      severity = ErrorSeverity.MEDIUM
      retryable = true
    }

    return {
      type,
      severity,
      message: error.message,
      error,
      taskId: task.id,
      subTaskId,
      timestamp: new Date(),
      retryable,
    }
  }

  /**
   * 确定恢复策略
   */
  private determineRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy {
    const baseStrategy: RecoveryStrategy = {
      shouldRetry: errorInfo.retryable,
      maxRetries: 3,
      backoffMultiplier: 2,
      requiresHumanIntervention: false,
    }

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        return {
          ...baseStrategy,
          shouldRetry: false,
          requiresHumanIntervention: true,
        }
      
      case ErrorSeverity.HIGH:
        return {
          ...baseStrategy,
          maxRetries: 1,
          requiresHumanIntervention: true,
        }
      
      case ErrorSeverity.MEDIUM:
        return {
          ...baseStrategy,
          maxRetries: 3,
        }
      
      case ErrorSeverity.LOW:
        return {
          ...baseStrategy,
          shouldRetry: false,
        }
      
      default:
        return baseStrategy
    }
  }

  /**
   * 记录错误
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo)
    
    // 限制日志大小
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift()
    }
    
    // 输出到控制台
    console.error(`[${errorInfo.severity.toUpperCase()}] ${errorInfo.type}:`, errorInfo.message)
    console.error(`任务: ${errorInfo.taskId}${errorInfo.subTaskId ? `, 子任务: ${errorInfo.subTaskId}` : ''}`)
  }

  /**
   * 通知人工干预
   */
  private async notifyHumanIntervention(errorInfo: ErrorInfo): Promise<void> {
    console.log('\n' + '='.repeat(60))
    console.log('⚠️  需要人工干预')
    console.log('='.repeat(60))
    console.log(`错误类型: ${errorInfo.type}`)
    console.log(`严重程度: ${errorInfo.severity}`)
    console.log(`任务 ID: ${errorInfo.taskId}`)
    if (errorInfo.subTaskId) {
      console.log(`子任务 ID: ${errorInfo.subTaskId}`)
    }
    console.log(`错误信息: ${errorInfo.message}`)
    console.log(`时间: ${errorInfo.timestamp.toISOString()}`)
    console.log('='.repeat(60) + '\n')
    
    // 实际应用中可以发送通知（邮件、Slack 等）
  }

  /**
   * 获取错误日志
   */
  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog]
  }

  /**
   * 清除错误日志
   */
  clearErrorLog(): void {
    this.errorLog = []
  }

  /**
   * 获取任务错误统计
   */
  getTaskErrorStats(taskId: string): {
    total: number
    byType: Record<ErrorType, number>
    bySeverity: Record<ErrorSeverity, number>
  } {
    const taskErrors = this.errorLog.filter(e => e.taskId === taskId)
    
    const byType: Record<ErrorType, number> = {
      [ErrorType.TOOL_EXECUTION]: 0,
      [ErrorType.DEPENDENCY]: 0,
      [ErrorType.TIMEOUT]: 0,
      [ErrorType.RESOURCE]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.UNKNOWN]: 0,
    }
    
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    }
    
    taskErrors.forEach(error => {
      byType[error.type]++
      bySeverity[error.severity]++
    })
    
    return {
      total: taskErrors.length,
      byType,
      bySeverity,
    }
  }
}
