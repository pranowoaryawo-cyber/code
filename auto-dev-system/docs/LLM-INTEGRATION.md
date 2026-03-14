# LLM 集成指南

当前系统是一个**框架演示**，展示了 Anthropic 长期运行 Agent 的架构设计。要实现真正的全自动代码生成，需要集成大语言模型（LLM）。

## 当前限制

现有工具生成的是**模板代码**，无法理解具体需求。例如：
- 任务："生成监控 k8s 的服务"
- 当前输出：通用的 TypeScript 类模板
- 期望输出：包含 k8s client、监控逻辑的完整代码

## 集成 LLM 的方案

### 方案 1: 集成 OpenAI API

```typescript
import OpenAI from 'openai'

export class LLMCodeGeneratorTool implements Tool {
  private openai: OpenAI
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const { description, language, framework } = params
    
    const prompt = `生成 ${language} 代码来实现: ${description}
    
要求:
- 使用 ${framework || '标准库'}
- 包含完整的实现
- 添加注释和错误处理
- 遵循最佳实践

只返回代码，不要解释。`
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })
    
    const code = response.choices[0].message.content
    
    // 保存到文件
    await fs.writeFile(filename, code, 'utf-8')
    
    return {
      success: true,
      data: { code, filename },
      duration: Date.now() - startTime,
    }
  }
}
```

### 方案 2: 集成 Anthropic Claude API

```typescript
import Anthropic from '@anthropic-ai/sdk'

export class ClaudeCodeGeneratorTool implements Tool {
  private anthropic: Anthropic
  
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey })
  }
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const { description, language } = params
    
    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `作为专业开发者，用 ${language} 实现: ${description}
        
要求:
1. 完整可运行的代码
2. 包含所有必要的导入
3. 添加详细注释
4. 处理边界情况和错误
5. 遵循语言最佳实践

直接输出代码，使用代码块包裹。`
      }]
    })
    
    const code = this.extractCode(message.content[0].text)
    
    return {
      success: true,
      data: { code },
      duration: Date.now() - startTime,
    }
  }
  
  private extractCode(text: string): string {
    const match = text.match(/```[\w]*\n([\s\S]*?)\n```/)
    return match ? match[1] : text
  }
}
```

### 方案 3: 本地 LLM (Ollama)

```typescript
export class OllamaCodeGeneratorTool implements Tool {
  private baseUrl = 'http://localhost:11434'
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const { description, language } = params
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'codellama',
        prompt: `生成 ${language} 代码: ${description}`,
        stream: false,
      })
    })
    
    const data = await response.json()
    const code = data.response
    
    return {
      success: true,
      data: { code },
      duration: Date.now() - startTime,
    }
  }
}
```

## 使用示例

### 安装依赖

```bash
# OpenAI
npm install openai

# Anthropic
npm install @anthropic-ai/sdk

# Ollama (本地)
# 下载并安装 Ollama: https://ollama.ai
ollama pull codellama
```

### 配置 API Key

```typescript
// .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 注册 LLM 工具

```typescript
import { LLMCodeGeneratorTool } from './tools/llm-code-generator.js'

const system = await createAutoDevSystem()
const executor = system.getExecutor()

// 替换默认的代码生成工具
executor.registerTool(new LLMCodeGeneratorTool(process.env.OPENAI_API_KEY))
```

### 运行任务

```bash
npm run task -- run "生成一个监控 k8s 运行状态的 Node.js 服务"
```

## 完整示例：K8s 监控服务

使用 LLM 后，系统会生成类似这样的代码：

```typescript
// k8s-monitor-service.ts
import * as k8s from '@kubernetes/client-node'
import express from 'express'

class K8sMonitorService {
  private kc: k8s.KubeConfig
  private k8sApi: k8s.CoreV1Api
  
  constructor() {
    this.kc = new k8s.KubeConfig()
    this.kc.loadFromDefault()
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api)
  }
  
  async getClusterStatus() {
    try {
      // 获取所有节点
      const nodes = await this.k8sApi.listNode()
      
      // 获取所有 Pod
      const pods = await this.k8sApi.listPodForAllNamespaces()
      
      // 统计状态
      const nodeStatus = nodes.body.items.map(node => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find(c => c.type === 'Ready')?.status,
        cpu: node.status?.capacity?.cpu,
        memory: node.status?.capacity?.memory,
      }))
      
      const podStatus = {
        total: pods.body.items.length,
        running: pods.body.items.filter(p => p.status?.phase === 'Running').length,
        pending: pods.body.items.filter(p => p.status?.phase === 'Pending').length,
        failed: pods.body.items.filter(p => p.status?.phase === 'Failed').length,
      }
      
      return {
        nodes: nodeStatus,
        pods: podStatus,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error('获取集群状态失败:', error)
      throw error
    }
  }
  
  startServer(port: number = 3000) {
    const app = express()
    
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' })
    })
    
    app.get('/cluster/status', async (req, res) => {
      try {
        const status = await this.getClusterStatus()
        res.json(status)
      } catch (error) {
        res.status(500).json({ error: error.message })
      }
    })
    
    app.listen(port, () => {
      console.log(`K8s 监控服务运行在 http://localhost:${port}`)
    })
  }
}

// 启动服务
const monitor = new K8sMonitorService()
monitor.startServer()
```

## 成本考虑

| 方案 | 成本 | 速度 | 质量 |
|------|------|------|------|
| OpenAI GPT-4 | $0.03/1K tokens | 中等 | 优秀 |
| Anthropic Claude | $0.015/1K tokens | 快 | 优秀 |
| Ollama (本地) | 免费 | 慢 | 良好 |

## 下一步

1. 选择 LLM 提供商
2. 获取 API Key
3. 实现 LLM 工具类
4. 替换现有的代码生成工具
5. 测试完整的代码生成流程

## 注意事项

- LLM 生成的代码需要人工审查
- 添加代码验证和测试步骤
- 考虑成本控制（设置 token 限制）
- 实现缓存机制避免重复生成
- 添加代码格式化和 lint 检查
