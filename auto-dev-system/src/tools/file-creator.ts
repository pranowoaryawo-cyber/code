import { Tool } from '../core/execution-engine.js'
import { ToolResult } from '../types/index.js'
import { promises as fs } from 'fs'
import { dirname } from 'path'

/**
 * 文件创建工具
 */
export class FileCreatorTool implements Tool {
  name = 'file-creator'

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      const { path, content = '', description } = params
      
      console.log(`📄 创建文件: ${path || '项目结构'}`)
      
      if (path) {
        // 确保目录存在
        const dir = dirname(path)
        await fs.mkdir(dir, { recursive: true })
        
        // 写入文件
        await fs.writeFile(path, content, 'utf-8')
        console.log(`   ✅ 已创建: ${path}`)
      } else {
        // 创建项目结构
        const projectName = description.includes('React') ? 'react-app' :
                           description.includes('Vue') ? 'vue-app' : 'my-app'
        
        await fs.mkdir(projectName, { recursive: true })
        await fs.mkdir(`${projectName}/src`, { recursive: true })
        await fs.mkdir(`${projectName}/public`, { recursive: true })
        
        // 创建 package.json
        const packageJson = {
          name: projectName,
          version: '1.0.0',
          description: description,
          main: 'index.js',
          scripts: {
            start: 'echo "Start command"',
            build: 'echo "Build command"',
            test: 'echo "Test command"'
          }
        }
        
        await fs.writeFile(
          `${projectName}/package.json`,
          JSON.stringify(packageJson, null, 2),
          'utf-8'
        )
        
        // 创建 README
        await fs.writeFile(
          `${projectName}/README.md`,
          `# ${projectName}\n\n${description}\n`,
          'utf-8'
        )
        
        console.log(`   ✅ 已创建项目: ${projectName}/`)
      }
      
      return {
        success: true,
        data: { path, created: true },
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
