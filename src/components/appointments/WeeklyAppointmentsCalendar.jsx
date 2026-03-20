import { Button } from '../common'
import {
  DAYS,
  TIME_BLOCKS,
  minutesToTime,
  getRangeBounds,
  formatWeekLabel,
} from './calendarUtils'

export default function WeeklyAppointmentsCalendar({
  mode,
  weeklyEditMode,
  savingBase,
  weekStart,
  drag,
  setupSelectionMap,
  weekSlotMap,
  onOpenSetup,
  onCloseSetup,
  onToggleWeeklyEdit,
  onSaveBase,
  onStartDrag,
  onMoveDrag,
  onFinishDrag,
  onQuickApprove,
  processingId,
}) {
  return (
    <div className="bg-site-surface border border-site-border rounded-xl p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-semibold text-site-text text-base">Calendario semanal</h3>
          <p className="text-xs text-site-muted mt-1">Semana actual: {formatWeekLabel(weekStart)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {mode === 'weekly' ? (
            <Button variant="secondary" onClick={onOpenSetup}>
              Editar horario base
            </Button>
          ) : (
            <Button variant="secondary" onClick={onCloseSetup}>
              Ver semana actual
            </Button>
          )}
          {mode === 'weekly' && (
            <Button
              variant={weeklyEditMode ? 'primary' : 'secondary'}
              onClick={onToggleWeeklyEdit}
            >
              {weeklyEditMode ? 'Finalizar edición semanal' : 'Editar semana actual'}
            </Button>
          )}
          {mode === 'setup' && (
            <Button onClick={onSaveBase} disabled={savingBase}>
              {savingBase ? 'Guardando...' : 'Guardar horario base'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-site-border rounded-lg bg-white">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-[100px_repeat(6,minmax(120px,1fr))] bg-site-bg border-b border-site-border">
            <div className="p-2 text-xs font-semibold text-site-text">Hora</div>
            {DAYS.map(day => (
              <div key={day.key} className="p-2 text-xs font-semibold text-site-text border-l border-site-border">
                {day.label}
              </div>
            ))}
          </div>

          {TIME_BLOCKS.map((blockMinutes, blockIndex) => (
            <div
              key={blockMinutes}
              className="grid grid-cols-[100px_repeat(6,minmax(120px,1fr))] border-b border-site-border/60 last:border-b-0"
              onMouseUp={onFinishDrag}
            >
              <div className="p-2 text-xs text-site-muted border-r border-site-border/60 select-none">
                {minutesToTime(blockMinutes)}
              </div>

              {DAYS.map((day, dayIndex) => {
                const isDraggingThisDay = drag?.dayIndex === dayIndex
                const inDragRange = isDraggingThisDay && (() => {
                  const { start, end } = getRangeBounds(drag)
                  return blockIndex >= start && blockIndex <= end
                })()

                if (mode === 'setup') {
                  const isActive = setupSelectionMap[day.key]?.has(blockIndex)
                  return (
                    <button
                      key={`${day.key}-${blockMinutes}`}
                      type="button"
                      onMouseDown={() => onStartDrag('setup', dayIndex, blockIndex)}
                      onMouseEnter={() => onMoveDrag(dayIndex, blockIndex)}
                      onMouseUp={onFinishDrag}
                      className={`h-8 border-l border-site-border/60 transition-colors ${isActive ? 'bg-blue-500/80' : 'bg-white hover:bg-blue-50'} ${inDragRange ? 'ring-1 ring-blue-300' : ''}`}
                    />
                  )
                }

                const cell = weekSlotMap.get(`${dayIndex}-${blockIndex}`)
                const isConfirmada = !!cell?.citaStatuses?.has('CONFIRMADA')
                const isPendiente = !!cell?.citaStatuses?.has('PENDIENTE')
                const citaLabels = cell?.citaStartLabels || []
                const isEditable = mode === 'weekly' && weeklyEditMode

                let baseColor = 'bg-white'
                if (isConfirmada) {
                  baseColor = 'bg-blue-500/75'
                } else if (isPendiente) {
                  baseColor = 'bg-amber-400/80'
                } else if (isEditable) {
                  baseColor = 'bg-white hover:bg-blue-50'
                }

                const sharedClass = `h-8 border-l border-site-border/60 transition-colors ${baseColor} ${inDragRange ? 'ring-1 ring-emerald-300' : ''}`

                if (!isEditable) {
                  return (
                    <div
                      key={`${day.key}-${blockMinutes}`}
                      title={isConfirmada ? 'Cita CONFIRMADA' : isPendiente ? 'Cita PENDIENTE' : 'Sin cita'}
                      className={`${sharedClass} relative overflow-hidden px-1`}
                    >
                      {citaLabels.length > 0 && (
                        <div className="absolute inset-0 flex flex-col justify-center gap-0.5 py-0.5">
                          {citaLabels.slice(0, 2).map((label, labelIndex) => (
                            <div
                              key={`${label.text}-${labelIndex}`}
                              className={`text-[9px] leading-none font-semibold truncate px-1 py-0.5 rounded flex items-center justify-between gap-1 ${label.isPast ? 'bg-slate-700 text-white' : label.estado === 'CONFIRMADA' ? 'bg-blue-700 text-white' : 'bg-amber-700 text-white'}`}
                            >
                              <span className="truncate">{label.text}</span>
                              {label.estado === 'PENDIENTE' && !label.isPast && (
                                <button
                                  type="button"
                                  onClick={() => onQuickApprove(label.citaId, label.estudianteId)}
                                  disabled={processingId === label.citaId}
                                  className="text-[8px] px-1 py-0.5 rounded bg-white/90 text-amber-800 hover:bg-white disabled:opacity-60"
                                >
                                  {processingId === label.citaId ? '...' : 'Aprobar'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <button
                    key={`${day.key}-${blockMinutes}`}
                    type="button"
                    onMouseDown={() => onStartDrag('weekly', dayIndex, blockIndex)}
                    onMouseEnter={() => onMoveDrag(dayIndex, blockIndex)}
                    onMouseUp={onFinishDrag}
                    title={isConfirmada ? 'Cita CONFIRMADA' : isPendiente ? 'Cita PENDIENTE' : 'Sin cita'}
                    className={`${sharedClass} relative overflow-hidden px-1`}
                  >
                    {citaLabels.length > 0 && (
                      <div className="absolute inset-0 flex flex-col justify-center gap-0.5 py-0.5">
                        {citaLabels.slice(0, 2).map((label, labelIndex) => (
                          <div
                            key={`${label.text}-${labelIndex}`}
                            className={`text-[9px] leading-none font-semibold truncate px-1 py-0.5 rounded ${label.isPast ? 'bg-slate-700 text-white' : label.estado === 'CONFIRMADA' ? 'bg-blue-700 text-white' : 'bg-amber-700 text-white'}`}
                          >
                            {label.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-site-muted flex flex-wrap items-center gap-4">
        {mode === 'setup' ? (
          <>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/80" />Horario base</span>
            <span>Arrastra para agregar o quitar bloques de disponibilidad recurrente</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400/80" />Bloque con cita PENDIENTE</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500/80" />Bloque con cita CONFIRMADA</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-600" />Cita pasada</span>
            <span className="inline-flex items-center gap-1"><span className="font-semibold text-amber-700">PEND</span> Pendiente • <span className="font-semibold text-blue-700">CONF</span> Confirmada • <span className="font-semibold text-slate-700">PASADA</span></span>
            <span>{weeklyEditMode ? 'Modo edición activo para disponibilidad semanal' : 'Calendario centrado en citas; usa “Aprobar” directamente en bloques pendientes'}</span>
          </>
        )}
      </div>
    </div>
  )
}
