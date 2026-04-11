import { renderHook, act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  it('reads an existing value from localStorage', () => {
    localStorage.setItem('theme', JSON.stringify('dark'))

    const { result } = renderHook(() => useLocalStorage('theme', 'light'))

    expect(result.current[0]).toBe('dark')
  })

  it('persists updates back to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))

    act(() => {
      result.current[1](3)
    })

    expect(result.current[0]).toBe(3)
    expect(localStorage.getItem('count')).toBe('3')
  })

  it('falls back to the initial value for invalid stored JSON', () => {
    localStorage.setItem('broken', '{invalid')

    const { result } = renderHook(() => useLocalStorage('broken', 'fallback'))

    expect(result.current[0]).toBe('fallback')
  })
})