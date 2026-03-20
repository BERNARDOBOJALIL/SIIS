import { useEffect, useState } from 'react'
import { useAuth } from '../context'
import { Spinner, Button, Input } from '../components/common'
import { Clock, User, CheckCircle, AlertCircle } from 'lucide-react'
import {
  getAcademicos,
  getAcademicoSlots,
  crearCita,
  getPendingCitasForAcademico,
  acceptCita,
  rejectCita,
} from '../services/firestoreService'

export default function AppointmentsPage() {
  const { userData, userRole, authLoading } = useAuth()

  if (authLoading) {
    return (
      <section className="h-full overflow-auto p-6 flex items-center justify-center">
        <Spinner />
      </section>
    )
  }

  return (
    <section className="h-full overflow-auto p-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
        <p className="mt-1 text-sm text-gray-600">
          {userData?.nombre || 'Usuario'} • <span className="font-medium">{userRole || 'Sin rol'}</span>
        </p>

        {userRole === 'ESTUDIANTE' && userData?.uid && (
          <StudentAppointmentsView estudianteId={userData.uid} />
        )}

        {userRole === 'ACADEMICO' && userData?.uid && (
          <AcademicAppointmentsView academicoId={userData.uid} />
        )}

        {!userRole && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">No se pudo determinar tu rol. Contacta a administración.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function StudentAppointmentsView({ estudianteId }) {
  const [step, setStep] = useState('list') // 'list' | 'slots' | 'confirm'
  const [academicos, setAcademicos] = useState([])
  const [selectedAcademico, setSelectedAcademico] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [proposedDateTime, setProposedDateTime] = useState('')
  const [proposedDuration, setProposedDuration] = useState(30)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadAcademicos()
  }, [])

  const loadAcademicos = async () => {
    setLoading(true)
    try {
      const data = await getAcademicos()
      setAcademicos(data)
    } catch (err) {
      setError('Error al cargar académicos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAcademico = async (academico) => {
    setLoading(true)
    setError('')
    try {
      setSelectedAcademico(academico)
      const slotsData = await getAcademicoSlots(academico.uid)
      setSlots(slotsData)
      setStep('slots')
    } catch (err) {
      setError('Error al cargar slots')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    const inicioDate = toDate(slot.inicio)
    const finDate = toDate(slot.fin)

    setProposedDateTime(inicioDate ? toLocalInputValue(inicioDate) : '')
    setProposedDuration(getDefaultDuration(inicioDate, finDate))
    setMotivo('')
    setError('')
    setStep('confirm')
  }

  const handleCreateCita = async (event) => {
    event.preventDefault()
    if (!motivo.trim()) {
      setError('Por favor ingresa el motivo')
      return
    }

    const proposedStart = parseLocalDateTime(proposedDateTime)
    const durationMinutes = Number(proposedDuration)
    const slotStart = toDate(selectedSlot?.inicio)
    const slotEnd = toDate(selectedSlot?.fin)

    if (!proposedStart || !slotStart || !slotEnd) {
      setError('No se pudo validar la hora propuesta para este slot')
      return
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setError('La duración debe ser mayor a 0 minutos')
      return
    }

    const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60000)
    if (proposedStart < slotStart || proposedEnd > slotEnd) {
      setError('La hora y duración propuestas deben estar dentro de la ventana seleccionada')
      return
    }

    setLoading(true)
    setError('')
    try {
      await crearCita({
        estudianteId,
        academicoId: selectedAcademico.uid,
        slotId: selectedSlot.slotId,
        fechaHora: proposedStart,
        motivo,
        duracion: durationMinutes,
      })

      setSuccess('Cita solicitada exitosamente')
      setStep('list')
      setSelectedAcademico(null)
      setSelectedSlot(null)
      setProposedDateTime('')
      setProposedDuration(30)
      setMotivo('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Error al crear cita')
    } finally {
      setLoading(false)
    }
  }

  const toDate = (value) => {
    if (!value) return null
    if (value?.toDate) return value.toDate()
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parseLocalDateTime = (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const toLocalInputValue = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return localDate.toISOString().slice(0, 16)
  }

  const getDefaultDuration = (start, end) => {
    if (!start || !end) return 30
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    if (minutes <= 0) return 30
    return Math.min(minutes, 60)
  }

  const formatDateTime = (value) => {
    const date = toDate(value)
    if (!date) return 'Fecha no disponible'

    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatSlotWindow = (slot) => {
    const start = toDate(slot?.inicio)
    const end = toDate(slot?.fin)
    if (!start || !end) return 'Ventana no disponible'

    const datePart = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(start)

    const startTime = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(start)

    const endTime = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(end)

    return `${datePart} · ${startTime} - ${endTime}`
  }

  return (
    <div className="mt-6">
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {step === 'list' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-900 text-sm mb-4">Selecciona un Académico</h2>

          {loading ? (
            <Spinner />
          ) : academicos.length === 0 ? (
            <p className="text-sm text-blue-700">No hay académicos disponibles</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {academicos.map(academicoItem => (
                <button
                  key={academicoItem.uid}
                  onClick={() => handleSelectAcademico(academicoItem)}
                  className="text-left p-3 bg-white border rounded hover:border-blue-400 transition flex items-center gap-3"
                >
                  <User size={16} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">{academicoItem.nombre}</div>
                    <div className="text-xs text-gray-500">{academicoItem.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'slots' && selectedAcademico && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <button
            onClick={() => setStep('list')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-3"
          >
            ← Volver a académicos
          </button>

          <h2 className="font-semibold text-blue-900 text-sm mb-4">
            Slots disponibles de {selectedAcademico.nombre}
          </h2>

          {loading ? (
            <Spinner />
          ) : slots.length === 0 ? (
            <p className="text-sm text-blue-700">No hay slots disponibles</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3">
              {slots.map(slot => (
                <button
                  key={slot.slotId}
                  onClick={() => handleSelectSlot(slot)}
                  className="text-left p-3 bg-white border rounded hover:border-blue-400 transition flex items-center gap-2"
                >
                  <Clock size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{formatSlotWindow(slot)}</div>
                    <div className="text-xs text-gray-500">Ventana disponible</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && selectedSlot && selectedAcademico && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg">
          <button
            onClick={() => setStep('slots')}
            className="text-sm text-blue-600 hover:text-blue-800 mb-3"
          >
            ← Volver a slots
          </button>

          <h2 className="font-semibold text-blue-900 text-sm mb-4">Confirmar Cita</h2>

          <div className="space-y-3 mb-4">
            <div className="bg-white p-3 rounded text-sm">
              <p className="text-gray-600">Académico</p>
              <p className="font-medium text-gray-900">{selectedAcademico.nombre}</p>
            </div>

            <div className="bg-white p-3 rounded text-sm">
              <p className="text-gray-600">Ventana seleccionada</p>
              <p className="font-medium text-gray-900">{formatSlotWindow(selectedSlot)}</p>
            </div>
          </div>

          <form onSubmit={handleCreateCita} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Fecha y hora propuesta"
                name="fechaHora"
                type="datetime-local"
                value={proposedDateTime}
                onChange={e => setProposedDateTime(e.target.value)}
                required
              />

              <Input
                label="Duración (minutos)"
                name="duracion"
                type="number"
                value={proposedDuration}
                onChange={e => setProposedDuration(e.target.value)}
                required
              />
            </div>

            <Input
              label="Motivo de la Cita"
              name="motivo"
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Consulta sobre trabajo final"
              required
            />

            <Button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="w-full"
            >
              {loading ? 'Creando cita...' : 'Solicitar Cita'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function AcademicAppointmentsView({ academicoId }) {
  const [pendingCitas, setPendingCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadPendingCitas()
  }, [academicoId])

  const loadPendingCitas = async () => {
    setLoading(true)
    try {
      const data = await getPendingCitasForAcademico(academicoId)
      setPendingCitas(data)
    } catch (err) {
      setError('Error al cargar citas')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (citaId, estudianteId) => {
    setProcessingId(citaId)
    try {
      await acceptCita(citaId, estudianteId)
      setPendingCitas(prev => prev.filter(c => c.citaId !== citaId))
    } catch (err) {
      setError('Error al aceptar cita')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (citaId, estudianteId) => {
    setProcessingId(citaId)
    try {
      await rejectCita(citaId, estudianteId)
      setPendingCitas(prev => prev.filter(c => c.citaId !== citaId))
    } catch (err) {
      setError('Error al rechazar cita')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="mt-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="font-semibold text-purple-900 text-sm mb-4">
          Solicitudes de Cita Pendientes ({pendingCitas.length})
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : pendingCitas.length === 0 ? (
          <p className="text-sm text-purple-700">No hay solicitudes pendientes</p>
        ) : (
          <div className="space-y-3">
            {pendingCitas.map(cita => (
              <div key={cita.citaId} className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Estudiante ID</p>
                    <p className="font-mono text-sm text-gray-900">{cita.estudianteId?.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Fecha y Hora</p>
                    <p className="text-sm text-gray-900">{formatDateTime(cita.fechaHora)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Duración</p>
                    <p className="text-sm text-gray-900">{cita.duracion} minutos</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-0.5">Motivo</p>
                  <p className="text-sm text-gray-900">{cita.motivo}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAccept(cita.citaId, cita.estudianteId)}
                    disabled={processingId === cita.citaId}
                    className="flex-1"
                  >
                    {processingId === cita.citaId ? 'Procesando...' : 'Aceptar'}
                  </Button>
                  <Button
                    onClick={() => handleReject(cita.citaId, cita.estudianteId)}
                    disabled={processingId === cita.citaId}
                    variant="danger"
                    className="flex-1"
                  >
                    {processingId === cita.citaId ? 'Procesando...' : 'Rechazar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
