import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-fish-chat'
export const inject = ['agents']

const BRIDGE = process.env.BIGBLUEFISH_MCP
  || `${process.env.HOME || ''}/Documents/big-blue-fish-src/dist/mcp/bigbluefish-mcp`

export function apply(ctx) {
  let child = null
  let buffer = ''
  let ready = false
  let lastSequence = 0

  const send = (obj) => { try { child?.stdin.write(JSON.stringify(obj) + '\n') } catch { } }

  const inject = (text) => {
    const value = String(text || '').trim()
    if (!value) return
    const agents = ctx.get('agents')
    const agent = agents?.roots?.()[0] ?? agents?.list?.()[0]
    if (!agent || typeof agent.followup !== 'function') {
      ctx.logger?.warn?.('dsh-fish-chat: 没有可用的会话，消息丢弃')
      return
    }
    try {
      agent.followup({ role: 'user', content: [{ type: 'text', text: value }], source: { kind: 'user' }, id: randomUUID() })
      ctx.logger?.info?.('dsh-fish-chat: 已注入用户消息')
    } catch (error) {
      ctx.logger?.warn?.(`dsh-fish-chat: 注入失败 ${String(error)}`)
    }
  }

  const onLine = (line) => {
    let msg
    try { msg = JSON.parse(line) } catch { return }
    if (msg.id === 1 && msg.result) {
      ready = true
      lastSequence = 0
      send({ jsonrpc: '2.0', method: 'notifications/initialized' })
      return
    }
    if (msg.method === 'notifications/message') {
      const params = msg.params || {}
      const data = params.data || {}
      if (params.logger !== 'bigbluefish.interaction' || data.kind !== 'user_message') return
      const seq = Number(data.sequence || 0)
      if (seq && seq <= lastSequence) return
      if (seq) lastSequence = seq
      inject(data.detail?.text)
    }
  }

  const start = () => {
    ready = false
    child = spawn(BRIDGE, [], { stdio: ['pipe', 'pipe', 'inherit'], env: process.env })
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 1)
        if (line) onLine(line)
      }
    })
    child.on('exit', () => {
      child = null
      setTimeout(start, 3000)
    })
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'dsh-fish-chat', version: '0.1.0' } } })
  }

  ctx.effect(() => {
    start()
    return () => { try { child?.kill() } catch { } child = null }
  }, 'dsh-fish-chat: bridge')
}
