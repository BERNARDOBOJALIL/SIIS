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
    <div className="h-full min-h-0 bg-site-surface border border-site-border rounded-xl p-3 md:p-4 flex flex-col">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
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

      <div className="flex-1 min-h-0 border border-site-border rounded-lg bg-white overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] bg-site-bg border-b border-site-border sticky top-0 z-10">
            <div className="p-1.5 text-[10px] font-semibold text-site-text">Hora</div>
            {DAYS.map(day => (
              <div key={day.key} className="p-1.5 text-[10px] font-semibold text-site-text border-l border-site-border text-center">
                {day.label}
              </div>
            ))}
          </div>

          <div>
            {TIME_BLOCKS.map((blockMinutes, blockIndex) => (
              <div
                key={blockMinutes}
                className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b border-site-border/60 last:border-b-0"
                onMouseUp={onFinishDrag}
              >
                <div className="px-1 py-1 text-[9px] text-site-muted border-r border-site-border/60 select-none leading-4">
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
                  const setupBackground = isActive ? 'rgba(16, 185, 129, 0.72)' : 'rgba(255, 255, 255, 1)'
                  const setupHoverBackground = isActive ? 'rgba(5, 150, 105, 0.8)' : 'rgba(16, 185, 129, 0.12)'
                  return (
                    <button
                      key={`${day.key}-${blockMinutes}`}
                      type="button"
                      onMouseDown={() => onStartDrag('setup', dayIndex, blockIndex)}
                      onMouseEnter={() => onMoveDrag(dayIndex, blockIndex)}
                      onMouseUp={onFinishDrag}
                      className={`h-8 border-l border-site-border/60 transition-colors ${inDragRange ? 'ring-1 ring-emerald-300' : ''}`}
                      style={{ backgroundColor: setupBackground }}
                      onMouseOver={(event) => {
                        event.currentTarget.style.backgroundColor = setupHoverBackground
                      }}
                      onMouseOut={(event) => {
                        event.currentTarget.style.backgroundColor = setupBackground
                      }}
                    />
                  )
                }

                const cell = weekSlotMap.get(`${dayIndex}-${blockIndex}`)
                const hasSlot = !!cell?.slotIds?.size
                const isConfirmada = !!cell?.citaStatuses?.has('CONFIRMADA')
                const isPendiente = !!cell?.citaStatuses?.has('PENDIENTE')
                const citaLabels = cell?.citaStartLabels || []
                const isEditable = mode === 'weekly' && weeklyEditMode

                let baseColor = 'bg-white'
                if (isConfirmada) {
                  baseColor = 'bg-emerald-500/75'
                } else if (isPendiente) {
                  baseColor = 'bg-amber-400/80'
                } else if (hasSlot) {
                  baseColor = 'bg-emerald-100/90'
                } else if (isEditable) {
                  baseColor = 'bg-white hover:bg-primary/10'
                }

                const sharedClass = `h-8 border-l border-site-border/60 transition-colors ${baseColor} ${inDragRange ? 'ring-1 ring-emerald-300' : ''}`

                if (!isEditable) {
                  return (
                    <div
                      key={`${day.key}-${blockMinutes}`}
                      title={isConfirmada ? 'Cita CONFIRMADA' : isPendiente ? 'Cita PENDIENTE' : hasSlot ? 'Slot disponible' : 'Sin slot'}
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
                              className={`text-[9px] leading-none font-semibold truncate px-1 py-0.5 rounded ${label.isPast ? 'bg-slate-700 text-white' : label.estado === 'CONFIRMADA' ? 'bg-emerald-700 text-white' : 'bg-amber-700 text-white'}`}
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
      </div>

      <div className="mt-2 text-[11px] text-site-muted flex flex-wrap items-center gap-3">
        {mode === 'setup' ? (
          <>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/80" />Horario base</span>
            <span>Arrastra para agregar o quitar bloques de disponibilidad recurrente</span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />Slot disponible</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400/80" />Bloque con cita PENDIENTE</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/80" />Bloque con cita CONFIRMADA</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-600" />Cita pasada</span>
            <span className="inline-flex items-center gap-1"><span className="font-semibold text-amber-700">PEND</span> Pendiente • <span className="font-semibold text-emerald-700">CONF</span> Confirmada • <span className="font-semibold text-slate-700">PASADA</span></span>
            <span>{weeklyEditMode ? 'Modo edición activo para disponibilidad semanal' : 'Calendario centrado en citas; usa “Aprobar” directamente en bloques pendientes'}</span>
          </>
        )}
      </div>
    </div>
  )
}
