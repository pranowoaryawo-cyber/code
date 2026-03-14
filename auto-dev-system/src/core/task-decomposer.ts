import { Task, SubTask, TaskStatus, TaskPriority, ExecutionPlan, ExecutionStep } from '../types/index.js'
import { generateId } from '../utils/id-generator.js'

/**
 * 任务分解器
 * 负责将复杂任务分解为可执行的子任务
 */
export class TaskDecomposer {
  /**
   * 分解任务
   */
  async decomposeTask(description: string, priority: TaskPriority = TaskPriority.NORMAL): Promise<Task> {
    const taskId = generateId('task')
    
    // 分析任务描述，生成子任务
    const subTasks = await this.analyzeAndCreateSubTasks(description)
    
    const task: Task = {
      id: taskId,
      description,
      priority,
      status: TaskStatus.PLANNING,
      subTasks,
      context: {},
      checkpoints: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    
    return task
  }

  /**
   * 分析任务描述并创建子任务
   */
  private async analyzeAndCreateSubTasks(description: string): Promise<SubTask[]> {
    const subTasks: SubTask[] = []
    
    // 基于关键词的简单任务分解逻辑
    // 实际应用中可以接入 LLM 进行智能分解
    
    if (this.isWebAppTask(description)) {
      subTasks.push(...this.decomposeWebAppTask(description))
    } else if (this.isApiTask(description)) {
      subTasks.push(...this.decomposeApiTask(description))
    } else if (this.isDataProcessingTask(description)) {
      subTasks.push(...this.decomposeDataProcessingTask(description))
    } else {
      // 默认分解策略
      subTasks.push(...this.decomposeGenericTask(description))
    }
    
    return subTasks
  }

  /**
   * 判断是否为 Web 应用任务
   */
  private isWebAppTask(description: string): boolean {
    const keywords = ['web', 'app', '应用', 'react', 'vue', 'angular', '前端', 'ui', '界面']
    return keywords.some(keyword => description.toLowerCase().includes(keyword))
  }

  /**
   * 判断是否为 API 任务
   */
  private isApiTask(description: string): boolean {
    const keywords = ['api', '接口', 'rest', 'graphql', '后端', 'server', '服务']
    return keywords.some(keyword => description.toLowerCase().includes(keyword))
  }

  /**
   * 判断是否为数据处理任务
   */
  private isDataProcessingTask(description: string): boolean {
    const keywords = ['数据', 'data', '处理', 'process', '分析', 'analysis', 'etl']
    return keywords.some(keyword => description.toLowerCase().includes(keyword))
  }

  /**
   * 分解 Web 应用任务
   */
  private decomposeWebAppTask(description: string): SubTask[] {
    const task1 = this.createSubTask('创建项目结构', [])
    const task2 = this.createSubTask('安装依赖', [task1.id])
    const task3 = this.createSubTask('创建组件', [task2.id])
    const task4 = this.createSubTask('实现业务逻辑', [task3.id])
    const task5 = this.createSubTask('添加样式', [task3.id])
    const task6 = this.createSubTask('编写测试', [task4.id])
    const task7 = this.createSubTask('构建项目', [task6.id, task5.id])
    
    return [task1, task2, task3, task4, task5, task6, task7]
  }

  /**
   * 分解 API 任务
   */
  private decomposeApiTask(description: string): SubTask[] {
    const task1 = this.createSubTask('创建项目结构', [])
    const task2 = this.createSubTask('安装依赖', [task1.id])
    const task3 = this.createSubTask('定义数据模型', [task2.id])
    const task4 = this.createSubTask('实现路由', [task3.id])
    const task5 = this.createSubTask('实现控制器', [task4.id])
    const task6 = this.createSubTask('添加中间件', [task5.id])
    const task7 = this.createSubTask('编写测试', [task6.id])
    const task8 = this.createSubTask('生成文档', [task7.id])
    
    return [task1, task2, task3, task4, task5, task6, task7, task8]
  }

  /**
   * 分解数据处理任务
   */
  private decomposeDataProcessingTask(description: string): SubTask[] {
    const task1 = this.createSubTask('创建项目结构', [])
    const task2 = this.createSubTask('安装依赖', [task1.id])
    const task3 = this.createSubTask('读取数据源', [task2.id])
    const task4 = this.createSubTask('数据清洗', [task3.id])
    const task5 = this.createSubTask('数据转换', [task4.id])
    const task6 = this.createSubTask('数据分析', [task5.id])
    const task7 = this.createSubTask('生成报告', [task6.id])
    
    return [task1, task2, task3, task4, task5, task6, task7]
  }

  /**
   * 通用任务分解
   */
  private decomposeGenericTask(description: string): SubTask[] {
    const task1 = this.createSubTask('分析需求', [])
    const task2 = this.createSubTask('设计方案', [task1.id])
    const task3 = this.createSubTask('实现功能', [task2.id])
    const task4 = this.createSubTask('测试验证', [task3.id])
    const task5 = this.createSubTask('优化完善', [task4.id])
    
    return [task1, task2, task3, task4, task5]
  }

  /**
   * 创建子任务
   */
  private createSubTask(description: string, dependencies: string[]): SubTask {
    return {
      id: generateId('subtask'),
      description,
      dependencies,
      status: TaskStatus.PENDING,
      retryCount: 0,
      maxRetries: 3,
    }
  }

  /**
   * 生成执行计划
   */
  async generateExecutionPlan(task: Task): Promise<ExecutionPlan> {
    const steps: ExecutionStep[] = []
    let totalEstimatedDuration = 0
    
    // 为每个子任务生成执行步骤
    for (const subTask of task.subTasks) {
      const step = this.createExecutionStep(subTask)
      steps.push(step)
      totalEstimatedDuration += subTask.estimatedDuration || 60
    }
    
    // 检查是否可以并行执行
    const parallelizable = this.canParallelize(task.subTasks)
    
    return {
      taskId: task.id,
      steps,
      estimatedDuration: totalEstimatedDuration,
      parallelizable,
    }
  }

  /**
   * 创建执行步骤
   */
  private createExecutionStep(subTask: SubTask): ExecutionStep {
    // 根据子任务描述选择合适的工具
    const tool = this.selectTool(subTask.description)
    
    return {
      id: generateId('step'),
      subTaskId: subTask.id,
      tool,
      params: this.extractParams(subTask.description),
      canRunInParallel: subTask.dependencies.length === 0,
      dependencies: subTask.dependencies,
    }
  }

  /**
   * 选择工具
   */
  private selectTool(description: string): string {
    if (description.includes('创建') || description.includes('生成')) {
      return 'file-creator'
    } else if (description.includes('安装')) {
      return 'package-installer'
    } else if (description.includes('测试')) {
      return 'test-runner'
    } else if (description.includes('构建')) {
      return 'builder'
    } else {
      return 'code-generator'
    }
  }

  /**
   * 提取参数
   */
  private extractParams(description: string): Record<string, any> {
    // 简单的参数提取逻辑
    return {
      description,
      timestamp: Date.now(),
    }
  }

  /**
   * 检查是否可以并行执行
   */
  private canParallelize(subTasks: SubTask[]): boolean {
    // 如果有任何子任务有依赖，则不能完全并行
    return subTasks.every(task => task.dependencies.length === 0)
  }
}
