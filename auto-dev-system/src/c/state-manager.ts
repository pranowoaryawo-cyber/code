import { Task, Checkpoint } from '../types/index.js'
import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * 状态管理器
 * 负责任务状态的持久化、检查点管理和恢复
 */
export class StateManager {
  private stateDir: string
  private checkpointInterval: number

  constructor(stateDir: string = './state', checkpointInterval: number = 300) {
    this.stateDir = stateDir
    this.checkpointInterval = checkpointInterval
  }

  /**
   * 初始化状态目录
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.stateDir, { recursive: true })
    } catch (error) {
      console.error('初始化状态目录失败:', error)
      throw error
    }
  }

  /**
   * 保存任务状态
   */
  async saveTaskState(task: Task): Promise<void> {
    const filePath = join(this.stateDir, `${task.id}.json`)
    
    try {
      const data = JSON.stringify(task, null, 2)
      await fs.writeFile(filePath, data, 'utf-8')
    } catch (error) {
      console.error(`保存任务状态失败 (${task.id}):`, error)
      throw error
    }
  }

  /**
   * 加载任务状态
   */
  async loadTaskState(taskId: string): Promise<Task | null> {
    const filePath = join(this.stateDir, `${taskId}.json`)
    
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      const task = JSON.parse(data)
      
      // 恢复日期对象
      task.createdAt = new Date(task.createdAt)
      task.updatedAt = new Date(task.updatedAt)
      if (task.completedAt) {
        task.completedAt = new Date(task.completedAt)
      }
      
     n task
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      console.error(`加载任务状态失败 (${taskId}):`, error)
      throw error
    }
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(task: Task, description: string): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: `checkpoint_${Date.now()}`,
      taskId: task.id,
      timestamp: new Date(),
      state: this.serializeTaskState(task),
      description,
    }
    
    task.checkpoints.push(checkpoint)
    await this.saveTaskState(task)
    
    return checkpoint
  }

  /**
   * 从检查点恢复
   */
  async restoreFromCheckpoint(taskId: string, checkpointId: string): Promise<Task | null> {
    const task = await this.loadTaskState(taskId)
    if (!task) {
      return null
    }
    
    const checkpoint = task.checkpoints.find(cp => cp.id === checkpointId)
    if (!checkpoint) {
      throw new Error(`找不到检查点: ${checkpointId}`)
    }
    
    // 恢复任务状态
    const restoredTask = this.deserializeTaskState(checkpoint.state)
    return restoredTask
  }

  /**
   * 列出所有任务
   */
  async listTasks(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.stateDir)
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
    } catch (error) {
      console.error('列出任务失败:', error)
      return []
    }
  }

  /**
   * 删除任务状态
   */
  async deleteTaskState(taskId: string): Promise<void> {
    const filePath = join(this.stateDir, `${taskId}.json`)
    
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`删除任务状态失败 (${taskId}):`, error)
        throw error
      }
    }
  }

  /**
   * 序列化任务状态
   */
  private serializeTaskState(task: Task): any {
    return JSON.parse(JSON.stringify(task))
  }

  /**
   * 反序列化任务状态
   */
  private deserializeTaskState(state: any): Task {
    const task = state as Task
    
    // 恢复日期对象
    task.createdAt = new Date(task.createdAt)
    task.updatedAt = new Date(task.updatedAt)
    if (task.completedAt) {
      task.completedAt = new Date(task.completedAt)
    }
    
    task.checkpoints = task.checkpoints.map(cp => ({
      ...cp,
      timestamp: new Date(cp.timestamp),
    }))
   eturn task
  }

  /**
   * 清理旧状态
   */
  async cleanupOldStates(daysToKeep: number = 7): Promise<number> {
    const tasks = await this.listTasks()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    let deletedCount = 0
    
    for (const taskId of tasks) {
      const task = await this.loadTaskState(taskId)
      if (task && task.updatedAt < cutoffDate) {
        await this.deleteTaskState(taskId)
        deletedCount++
      }
    }
    
    return deletedCount
  }
}
