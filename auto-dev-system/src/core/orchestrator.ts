import { Task, TaskPriority, SystemConfig } from '../types/index.js'
import { TaskDecomposer } from './task-decomposer.js'
import { ExecutionEngine } from './execution-engine.js'
import { StateManager } from './state-manager.js'
import { ProgressTracker } from './progress-tracker.js'
import { ErrorHandler } from './error-handler.js'

/**
 * 任务协调器
 * 负责协调所有组件，管理任务生命周期
 */
export class Orchestrator {
  private decomposer: TaskDecomposer
  private executor: ExecutionEngine
  private stateManager: StateManager
  private progressTracker: ProgressTracker
  private errorHandler: ErrorHandler
  private config: SystemConfig

  constructor(config?: Partial<SystemConfig>) {
    this.config = {
      maxParallelTasks: 3,
      defaultRetries: 3,
      checkpointInterval: 300,
      timeoutPerTask: 3600,
      enableAutoRecovery: true,
      logLevel: 'info',
      ...config,
    }

    this.decomposer = new TaskDecomposer()
    this.executor = new ExecutionEngine(this.config.maxParallelTasks)
    this.stateManager = new StateManager()
    this.progressTracker = new ProgressTracker()
    this.errorHandler = new ErrorHandler()

    this.setupEventListeners()
  }

  /**
   * 初始化系统
   */
  async initialize(): Promise<void> {
    await this.stateManager.initialize()
    console.log('✅ 全自动开发系统已初始化')
  }

  /**
   * 提交任务
   */
  async submitTask(description: string, priority: TaskPriority = TaskPriority.NORMAL): Promise<Task> {
    console.log(`\n📝 提交任务: ${description}`)
    
    // 1.console.log('🔍 分析任务...')
    const task = await this.decomposer.decomposeTask(description, priority)
    
    // 2. 生成执行计划
    console.log('📋 生成执行计划...')
    const plan = await this.decomposer.generateExecutionPlan(task)
    
    // 3. 保存初始状态
    await this.stateManager.saveTaskState(task)
    
    // 4. 开始跟踪
    this.progressTracker.startTracking(task)
    
    // 5. 执行任务
    console.log('⚙️  开始执行任务...\n')
    try {
      await this.executeTaskWithRecovery(task, plan)
      this.progressTracker.taskCompleted(task)
      console.log('\n✅ 任务完成!')
    } catch (error) {
      this.progressTracker.taskFailed(task, error as Error)
      console.error('\n❌ 任务失败:', (error as Error).message)
      throw error
    } finally {
      await this.stateManager.saveTaskState(task)
      this.progressTracker.printProgress(task)
    }
    
    return task
  }

  /**
   * 带恢复机制的任务执行
   */
  private async executeTaskWithRecovery(task: Task, plan: any): Promise<void> {
    let checkpointTimer: NodeJS.Timeout | null = null
    
    try {
      // 设置定期检查点
      if (this.config.enableAutoRecovery) {
        checkpointTimer = setInterval(async () => {
          await this.stateManager.createCheckpoint(task, '自动检查点')
          this.progressTracker.checkpointCreated(task.id, `checkpoint_${Date.now()}`)
        }, this.config.checkpointInterval * 1000)
      }
      
      // 执行任务
      await this.executor.executeTask(task, plan)
    } catch (error) {
      // 错误处理
      const strategy = await this.errorHandler.handleError(error as Error, task)
      
      if (strategy.requiresHumanIntervention) {
        // 等待人工干预
        console.log('⏸️  任务已暂停，等待人工干预...')
        throw error
      }
      
      if (strategy.shouldRetry && this.config.enableAutoRecovery) {
        console.log('🔄 尝试自动恢复...')
        // 从最近的检查点恢复
        const checkpoints = task.checkpoints
        if (checkpoints.length > 0) {
          const lastCheckpoint = checkpoints[checkpoints.length - 1]
          const restoredTask = await this.stateManager.restoreFromCheckpoint(task.id, lastCheckpoint.id)
          if (restoredTask) {
            // 重新执行
            await this.executor.executeTask(restoredTask, plan)
            return
          }
        }
      }
      
      throw error
    } finally {
      if (checkpointTimer) {
        clearInterval(checkpointTimer)
      }
    }
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: string): Promise<Task> {
    console.log(`\n🔄 恢复任务: ${taskId}`)
    
    const task = await this.stateManager.loadTaskState(taskId)
    if (!task) {
      throw new Error(`找不到任务: ${taskId}`)
    }
    
    const plan = await this.decomposer.generateExecutionPlan(task)
    
    this.progressTracker.startTracking(task)
    
    try {
      await this.executeTaskWithRecovery(task, plan)
      this.progressTracker.taskCompleted(task)
      console.log('\n✅ 任务恢复完成!')
    } catch (error) {
      this.progressTracker.taskFailed(task, error as Error)
      console.error('\n❌ 任务恢复失败:', (error as Error).message)
      throw error
    } finally {
      await this.stateManager.saveTaskState(task)
    }
    
    return task
  }

  /**
   * 列出所有任务
   */
  async listTasks(): Promise<string[]> {
    return await this.stateManager.listTasks()
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<Task | null> {
    return await this.stateManager.loadTaskState(taskId)
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.progressTracker.on('subtask_started', (event) => {
      if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
        console.log(`  ▶️  ${event.data.description}`)
      }
    })
    
    this.progressTracker.on('subtask_completed', (event) => {
      if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
        console.log(`  ✅ ${event.data.description} (${event.data.duration}s)`)
      }
    })
    
    this.progressTracker.on('subtask_failed', (event) => {
      console.error(`  ❌ ${event.data.description}: ${event.data.error}`)
    })
  }

  /**
   * 获取进度跟踪器
   */
  getProgressTracker(): ProgressTracker {
    return this.progressTracker
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler
  }
}
