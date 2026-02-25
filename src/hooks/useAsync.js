import { useState, useCallback } from 'react'

/**
 * Hook para manejar el estado de carga y errores en operaciones async.
 * @returns {{ loading, error, execute }}
 */
export function useAsync() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (asyncFn) => {
    try {
      setLoading(true)
      setError(null)
      return await asyncFn()
    } catch (err) {
      setError(err?.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, execute }
}
