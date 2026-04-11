import { describe, expect, it, beforeEach, vi } from 'vitest'
import { http } from './http'

describe('http service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('attaches the bearer token to requests', async () => {
    localStorage.setItem('token', 'token-123')
    const json = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json })

    await http.get('/users')

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/users'), expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      }),
    }))
  })

  it('throws the message returned by the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'No autorizado' }),
    })

    await expect(http.get('/private')).rejects.toThrow('No autorizado')
  })

  it('falls back to the status when the error body is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })

    await expect(http.get('/boom')).rejects.toThrow('Error 500')
  })
})