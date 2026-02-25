import { useState, useEffect } from 'react'

/**
 * Hook para leer y escribir en localStorage con sincronización de estado.
 * @param {string} key
 * @param {*} initialValue
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {}
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
