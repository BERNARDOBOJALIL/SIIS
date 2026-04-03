import { useState } from 'react'
import { Button } from '../common'

export default function CancelCitaButton({ cita, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    try {
      await onCancel(cita)
    } catch {
      setError('No se pudo cancelar la cita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button variant="danger" onClick={handleCancel} disabled={loading}>
        {loading ? 'Cancelando...' : 'Cancelar cita'}
      </Button>
    </div>
  )
}
