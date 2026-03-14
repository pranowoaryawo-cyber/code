/**
 * ID 生成器
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

/**
 * 生成短 ID
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9)
}
