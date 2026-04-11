import { describe, expect, it, vi } from 'vitest'
import { capitalize, formatDate, truncate, uniqueId } from './helpers'

describe('helpers', () => {
  it('formats dates in Spanish locale', () => {
    expect(formatDate(new Date(2026, 3, 11))).toBe('11/04/2026')
  })

  it('capitalizes strings', () => {
    expect(capitalize('hOLA')).toBe('Hola')
    expect(capitalize()).toBe('')
  })

  it('truncates long text', () => {
    expect(truncate('abcdef', 4)).toBe('abcd...')
    expect(truncate('abc', 10)).toBe('abc')
  })

  it('generates an id-like string', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
    expect(uniqueId()).toHaveLength(7)
  })
})