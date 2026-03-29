import { useMemo, useState } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import { DAYS, START_MINUTES, BLOCK_MINUTES, TIME_BLOCKS, startOfWeek, addDays } from '../appointments/calendarUtils'
import CitaBlock from './CitaBlock'
import CitaDetailPanel from './CitaDetailPanel'

const ROW_HEIGHT = 24

function toDate(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 5)
  const startLabel = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(weekStart)
  const endLabel = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(weekEnd)
  return `${startLabel} - ${endLabel}`
}

export default function StudentCalendar({ citas, loading, onCancelCita }) {
  const [selectedCita, setSelectedCita] = useState(null)
  const weekStart = useMemo(() => startOfWeek(new Date()), [])

  const citasInWeek = useMemo(() => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    return citas.filter((cita) => {
      const start = toDate(cita.fechaHora)
      if (!start) return false
      const day = start.getDay()
      const isMonToSat = day >= 1 && day <= 6
      return isMonToSat && start >= weekStart && start < weekEnd
    })
  }, [citas, weekStart])

  const citasByDay = useMemo(() => {
    const map = new Map()
    DAYS.forEach((_, index) => map.set(index, []))

    citasInWeek.forEach((cita) => {
      const start = toDate(cita.fechaHora)
      const end = toDate(cita.fechaFin) || (start ? new Date(start.getTime() + (Number(cita.duracion) || 30) * 60000) : null)
      if (!start || !end || end <= start) return

      const dayIndex = start.getDay() - 1
      if (dayIndex < 0 || dayIndex > 5) return

      const startMinutes = (start.getHours() * 60) + start.getMinutes()
      const endMinutes = (end.getHours() * 60) + end.getMinutes()

      const top = ((startMinutes - START_MINUTES) / BLOCK_MINUTES) * ROW_HEIGHT
      const height = ((endMinutes - startMinutes) / BLOCK_MINUTES) * ROW_HEIGHT

      map.get(dayIndex).push({ cita, top, height })
    })

    return map
  }, [citasInWeek])

  return (
    <div className="bg-site-surface border border-site-border rounded-xl p-2.5 md:p-3 relative overflow-hidden h-full flex flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-site-text text-base inline-flex items-center gap-2">
            <CalendarDays size={17} className="text-primary" /> Mi calendario semanal
          </h3>
          <p className="text-xs text-site-muted mt-1">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="text-[11px] text-site-muted inline-flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-2 py-1">
          <Info size={13} className="text-primary" /> Haz clic en una cita para ver detalle
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] text-site-muted">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" />Pendiente</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600" />Confirmada</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600" />Rechazada</span>
      </div>

      {loading ? (
        <p className="text-sm text-site-muted">Cargando citas...</p>
      ) : citasInWeek.length === 0 ? (
        <div className="rounded-lg border border-dashed border-site-border p-6 text-center">
          <p className="text-sm font-medium text-site-text">No tienes citas esta semana</p>
          <p className="text-xs text-site-muted mt-1">Usa “Agendar nueva cita” para reservar con un académico.</p>
        </div>
      ) : (
        <div className="border border-site-border rounded-lg bg-white overflow-hidden flex-1 min-h-0">
          <div className="h-full min-h-0 overflow-auto">
            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] bg-site-bg border-b border-site-border sticky top-0 z-10">
              <div className="px-1 py-1.5 text-[10px] font-semibold text-site-text">Hora</div>
              {DAYS.map(day => (
                <div key={day.key} className="px-1 py-1.5 text-[10px] sm:text-[11px] font-semibold text-site-text border-l border-site-border text-center">
                  {day.label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))]" style={{ height: `${TIME_BLOCKS.length * ROW_HEIGHT}px` }}>
              <div className="relative border-r border-site-border/60">
                {TIME_BLOCKS.map((blockMinutes, index) => (
                  <div
                    key={blockMinutes}
                    className="absolute left-0 right-0 border-b border-site-border/40 text-[9px] text-site-muted px-1"
                    style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`, lineHeight: `${ROW_HEIGHT}px` }}
                  >
                    {String(Math.floor(blockMinutes / 60)).padStart(2, '0')}:{String(blockMinutes % 60).padStart(2, '0')}
                  </div>
                ))}
              </div>

              {DAYS.map((day, dayIndex) => (
                <div key={day.key} className="relative border-l border-site-border/60">
                  {TIME_BLOCKS.map((blockMinutes, index) => (
                    <div
                      key={`${day.key}-${blockMinutes}`}
                      className="absolute left-0 right-0 border-b border-site-border/40"
                      style={{ top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
                    />
                  ))}

                  {(citasByDay.get(dayIndex) || []).map(({ cita, top, height }) => (
                    <CitaBlock
                      key={cita.citaId}
                      cita={cita}
                      top={top}
                      height={height}
                      onClick={setSelectedCita}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CitaDetailPanel
        isOpen={!!selectedCita}
        cita={selectedCita}
        onClose={() => setSelectedCita(null)}
        onCancelCita={onCancelCita}
      />
    </div>
  )
}
