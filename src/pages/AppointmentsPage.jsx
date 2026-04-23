import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context'
import { Spinner, Button, Modal } from '../components/common'
import { User, CheckCircle, AlertCircle, LayoutDashboard, CalendarPlus, Search, ArrowLeft, CalendarClock, Timer, MessageSquareText, Info } from 'lucide-react'
import WeeklyAppointmentsCalendar from '../components/appointments/WeeklyAppointmentsCalendar'
import PendingCitasSection from '../components/appointments/PendingCitasSection'
import StudentSlotsCalendar from '../components/appointments/StudentSlotsCalendar'
import StudentDashboard from './StudentDashboard'
import {
  DAYS,
  TIME_BLOCKS,
  START_MINUTES,
  BLOCK_MINUTES,
  getEmptyHorarios,
  toDateValue,
  isSameWeekday,
  buildDateForCell,
  dateToBlockIndex,
  dayRangesToSet,
  setToDayRanges,
  getRangeBounds,
  startOfWeek,
} from '../components/appointments/calendarUtils'
import {
  getAcademicos,
  getAcademicoSlots,
  crearCita,
  getPendingCitasForAcademico,
  acceptCita,
  rejectCita,
  getHorariosBase,
  saveHorariosBase,
  ensureWeeklySlotsGenerated,
  syncWeeklySlotsFromBase,
  getAcademicoWeekSlots,
  createOneTimeSlot,
  deleteWeekSlot,
  getAcademicoWeekCitas,
  getHorarioPersonal,
} from '../services/firestoreService'

