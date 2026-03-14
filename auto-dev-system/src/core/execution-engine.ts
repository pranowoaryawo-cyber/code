import { Task, SubTask, TaskStatus, ExecutionPlan, ToolResult } from '../types/index.js'
import { FileCreatorTool } from '../tools/file-creator.js'
import { PackageInstallerTool } from '../tools/package-installer.js'
import { CodeGeneratorTool } from '../tools/code-generator.js'
import { TestRunnerTool } from '../tools/test-runner.js'
import { BuilderTool } from '../tools/builder.js'

/**
 * 工具接口
 */
export interface Tool {
  name: string
  execute(params: Record<string, any>): Promise<ToolResult>
}

/**
 * 执行引擎
 * 负责执行任务计划，调用工具，处理并发
 */
export class ExecutionEngine {
  private tools: Map<string, Tool>
  private maxParallelTasks: number
  private runningTasks: Set<string>

  constructor(maxParallelTasks: number = 3) {
    this.maxParallelTasks = maxParallelTasks
    this.runningTasks = new Set()
    this.tools = new Map()
    
    // 注册内置工具
    this.registerTool(new FileCreatorTool())
    this.registerTool(new PackageInstallerTool())
    this.registerTool(new CodeGeneratorTool())
    this.registerTool(new TestRunnerTool())
    this.registerTool(new BuilderTool())
  }

  /**
   * 注册工具
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * 执行任务
   */
  async executeTask(task: Task, plan: ExecutionPlan): Promise<void> {
    task.status = TaskStatus.EXECUTING
    task.updatedAt = new Date()

    try {
      // 按依赖顺序执行子任务
      await this.executeSubTasksInOrder(task, plan)
      
      task.status = TaskStatus.COMPLETED
      task.completedAt = new Date()
    } catch (error) {
      task.status = TaskStatus.FAILED
      throw error
    } finally {
      task.updatedAt = new Date()
    }
  }

  /**
   * 按依赖顺序执行子任务
   */
  private async executeSubTasksInOrder(task: Task, plan: ExecutionPlan): Promise<void> {
    const completedSubTasks = new Set<string>()
    const subTaskMap = new Map(task.subTasks.map(st => [st.id, st]))

    while (completedSubTasks.size < task.subTasks.length) {
      // 找出所有依赖已满足的子任务
      const readySubTasks = task.subTasks.filter(subTask => {
        if (completedSubTasks.has(subTask.id)) return false
        if (subTask.status === TaskStatus.EXECUTING) return false
        return subTask.dependencies.every(dep => completedSubTasks.has(dep))
      })

      if (readySubTasks.length === 0) {
        // 检查是否有正在执行的任务
        const executingTasks = task.subTasks.filter(st => st.status === TaskStatus.EXECUTING)
        if (executingTasks.length === 0) {
          throw new Error('任务执行陷入死锁')
        }
        // 等待正在执行的任务完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      // 并行执行准备好的子任务（受最大并发限制）
      const tasksToExecute = readySubTasks.slice(0, this.maxParallelTasks - this.runningTasks.size)
      
      await Promise.all(
        tasksToExecute.map(async subTask => {
          try {
            await this.executeSubTask(subTask, plan)
            completedSubTasks.add(subTask.id)
          } catch (error) {
            // 错误处理在 executeSubTask 中完成
            throw error
          }
        })
      )
    }
  }

  /**
   * 执行单个子任务
   */
  private async executeSubTask(subTask: SubTask, plan: ExecutionPlan): Promise<void> {
    const step = plan.steps.find(s => s.subTaskId === subTask.id)
    if (!step) {
      throw new Error(`找不到子任务 ${subTask.id} 的执行步骤`)
    }

    subTask.status = TaskStatus.EXECUTING
    subTask.startTime = new Date()
    this.runningTasks.add(subTask.id)

    try {
      const tool = this.tools.get(step.tool)
      if (!tool) {
        throw new Error(`找不到工具: ${step.tool}`)
      }

      const result = await this.executeWithRetry(tool, step.params, subTask.maxRetries)
      
      subTask.result = result.data
      subTask.status = TaskStatus.COMPLETED
      subTask.endTime = new Date()
      subTask.actualDuration = (subTask.endTime.getTime() - subTask.startTime.getTime()) / 1000
    } catch (error) {
      subTask.error = error as Error
      subTask.status = TaskStatus.FAILED
      subTask.endTime = new Date()
      throw error
    } finally {
      this.runningTasks.delete(subTask.id)
    }
  }

  /**
   * 带重试的工具执行
   */
  private async executeWithRetry(
    tool: Tool,
    params: Record<string, any>,
    maxRetries: number
  ): Promise<ToolResult> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await tool.execute(params)
        if (result.success) {
          return result
        }
        lastError = result.error
      } catch (error) {
        lastError = error as Error
      }

      if (attempt < maxRetries) {
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError || new Error('工具执行失败')
  }

  /**
   * 暂停任务执行
   */
  pauseTask(taskId: string): void {
    // 实现暂停逻辑
    console.log(`暂停任务: ${taskId}`)
  }

  /**
   * 恢复任务执行
   */
  resumeTask(taskId: string): void {
    // 实现恢复逻辑
    console.log(`恢复任务: ${taskId}`)
  }

  /**
   * 取消任务执行
   */
  cancelTask(taskId: string): void {
    // 实现取消逻辑
    console.log(`取消任务: ${taskId}`)
  }
}
