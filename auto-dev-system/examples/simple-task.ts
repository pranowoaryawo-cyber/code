import { runTask, TaskPriority } from '../src/index.js'

/**
 * 简单任务示例
 */
async function main() {
  try {
    console.log('=== 全自动开发系统示例 ===\n')
    
    // 示例 1: 创建 Web 应用
    await runTask('创建一个 React Todo 应用', TaskPriority.NORMAL)
    
    // 示例 2: 创建 API
    // await runTask('创建一个 RESTful API 服务', TaskPriority.HIGH)
    
    // 示例 3: 数据处理
    // await runTask('处理 CSV 数据并生成报告', TaskPriority.LOW)
    
  } catch (error) {
    console.error('执行失败:', error)
    process.exit(1)
  }
}

main()
