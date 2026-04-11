import { describe, expect, it, beforeEach, vi } from 'vitest'
import { chatService } from './chatService'

describe('chatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends a chat message to the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ response: 'hola', session_id: 'abc' }),
    })

    await chatService.sendMessage('Hola', 'session-1')

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/chat'), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ prompt: 'Hola', session_id: 'session-1' }),
    }))
  })

  it('maps API validation errors to a readable message', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ detail: [{ msg: 'Prompt requerido' }] }),
    })

    await expect(chatService.sendMessage('', 'default')).rejects.toThrow('Prompt requerido')
  })

  it('can reset a session', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue('ok'),
    })

    await chatService.resetSession('abc')

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/chat/abc'), expect.objectContaining({
      method: 'DELETE',
    }))
  })
})