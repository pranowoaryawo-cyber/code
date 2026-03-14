import { Tool } from '../core/execution-engine.js'
import { ToolResult } from '../types/index.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'

const execAsync = promisify(exec)

/**
 * 包安装工具
 */
export class PackageInstallerTool implements Tool {
  name = 'package-installer'

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now()
    
    try {
      const { packages, packageManager = 'npm', description } = params
      
      console.log(`📦 安装依赖: ${packages || '基础依赖'}`)
      
      // 查找项目目录
      const dirs = await fs.readdir('.')
      const projectDir = dirs.find(d => d.includes('-app'))
      
      if (projectDir) {
        // 读取 package.json
        const packageJsonPath = `${projectDir}/package.json`
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
        
        // 添加依赖
        if (description.includes('React')) {
          packageJson.dependencies = {
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
            ...packageJson.dependencies
          }
          packageJson.devDependencies = {
            '@types/react': '^18.2.0',
            '@types/react-dom': '^18.2.0',
            'typescript': '^5.0.0',
            ...packageJson.devDependencies
          }
        } else if (description.includes('Vue')) {
          packageJson.dependencies = {
            'vue': '^3.3.0',
            ...packageJson.dependencies
          }
        }
        
        // 保存 package.json
        await fs.writeFile(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2),
          'utf-8'
        )
        
        console.log(`   ✅ 已更新 package.json`)
        console.log(`   ℹ️  提示: 运行 'cd ${projectDir} && npm install' 安装依赖`)
      }
      
      return {
        success: true,
        data: { installed: true, packages },
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
