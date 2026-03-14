# 系统架构文档

## 概述

全自动开发系统基于 Anthropic 的长期运行 Agent 架构设计，实现了任务自动分解、执行、监控和恢复的完整流程。

## 核心组件

### 1. Orchestrator (任务协调器)

**职责:**
- 协调所有组件
- 管理任务生命周期
- 处理任务提交和恢复

**关键方法:**
- `submitTask()` - 提交新任务
- `resumeTask()` - 恢复已暂停的任务
- `listTasks()` - 列出所有任务
- `getTaskStatus()` - 获取任务状态

### 2. TaskDecomposer (任务分解器)

**职责:**
- 分析任务描述
- 分解为可执行的子任务
- 生成执行计划
- 建立任务依赖关系

**分解策略:**
- Web 应用任务
- API 服务任务
- 数据处理任务
- 通用任务

### 3. ExecutionEngine (执行引擎)

**职责:**
- 执行任务计划
- 管理工具调用
- 处理并发执行
- 实现重试机制

**特性:**
- 依赖关系解析
- 并行执行支持
- 指数退避重试
- 超时处理

### 4. StateManager (状态管理器)

**职责:**
- 持久化任务状态
- 管理检查点
- 支持任务恢复
- 清理旧状态

**存储格式:**
- JSON 文件存储
- 每个任务一个文件
- 包含完整状态快照

### 5. ProgressTracker (进度跟踪器)

**职责:**
- 实时监控任务进度
- 发送进度事件
- 生成统计信息
- 估算剩余时间

**事件类型:**
- `task_started` - 任务开始
- `task_completed` - 任务完成
- `task_failed` - 任务失败
- `subtask_started` - 子任务开始
- `subtask_completed` - 子任务完成
- `subtask_failed` - 子任务失败
- `checkpoint_created` - 检查点创建

### 6. ErrorHandler (错误处理器)

**职责:**
- 错误分类
- 确定恢复策略
- 触发人工干预
- 记录错误日志

**错误类型:**
- `TOOL_EXECUTION` - 工具执行错误
- `DEPENDENCY` - 依赖错误
- `TIMEOUT` - 超时错误
- `RESOURCE` - 资源错误
- `VALIDATION` - 验证错误

**严重程度:**
- `LOW` - 低
- `MEDIUM` - 中
- `HIGH` - 高
- `CRITICAL` - 严重

## 工具系统

### 内置工具

1. **FileCreatorTool** - 文件创建
2. **PackageInstallerTool** - 包安装
3. **CodeGeneratorTool** - 代码生成
4. **TestRunnerTool** - 测试运行
5. **BuilderTool** - 项目构建

### 工具接口

```typescript
interface Tool {
  name: string
  execute(params: Record<string, any>): Promise<ToolResult>
}
```

### 扩展工具

可以通过实现 `Tool` 接口来添加自定义工具：

```typescript
class CustomTool implements Tool {
  name = 'custom-tool'
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    // 实现工具逻辑
  }
}

// 注册工具
executor.registerTool(new CustomTool())
```

## 数据流

```
用户输入
  ↓
Orchestrator (协调)
  ↓
TaskDecomposer (分解)
  ↓
ExecutionEngine (执行)
  ↓
Tools (工具调用)
  ↓
StateManager (状态保存)
  ↓
ProgressTracker (进度更新)
  ↓
结果输出
```

## 错误恢复流程

```
错误发生
  ↓
ErrorHandler (分类)
  ↓
确定恢复策略
  ↓
├─ 可重试 → 自动重试
├─ 需人工干预 → 暂停并通知
└─ 不可恢复 → 标记失败
  ↓
从检查点恢复
  ↓
继续执行
```

## 配置选项

```typescript
interface SystemConfig {
  maxParallelTasks: number        // 最大并行任务数
  defaultRetries: number           // 默认重试次数
  checkpointInterval: number       // 检查点间隔（秒）
  timeoutPerTask: number          // 单个任务超时（秒）
  enableAutoRecovery: boolean     // 启用自动恢复
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}
```

## 性能优化

1. **并行执行** - 无依赖的子任务并行执行
2. **增量检查点** - 定期保存状态，避免重复工作
3. **智能重试** - 指数退避策略，避免资源浪费
4. **事件驱动** - 异步事件处理，提高响应速度

## 扩展性

系统设计遵循开放封闭原则，支持以下扩展：

1. **自定义工具** - 实现 Tool 接口
2. **自定义分解策略** - 扩展 TaskDecomposer
3. **自定义存储** - 实现 StateManager 接口
4. **自定义通知** - 监听 ProgressTracker 事件

## 安全考虑

1. **输入验证** - 验证所有用户输入
2. **权限控制** - 限制工具执行权限
3. **资源限制** - 防止资源耗尽
4. **错误隔离** - 防止错误传播

## 未来改进

1. **LLM 集成** - 使用大语言模型进行智能任务分解
2. **分布式执行** - 支持多机器并行执行
3. **Web 界面** - 提供可视化管理界面
4. **插件系统** - 支持第三方插件
5. **云存储** - 支持云端状态存储
