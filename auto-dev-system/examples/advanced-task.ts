import { createAutoDevSystem, TaskPriority } from '../src/index.js'

/**
 * 高级任务示例 - 带进度监控和错误处理
 */
async function main() {
  try {
    console.log('=== 高级任务示例 ===\n')
    
    // 创建系统实例
    const system = await createAutoDevSystem({
      maxParallelTasks: 5,
      defaultRetries: 3,
      checkpointInterval: 60, // 每 60 秒创建检查点
      enableAutoRecovery: true,
      logLevel: 'debug',
    })
    
    // 获取进度跟踪器
    const progressTracker = system.getProgressTracker()
    
    // 监听进度事件
    progressTracker.on('progress', (event) => {
      console.log(`[事件] ${event.type}:`, event.data)
    })
    
    // 提交任务
    const task = await system.submitTask(
      '创建一个全栈电商应用，包含前端、后端和数据库',
      TaskPriority.HIGH
    )
    
    console.log('\n任务完成!')
    console.log(`任务 ID: ${task.id}`)
    console.log(`状态: ${task.status}`)
    
    // 获取错误统计
    const errorHandler = system.getErrorHandler()
    const errorStats = errorHandler.getTaskErrorStats(task.id)
    console.log('\n错误统计:', errorStats)
    
  } catch (error) {
    console.error('执行失败:', error)
    process.exit(1)
  }
}

main()
