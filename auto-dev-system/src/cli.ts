#!/usr/bin/env node

import { Command } from 'commander'
import { createAutoDevSystem } from './index.js'
import { TaskPriority } from './types/index.js'

const program = new Command()

program
  .name('auto-dev')
  .description('全自动开发系统 CLI')
  .version('1.0.0')

program
  .command('run')
  .description('运行开发任务')
  .argument('<description>', '任务描述')
  .option('-p, --priority <priority>', '任务优先级 (low|normal|high|critical)', 'normal')
  .action(async (description: string, options: any) => {
    try {
      const priorityMap: Record<string, TaskPriority> = {
        low: TaskPriority.LOW,
        normal: TaskPriority.NORMAL,
        high: TaskPriority.HIGH,
        critical: TaskPriority.CRITICAL,
      }
      
      const priority = priorityMap[options.priority] || TaskPriority.NORMAL
      
      const system = await createAutoDevSystem()
      const task = await system.submitTask(description, priority)
      
      console.log(`\n任务 ID: ${task.id}`)
      console.log(`状态: ${task.status}`)
    } catch (error) {
      console.error('错误:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('list')
  .description('列出所有任务')
  .action(async () => {
    try {
      const system = await createAutoDevSystem()
      const tasks = await system.listTasks()
      
      if (tasks.length === 0) {
        console.log('没有任务')
        return
      }
      
      console.log('\n任务列表:')
      for (const taskId of tasks) {
        const task = await system.getTaskStatus(taskId)
        if (task) {
          console.log(`  ${task.id}: ${task.description} [${task.status}]`)
        }
      }
    } catch (error) {
      console.error('错误:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('resume')
  .description('恢复任务')
  .argument('<taskId>', '任务 ID')
  .action(async (taskId: string) => {
    try {
      const system = await createAutoDevSystem()
      await system.resumeTask(taskId)
    } catch (error) {
      console.error('错误:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('status')
  .description('查看任务状态')
  .argument('<taskId>', '任务 ID')
  .action(async (taskId: string) => {
    try {
      const system = await createAutoDevSystem()
      const task = await system.getTaskStatus(taskId)
      
      if (!task) {
        console.log(`找不到任务: ${taskId}`)
        return
      }
      
      console.log('\n任务详情:')
      console.log(`ID: ${task.id}`)
      console.log(`描述: ${task.description}`)
      console.log(`状态: ${task.status}`)
      console.log(`优先级: ${task.priority}`)
      console.log(`创建时间: ${task.createdAt.toISOString()}`)
      console.log(`更新时间: ${task.updatedAt.toISOString()}`)
      
      if (task.completedAt) {
        console.log(`完成时间: ${task.completedAt.toISOString()}`)
      }
      
      console.log(`\n子任务 (${task.subTasks.length}):`)
      for (const subTask of task.subTasks) {
        console.log(`  - ${subTask.description} [${subTask.status}]`)
      }
      
      console.log(`\n检查点 (${task.checkpoints.length}):`)
      for (const checkpoint of task.checkpoints) {
        console.log(`  - ${checkpoint.description} (${checkpoint.timestamp.toISOString()})`)
      }
    } catch (error) {
      console.error('错误:', (error as Error).message)
      process.exit(1)
    }
  })

program.parse()