export default function AppointmentsPage() {
  const { userData, userRole, authLoading } = useAuth()
  const isStudentDashboard = userRole === 'ESTUDIANTE'
  const isAcademicDashboard = userRole === 'ACADEMICO'
  const isFullHeightMode = isStudentDashboard || isAcademicDashboard
  const roleLabel = formatRoleLabel(userRole)

  if (authLoading) {
    return (
      <section className="h-full overflow-auto p-6 flex items-center justify-center">
        <Spinner />
      </section>
    )
  }

  return (
    <section className={`h-full ${isFullHeightMode ? 'overflow-hidden p-4 md:p-5' : 'overflow-auto p-6'}`}>
      <div className={isFullHeightMode ? 'w-full h-full flex flex-col' : 'w-full'}>
        {!isFullHeightMode && (
          <header className="rounded-2xl border border-site-border bg-site-surface px-4 py-4 md:px-5 md:py-5 shadow-[0_10px_24px_rgba(17,17,17,0.04)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-site-text tracking-tight">
                  Centro de Citas
                </h1>
                <p className="mt-1 text-sm text-site-muted">
                  Gestiona tus reuniones en un solo lugar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {roleLabel}
                </span>
                <span className="inline-flex items-center rounded-full border border-site-border bg-site-bg px-3 py-1 text-xs font-medium text-site-text">
                  {userData?.nombre || 'Usuario'}
                </span>
              </div>
            </div>
          </header>
        )}

        {userRole === 'ESTUDIANTE' && userData?.uid && (
          <StudentWorkspace
            estudianteId={userData.uid}
            studentName={userData?.nombre}
            studentEmail={userData?.email}
          />
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

function formatRoleLabel(role) {
  if (!role) return 'Sin rol'

  const normalized = role.toString().toLowerCase()
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

function StudentWorkspace({ estudianteId, studentName, studentEmail }) {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'book'

  return (
    <div className="mt-2 flex-1 min-h-0 flex flex-col gap-3">
      <div className="bg-site-surface border border-site-border rounded-xl p-2 flex flex-wrap items-center gap-2">
        <Button
          variant={view === 'dashboard' ? 'primary' : 'secondary'}
          onClick={() => setView('dashboard')}
          className="inline-flex items-center gap-2"
        >
          <LayoutDashboard size={16} /> Mi dashboard
        </Button>
        <Button
          variant={view === 'book' ? 'primary' : 'secondary'}
          onClick={() => setView('book')}
          className="inline-flex items-center gap-2"
        >
          <CalendarPlus size={16} /> Agendar nueva cita
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'dashboard' ? (
          <StudentDashboard
            estudianteId={estudianteId}
            studentName={studentName}
            studentEmail={studentEmail}
          />
        ) : (
          <StudentAppointmentsView estudianteId={estudianteId} />
        )}
      </div>
    </div>
  )
}

function StudentAppointmentsView({ estudianteId }) {
  const [step, setStep] = useState('list') // 'list' | 'calendar'
  const [academicos, setAcademicos] = useState([])
  const [selectedAcademico, setSelectedAcademico] = useState(null)
  const [slots, setSlots] = useState([])
  const [weekCitas, setWeekCitas] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [proposedDateTime, setProposedDateTime] = useState('')
  const [proposedDuration, setProposedDuration] = useState(30)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [weekStart] = useState(() => startOfWeek(new Date()))
  const [academicoSearch, setAcademicoSearch] = useState('')
  const [showCalendarHelp, setShowCalendarHelp] = useState(false)
  const [horarioClasesAcademico, setHorarioClasesAcademico] = useState(null)

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

  const refreshCalendarData = async (academicoId) => {
    const [slotsData, citasData] = await Promise.all([
      getAcademicoSlots(academicoId),
      getAcademicoWeekCitas(academicoId, weekStart),
    ])

    setSlots(slotsData)
    setWeekCitas(citasData)
  }

  const handleSelectAcademico = async (academico) => {
  setLoading(true)
  setError('')
  try {
    setSelectedAcademico(academico)
    const [_, horarioData] = await Promise.all([
      refreshCalendarData(academico.uid),
      getHorarioPersonal(academico.uid),
    ])
    setHorarioClasesAcademico(horarioData)
    setStep('calendar')
  } catch (err) {
    setError('Error al cargar calendario de disponibilidad')
  } finally {
    setLoading(false)
  }
}

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot)
    const inicioDate = toDate(slot.inicio)

    setProposedDateTime(inicioDate ? toLocalInputValue(inicioDate) : '')
    setProposedDuration(getDefaultDuration(inicioDate, toDate(slot.fin)))
    setMotivo('')
    setError('')
    setIsBookingOpen(true)
  }

  const closeBookingModal = () => {
    setIsBookingOpen(false)
    setSelectedSlot(null)
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
      closeBookingModal()
      setProposedDateTime('')
      setProposedDuration(30)
      setMotivo('')
      await refreshCalendarData(selectedAcademico.uid)
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

    return `${datePart}, ${startTime} - ${endTime}`
  }

  const filteredAcademicos = useMemo(() => {
    const search = academicoSearch.trim().toLowerCase()
    if (!search) return academicos

    return academicos.filter((academico) => {
      const name = academico.nombre?.toLowerCase() || ''
      const email = academico.email?.toLowerCase() || ''
      return name.includes(search) || email.includes(search)
    })
  }, [academicos, academicoSearch])

  const weekSlots = useMemo(() => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    return slots.filter((slot) => {
      const start = toDate(slot.inicio)
      if (!start) return false
      const day = start.getDay()
      const isMonToSat = day >= 1 && day <= 6
      return isMonToSat && start >= weekStart && start < weekEnd
    })
  }, [slots, weekStart])

  const calendarCellMap = useMemo(() => {
    const map = new Map()

    weekSlots.forEach((slot) => {
      const start = toDate(slot.inicio)
      const end = toDate(slot.fin)
      if (!start || !end || end <= start) return

      const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1
      if (dayIndex < 0 || dayIndex >= DAYS.length) return

      const startIdx = Math.max(0, dateToBlockIndex(start))
      const endIdx = Math.min(
        TIME_BLOCKS.length,
        Math.ceil((((end.getHours() * 60) + end.getMinutes()) - START_MINUTES) / BLOCK_MINUTES),
      )

      for (let idx = startIdx; idx < endIdx; idx += 1) {
        const key = `${dayIndex}-${idx}`
        const current = map.get(key) || { slotIds: new Set(), hasCita: false, slotForClick: null }
        current.slotIds.add(slot.slotId)
        current.slotForClick = current.slotForClick || slot
        map.set(key, current)
      }
    })

    weekCitas
      .filter(cita => cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA')
      .forEach((cita) => {
        const start = toDate(cita.fechaHora)
        const end = toDate(cita.fechaFin) || (start ? new Date(start.getTime() + (Number(cita.duracion) || 30) * 60000) : null)
        if (!start || !end || end <= start) return

        const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1
        if (dayIndex < 0 || dayIndex >= DAYS.length) return

        const startIdx = Math.max(0, dateToBlockIndex(start))
        const endIdx = Math.min(
          TIME_BLOCKS.length,
          Math.ceil((((end.getHours() * 60) + end.getMinutes()) - START_MINUTES) / BLOCK_MINUTES),
        )

        for (let idx = startIdx; idx < endIdx; idx += 1) {
          const key = `${dayIndex}-${idx}`
          const current = map.get(key)
          if (current?.slotIds?.size) {
            current.hasCita = true
            map.set(key, current)
          }
        }
      })

    return map
  }, [weekSlots, weekCitas])

  const selectedSlotStart = toDate(selectedSlot?.inicio)
  const selectedSlotEnd = toDate(selectedSlot?.fin)
  const proposedStart = parseLocalDateTime(proposedDateTime)
  const durationMinutes = Number(proposedDuration)
  const proposedEnd = proposedStart && Number.isFinite(durationMinutes)
    ? new Date(proposedStart.getTime() + durationMinutes * 60000)
    : null

  const isBookingFormValid = Boolean(
    selectedSlotStart
    && selectedSlotEnd
    && proposedStart
    && Number.isFinite(durationMinutes)
    && durationMinutes > 0
    && proposedStart >= selectedSlotStart
    && proposedEnd
    && proposedEnd <= selectedSlotEnd
    && motivo.trim(),
  )

  return (
    <div className="mt-3 h-full min-h-0">
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
        <div className="bg-site-surface border border-site-border rounded-xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-site-text text-base">Agendar nueva cita</h2>
              <p className="text-xs text-site-muted mt-1">Selecciona un académico para ver su disponibilidad semanal.</p>
            </div>
            <div className="text-xs text-site-muted inline-flex items-center gap-2 px-2 py-1 rounded-md border border-primary/20 bg-primary/5">
              <CalendarClock size={13} className="text-primary" /> Flujo guiado
            </div>
          </div>

          <div className="mb-4 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-site-muted" />
            <input
              type="text"
              value={academicoSearch}
              onChange={e => setAcademicoSearch(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="w-full border border-site-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {loading ? (
            <Spinner />
          ) : academicos.length === 0 ? (
            <p className="text-sm text-site-muted">No hay académicos disponibles</p>
          ) : filteredAcademicos.length === 0 ? (
            <p className="text-sm text-site-muted">No hay resultados para tu búsqueda</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAcademicos.map(academicoItem => (
                <button
                  key={academicoItem.uid}
                  onClick={() => handleSelectAcademico(academicoItem)}
                  className="text-left p-4 bg-site-bg border border-site-border rounded-lg hover:border-primary/50 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <User size={16} className="text-primary flex-shrink-0" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-site-text">{academicoItem.nombre}</div>
                      <div className="text-xs text-site-muted">{academicoItem.email}</div>
                    </div>
                  </div>
                  <p className="text-xs text-primary mt-3 font-medium">Ver disponibilidad →</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'calendar' && selectedAcademico && (
        <div className="bg-site-surface border border-site-border rounded-xl p-3 md:p-4 relative">
          <button
            onClick={() => setStep('list')}
            className="text-xs text-primary hover:text-primary-dark mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeft size={15} /> Volver a académicos
          </button>

          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-site-text text-sm">
              Disponibilidad semanal de {selectedAcademico.nombre}
            </h2>
            <button
              type="button"
              onClick={() => setShowCalendarHelp(prev => !prev)}
              className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary hover:bg-primary/10 transition-colors"
            >
              <Info size={12} /> Ayuda
            </button>
          </div>

          {showCalendarHelp && (
            <div className="absolute right-3 top-20 z-20 w-[280px] rounded-lg border border-primary/20 bg-site-surface shadow-lg p-3">
              <p className="text-[11px] font-semibold text-site-text mb-1">Como seleccionar</p>
              <p className="text-[11px] text-site-muted">Haz clic en un bloque verde o ambar para abrir el formulario y proponer hora y duracion.</p>
            </div>
          )}

          <StudentSlotsCalendar
            weekStart={weekStart}
            cellMap={calendarCellMap}
            onSelectSlot={handleSelectSlot}
            loading={loading}
            hasSlots={weekSlots.length > 0}
            horarioClases={horarioClasesAcademico}
          />
        </div>
      )}

      <Modal
        isOpen={isBookingOpen && !!selectedSlot && !!selectedAcademico}
        onClose={closeBookingModal}
        title="Solicitar cita"
      >
        {selectedSlot && (
          <form onSubmit={handleCreateCita} className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
              <p className="text-primary inline-flex items-center gap-1"><CalendarClock size={14} /> Ventana disponible</p>
              <p className="font-medium text-site-text mt-0.5">{formatSlotWindow(selectedSlot)}</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="student-fecha-hora" className="text-sm font-medium text-site-text inline-flex items-center gap-1">
                <CalendarClock size={14} className="text-primary" />
                Hora de inicio
              </label>
              <input
                id="student-fecha-hora"
                type="datetime-local"
                value={proposedDateTime}
                min={selectedSlotStart ? toLocalInputValue(selectedSlotStart) : undefined}
                max={selectedSlotEnd ? toLocalInputValue(selectedSlotEnd) : undefined}
                onChange={e => setProposedDateTime(e.target.value)}
                required
                className="border border-site-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="student-duracion" className="text-sm font-medium text-site-text inline-flex items-center gap-1">
                <Timer size={14} className="text-primary" />
                Duración (minutos)
              </label>
              <input
                id="student-duracion"
                type="number"
                value={proposedDuration}
                min={15}
                step={15}
                onChange={e => setProposedDuration(e.target.value)}
                required
                className="border border-site-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="student-motivo" className="text-sm font-medium text-site-text inline-flex items-center gap-1">
                <MessageSquareText size={14} className="text-primary" />
                Motivo
              </label>
              <textarea
                id="student-motivo"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Consulta sobre trabajo final"
                required
                className="border border-site-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-24"
              />
            </div>

            {!isBookingFormValid && (
              <p className="text-xs text-red-600">
                Verifica que la hora de inicio y la duración estén dentro de la ventana del slot.
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeBookingModal}>Cancelar</Button>
              <Button type="submit" disabled={loading || !isBookingFormValid}>
                {loading ? 'Creando cita...' : 'Solicitar cita'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function AcademicAppointmentsView({ academicoId }) {
  const [mode, setMode] = useState('weekly')
  const [weekStart] = useState(() => startOfWeek(new Date()))
  const [horariosDraft, setHorariosDraft] = useState(getEmptyHorarios())
  const [weekSlots, setWeekSlots] = useState([])
  const [weekCitas, setWeekCitas] = useState([])
  const [pendingCitas, setPendingCitas] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [savingBase, setSavingBase] = useState(false)
  const [weeklyEditMode, setWeeklyEditMode] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [drag, setDrag] = useState(null)
  const [horarioClases, setHorarioClases] = useState(null)

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  const refreshPendingCitas = async () => {
    const data = await getPendingCitasForAcademico(academicoId)
    setPendingCitas(data)
  }

  const refreshWeekData = async () => {
    const [slotsData, citasData] = await Promise.all([
      getAcademicoWeekSlots(academicoId, weekStart),
      getAcademicoWeekCitas(academicoId, weekStart),
    ])
    setWeekSlots(slotsData)
    setWeekCitas(citasData)
  }

  useEffect(() => {
    const loadDashboard = async () => {
      setLoadingDashboard(true)
      clearMessages()

      try {
        const horarioData = await getHorariosBase(academicoId)
const horarioClasesData = await getHorarioPersonal(academicoId)
console.log('horarioClasesData:', horarioClasesData)
setHorarioClases(horarioClasesData)
        const normalized = {
          ...getEmptyHorarios(),
          ...horarioData,
        }
        setHorariosDraft(normalized)

        const hasHorarioBase = DAYS.some(day => Array.isArray(normalized[day.key]) && normalized[day.key].length > 0)
        await ensureWeeklySlotsGenerated(academicoId, weekStart)

        await Promise.all([
          refreshPendingCitas(),
          refreshWeekData(),
        ])

        if (!hasHorarioBase) {
          setError('Aún no tienes horario base configurado. Puedes editarlo sin salir de esta vista.')
        }
      } catch (err) {
        setError('No se pudo cargar el dashboard de citas')
      } finally {
        setLoadingDashboard(false)
      }
    }

    loadDashboard()
  }, [academicoId, weekStart])

  const setupSelectionMap = useMemo(() => {
    const map = {}
    DAYS.forEach((day) => {
      map[day.key] = dayRangesToSet(horariosDraft[day.key])
    })
    return map
  }, [horariosDraft])

  const weekSlotMap = useMemo(() => {
    const map = new Map()

    weekSlots.forEach((slot) => {
      const start = toDateValue(slot.inicio)
      const end = toDateValue(slot.fin)
      if (!start || !end || end <= start) return

      const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1
      if (dayIndex < 0 || dayIndex >= DAYS.length) return

      const startIdx = Math.max(0, dateToBlockIndex(start))
      const endIdx = Math.min(TIME_BLOCKS.length, Math.ceil(((end.getHours() * 60) + end.getMinutes() - START_MINUTES) / BLOCK_MINUTES))

      for (let idx = startIdx; idx < endIdx; idx += 1) {
        const key = `${dayIndex}-${idx}`
        const current = map.get(key) || { slotIds: new Set(), citaStatuses: new Set(), citaStartLabels: [] }
        current.slotIds.add(slot.slotId)
        map.set(key, current)
      }
    })

    weekCitas.forEach((cita) => {
      const start = toDateValue(cita.fechaHora)
      const endFromField = toDateValue(cita.fechaFin)
      const duration = Number(cita.duracion) || 30
      const end = endFromField || (start ? new Date(start.getTime() + duration * 60000) : null)

      if (!start || !end || end <= start) return

      for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex += 1) {
        if (!isSameWeekday(start, dayIndex)) continue

        const startIdx = Math.max(0, dateToBlockIndex(start))
        const endIdx = Math.min(TIME_BLOCKS.length, Math.ceil(((end.getHours() * 60) + end.getMinutes() - START_MINUTES) / BLOCK_MINUTES))

        const now = new Date()
        const isPast = end < now
        const startLabel = `${isPast ? 'PASADA' : cita.estado} · ${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(start)}-${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(end)}`

        for (let idx = startIdx; idx < endIdx; idx += 1) {
          const key = `${dayIndex}-${idx}`
          const current = map.get(key) || { slotIds: new Set(), citaStatuses: new Set(), citaStartLabels: [] }
          if (cita.estado) {
            current.citaStatuses.add(cita.estado)
          }
          if (idx === startIdx) {
            current.citaStartLabels.push({
              text: startLabel,
              estado: cita.estado,
              citaId: cita.citaId,
              estudianteId: cita.estudianteId,
              isPast,
            })
          }
          map.set(key, current)
        }
      }
    })

    console.log('horarioClases:', horarioClases)
console.log('DAYS:', DAYS)

    if (horarioClases) {
  const DIAS_KEY = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  DAYS.forEach((day, dayIndex) => {
    const clases = horarioClases[DIAS_KEY[dayIndex]] ?? []
    clases.forEach(clase => {
      if (!clase?.inicio || !clase?.fin) return
      const [hI, mI] = clase.inicio.split(':').map(Number)
      const [hF, mF] = clase.fin.split(':').map(Number)
      const inicioMin = hI * 60 + mI
      const finMin = hF * 60 + mF
      const startIdx = Math.max(0, Math.floor((inicioMin - START_MINUTES) / BLOCK_MINUTES))
      const endIdx = Math.min(TIME_BLOCKS.length, Math.ceil((finMin - START_MINUTES) / BLOCK_MINUTES))
      for (let idx = startIdx; idx < endIdx; idx++) {
        const key = `${dayIndex}-${idx}`
        const current = map.get(key) || { slotIds: new Set(), citaStatuses: new Set(), citaStartLabels: [] }
        current.tieneClase = true
        current.nombreClase = clase.clase ?? 'Clase'
        current.salonClase = clase.salon ?? null
        map.set(key, current)
      }
    })
  })
}
    return map
  }, [weekSlots, weekCitas, horarioClases])

  const handleStartDrag = (context, dayIndex, blockIndex) => {
    if (loadingDashboard || savingBase) return
    if (context === 'weekly' && !weeklyEditMode) return

    clearMessages()
    const dayKey = DAYS[dayIndex].key

    if (context === 'setup') {
      const isSelected = setupSelectionMap[dayKey]?.has(blockIndex)
      setDrag({
        context,
        dayIndex,
        startIndex: blockIndex,
        currentIndex: blockIndex,
        action: isSelected ? 'remove' : 'add',
      })
      return
    }

    const cell = weekSlotMap.get(`${dayIndex}-${blockIndex}`)
    const hasSlot = !!cell?.slotIds?.size
    const hasBlockingCita = cell?.citaStatuses?.has('PENDIENTE') || cell?.citaStatuses?.has('CONFIRMADA')
    if (hasSlot && hasBlockingCita) {
      setError('No puedes eliminar bloques con citas PENDIENTE o CONFIRMADA')
      return
    }

    setDrag({
      context,
      dayIndex,
      startIndex: blockIndex,
      currentIndex: blockIndex,
      action: hasSlot ? 'delete' : 'add',
    })
  }

  const handleMoveDrag = (dayIndex, blockIndex) => {
    setDrag((current) => {
      if (!current) return current
      if (current.dayIndex !== dayIndex) return current
      return {
        ...current,
        currentIndex: blockIndex,
      }
    })
  }

  const finishDrag = async () => {
    if (!drag) return

    const dragState = drag
    setDrag(null)

    const { dayIndex, action, context } = dragState
    const dayKey = DAYS[dayIndex].key
    const { start, end } = getRangeBounds(dragState)

    if (context === 'setup') {
      const currentSet = new Set(setupSelectionMap[dayKey] || [])
      for (let idx = start; idx <= end; idx += 1) {
        if (action === 'add') currentSet.add(idx)
        if (action === 'remove') currentSet.delete(idx)
      }

      setHorariosDraft(prev => ({
        ...prev,
        [dayKey]: setToDayRanges(currentSet),
      }))
      return
    }

    try {
      if (action === 'add') {
        const inicio = buildDateForCell(weekStart, dayIndex, start)
        const fin = buildDateForCell(weekStart, dayIndex, end + 1)
        await createOneTimeSlot(academicoId, { inicio, fin })
        setSuccess('Slot adicional creado para esta semana')
      }

      if (action === 'delete') {
        const selectedStart = buildDateForCell(weekStart, dayIndex, start)
        const selectedEnd = buildDateForCell(weekStart, dayIndex, end + 1)

        const overlapped = weekSlots.filter((slot) => {
          const slotStart = toDateValue(slot.inicio)
          const slotEnd = toDateValue(slot.fin)
          if (!slotStart || !slotEnd) return false
          if (!isSameWeekday(slotStart, dayIndex)) return false
          return slotStart < selectedEnd && slotEnd > selectedStart
        })

        const blockedByCita = overlapped.some((slot) => {
          const slotStart = toDateValue(slot.inicio)
          const slotEnd = toDateValue(slot.fin)
          return weekCitas.some((cita) => {
            const citaStart = toDateValue(cita.fechaHora)
            const citaEndFromField = toDateValue(cita.fechaFin)
            const citaDuration = Number(cita.duracion) || 30
            const citaEnd = citaEndFromField || (citaStart ? new Date(citaStart.getTime() + citaDuration * 60000) : null)
            if (!slotStart || !slotEnd || !citaStart || !citaEnd) return false
            return citaStart < slotEnd && citaEnd > slotStart
          })
        })

        if (blockedByCita) {
          setError('No puedes eliminar un slot que contiene citas PENDIENTE o CONFIRMADA')
          return
        }

        await Promise.all(overlapped.map(slot => deleteWeekSlot(academicoId, slot.slotId)))
        setSuccess(overlapped.length > 0 ? 'Slot semanal eliminado' : 'No se encontraron slots para eliminar')
      }

      await refreshWeekData()
    } catch (err) {
      setError('No se pudo actualizar el calendario semanal')
    }
  }

  const handleSaveBase = async () => {
    setSavingBase(true)
    clearMessages()
    try {
      await saveHorariosBase(academicoId, horariosDraft)
      const syncResult = await syncWeeklySlotsFromBase(academicoId, weekStart, horarioClases)
      await refreshWeekData()
      setSuccess(`Horario base actualizado. Semana sincronizada: ${syncResult.created} bloque(s) creados, ${syncResult.deleted} bloque(s) eliminados.`)
      setMode('weekly')
      setWeeklyEditMode(false)
    } catch (err) {
      setError('No se pudo guardar el horario base')
    } finally {
      setSavingBase(false)
    }
  }

  const handleAccept = async (citaId, estudianteId) => {
    setProcessingId(citaId)
    try {
      await acceptCita(citaId, estudianteId)
      setPendingCitas(prev => prev.filter(c => c.citaId !== citaId))
      await refreshWeekData()
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
      await refreshWeekData()
    } catch (err) {
      setError('Error al rechazar cita')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDateTime = (timestamp) => {
    const date = toDateValue(timestamp)
    if (!date) return 'Fecha no disponible'
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loadingDashboard) {
    return (
      <div className="mt-4 flex-1 p-6 bg-site-surface border border-site-border rounded-xl flex justify-center items-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mt-2 flex-1 min-h-0 flex flex-col gap-4 academic-dashboard-enter">
      {(error || success) && (
        <div className="space-y-2">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
          {success && <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">{success}</div>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 flex-1 min-h-0">
        <section className="academic-dashboard-panel bg-site-surface border border-site-border rounded-2xl p-3 md:p-4 min-h-0 flex flex-col shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-site-text">Agenda académica semanal</h2>
              <p className="text-xs text-site-muted mt-0.5">Gestiona disponibilidad y confirma solicitudes sin salir de esta vista.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">
              <AlertCircle size={14} />
              {pendingCitas.length} pendiente{pendingCitas.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <WeeklyAppointmentsCalendar
              mode={mode}
              weeklyEditMode={weeklyEditMode}
              savingBase={savingBase}
              weekStart={weekStart}
              drag={drag}
              setupSelectionMap={setupSelectionMap}
              weekSlotMap={weekSlotMap}
              processingId={processingId}
              onOpenSetup={() => { clearMessages(); setMode('setup'); setWeeklyEditMode(false) }}
              onCloseSetup={() => { clearMessages(); setMode('weekly'); setWeeklyEditMode(false) }}
              onToggleWeeklyEdit={() => setWeeklyEditMode(prev => !prev)}
              onSaveBase={handleSaveBase}
              onStartDrag={handleStartDrag}
              onMoveDrag={handleMoveDrag}
              onFinishDrag={finishDrag}
              onQuickApprove={handleAccept}
            />
          </div>
        </section>

        <aside className="academic-dashboard-panel bg-site-surface border border-site-border rounded-2xl p-3 md:p-4 min-h-0 flex flex-col shadow-[0_10px_28px_rgba(17,17,17,0.05)]">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-site-text">Solicitudes pendientes</h3>
            <p className="text-xs text-site-muted mt-1">Aprobar o rechazar en un flujo rapido.</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <PendingCitasSection
              pendingCitas={pendingCitas}
              processingId={processingId}
              onAccept={handleAccept}
              onReject={handleReject}
              formatDateTime={formatDateTime}
              compact
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
