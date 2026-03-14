import { Orchestrator } from './core/orchestrator.js'
import { TaskPriority } from './types/index.js'

/**
 * 导出主要类和类型
 */
export { Orchestrator } from './core/orchestrator.js'
export { TaskDecomposer } from './core/task-decomposer.js'
export { ExecutionEngine } from './core/execution-engine.js'
export { StateManager } from './core/state-manager.js'
export { ProgressTracker } from './core/progress-tracker.js'
export { ErrorHandler } from './core/error-handler.js'

export * from './types/index.js'

/**
 * 创建默认实例
 */
export async function createAutoDevSystem(config?: any) {
  const orchestrator = new Orchestrator(config)
  await orchestrator.initialize()
  return orchestrator
}

/**
 * 快速启动函数
 */
export async function runTask(description: string, priority: TaskPriority = TaskPriority.NORMAL) {
  const system = await createAutoDevSystem()
  return await system.submitTask(description, priority)
}

// 默认导出
export default {
  createAutoDevSystem,
  runTask,
  Orchestrator,
  TaskPriority,
}
