import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const chatServiceMocks = vi.hoisted(() => ({
  checkHealth: vi.fn(),
  sendMessage: vi.fn(),
  resetSession: vi.fn(),
}))

vi.mock('../services/chatService', () => ({
  chatService: chatServiceMocks,
}))

import { useChat } from './useChat'

describe('useChat', () => {
  beforeEach(() => {
    chatServiceMocks.checkHealth.mockResolvedValue({ status: 'ok' })
    chatServiceMocks.sendMessage.mockReset()
    chatServiceMocks.resetSession.mockReset()
  })

  it('creates a session and checks chat health on mount', async () => {
    renderHook(() => useChat())

    await waitFor(() => {
      expect(chatServiceMocks.checkHealth).toHaveBeenCalledTimes(1)
    })

    expect(localStorage.getItem('chatSessionId')).toMatch(/^session_/)
  })

  it('appends user and assistant messages on success', async () => {
    chatServiceMocks.sendMessage.mockResolvedValue({ response: 'Respuesta del agente' })

    const { result } = renderHook(() => useChat())

    await waitFor(() => expect(chatServiceMocks.checkHealth).toHaveBeenCalled())

    await act(async () => {
      await result.current.sendMessage('Hola')
    })

    expect(chatServiceMocks.sendMessage).toHaveBeenCalledWith('Hola', result.current.sessionId)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.error).toBeNull()
  })

  it('records an error message when the API fails', async () => {
    chatServiceMocks.sendMessage.mockRejectedValue(new Error('falló el chat'))

    const { result } = renderHook(() => useChat())

    await waitFor(() => expect(chatServiceMocks.checkHealth).toHaveBeenCalled())

    await act(async () => {
      await result.current.sendMessage('Ayuda')
    })

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[1].role).toBe('error')
    expect(result.current.error).toBe('falló el chat')
  })

  it('resets the session and clears messages', async () => {
    chatServiceMocks.resetSession.mockResolvedValue('ok')

    const { result } = renderHook(() => useChat())

    await waitFor(() => expect(chatServiceMocks.checkHealth).toHaveBeenCalled())

    await act(async () => {
      await result.current.resetChat()
    })

    expect(chatServiceMocks.resetSession).toHaveBeenCalledWith(result.current.sessionId)
    expect(result.current.messages).toEqual([])
    expect(result.current.error).toBeNull()
  })
})