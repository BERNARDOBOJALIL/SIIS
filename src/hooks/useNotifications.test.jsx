import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'

const firestoreState = vi.hoisted(() => {
  let nextCallback = null
  let errorCallback = null

  return {
    collection: vi.fn((db, name) => ({ db, name })),
    query: vi.fn((...args) => ({ args })),
    where: vi.fn((field, op, value) => ({ field, op, value })),
    onSnapshot: vi.fn((queryRef, next, error) => {
      nextCallback = next
      errorCallback = error
      return vi.fn()
    }),
    getNextCallback: () => nextCallback,
    getErrorCallback: () => errorCallback,
  }
})

vi.mock('firebase/firestore', () => firestoreState)
vi.mock('../services/firebase', () => ({ db: { id: 'mock-db' } }))

import { useNotifications } from './useNotifications'

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and sorts notifications from newest to oldest', async () => {
    const { result } = renderHook(() => useNotifications('student-1'))

    await waitFor(() => {
      expect(firestoreState.onSnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      firestoreState.getNextCallback()({
        docs: [
          { id: 'n1', data: () => ({ createdAt: { toDate: () => new Date('2026-04-10T10:00:00Z') }, title: 'older' }) },
          { id: 'n2', data: () => ({ createdAt: { toDate: () => new Date('2026-04-11T10:00:00Z') }, title: 'newer' }) },
        ],
      })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('')
    expect(result.current.notifications.map(item => item.notificationId)).toEqual(['n2', 'n1'])
  })

  it('resets state when there is no student id', () => {
    const { result } = renderHook(() => useNotifications(null))

    expect(result.current.notifications).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('handles snapshot errors', async () => {
    const { result } = renderHook(() => useNotifications('student-2'))

    await waitFor(() => {
      expect(firestoreState.onSnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      firestoreState.getErrorCallback()()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('No se pudieron cargar las notificaciones')
    })

    expect(result.current.loading).toBe(false)
  })
})