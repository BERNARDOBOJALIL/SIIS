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
    doc: vi.fn((db, ...path) => ({ db, path })),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-notification' }),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    getNextCallback: () => nextCallback,
    getErrorCallback: () => errorCallback,
    serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
  }
})

vi.mock('firebase/firestore', () => firestoreState)
vi.mock('../services/firebase', () => ({ db: { id: 'mock-db' } }))

import { useStudentCitas } from './useStudentCitas'

describe('useStudentCitas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and sorts citas by date', async () => {
    const { result } = renderHook(() => useStudentCitas('student-1'))

    await waitFor(() => {
      expect(firestoreState.onSnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      firestoreState.getNextCallback()({
        docs: [
          { id: 'c2', data: () => ({ fechaHora: { toDate: () => new Date('2026-04-11T12:00:00Z') }, estado: 'PENDIENTE' }) },
          { id: 'c1', data: () => ({ fechaHora: { toDate: () => new Date('2026-04-10T12:00:00Z') }, estado: 'CONFIRMADA' }) },
        ],
      })
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('')
    expect(result.current.citas.map(item => item.citaId)).toEqual(['c1', 'c2'])
  })

  it('cancels a cita and records a notification', async () => {
    const { result } = renderHook(() => useStudentCitas('student-1'))

    await waitFor(() => {
      expect(firestoreState.onSnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.cancelCita({
        citaId: 'cita-1',
        academicoId: 'acad-1',
        estudianteId: 'student-1',
      })
    })

    expect(firestoreState.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: ['citas', 'cita-1'] }),
      expect.objectContaining({ estado: 'CANCELADA' }),
    )
    expect(firestoreState.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'notificaciones' }),
      expect.objectContaining({
        tipo: 'CANCELACION',
        destino: 'acad-1',
        estudianteId: 'student-1',
        citaId: 'cita-1',
      }),
    )
  })

  it('handles snapshot errors', async () => {
    const { result } = renderHook(() => useStudentCitas('student-2'))

    await waitFor(() => {
      expect(firestoreState.onSnapshot).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      firestoreState.getErrorCallback()()
    })

    await waitFor(() => {
      expect(result.current.error).toBe('No se pudieron cargar tus citas')
    })

    expect(result.current.loading).toBe(false)
  })
})