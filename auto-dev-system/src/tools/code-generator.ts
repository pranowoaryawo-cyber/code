import { Tool } from '../core/execution-engine.js'
import { ToolResult } from '../types/index.js'
import { promises as fs } from 'fs'

/**
 * 代码生成工具
 */
export class CodeGeneratorTool implements Tool {
  name = 'code-generator'

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      const { description, language = 'typescript', framework } = params
      
      console.log(`💻 生成代码: ${description}`)
      
      // 根据描述生成代码
      let code = ''
      let filename = ''
      
      if (description.includes('组件')) {
        filename = 'src/components/Component.tsx'
        code = `import React from 'react'

export const Component: React.FC = () => {
  return (
    <div>
      <h1>Component</h1>
      {/* ${description} */}
    </div>
  )
}

export default Component
`
      } else if (description.includes('业务逻辑')) {
        filename = 'src/logic/business.ts'
        code = `/**
 * ${description}
 */

export class BusinessLogic {
  constructor() {
    // 初始化
  }

  a() {
    // 实现业务逻辑
    console.log('执行业务逻辑')
  }
}

export default BusinessLogic
`
      } else if (description.includes('样式')) {
        filename = 'src/styles/main.css'
        code = `/* ${description} */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
`
      } else {
        filename = 'src/index.ts'
        code = `// ${description}

console.log('Hello World')
`
      }
      
      // 查找项目目录
      const dirs = await fs.readdir('.')
      const projectDir = dirs.find(d => d.includes('-app')) || '.'
      
      if (projectDir !== '.') {
        const fullPath = `${projectDir}/${filename}`
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(fullPath, code, 'utf-8')
        console.log(`   ✅ 已生成: ${fullPath}`)
      }
      
      return {
        success: true,
        data: { code, filename },
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      }
    }
  }
}
