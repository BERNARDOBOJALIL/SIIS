import { DAYS, TIME_BLOCKS, minutesToTime, formatWeekLabel } from './calendarUtils'

const ROW_HEIGHT = 24

export default function StudentSlotsCalendar({
  weekStart,
  cellMap,
  onSelectSlot,
  loading,
  hasSlots,
}) {
  if (loading) {
    return <p className="text-sm text-blue-700">Cargando calendario...</p>
  }

  if (!hasSlots) {
    return <p className="text-sm text-blue-700">No hay slots disponibles para esta semana</p>
  }

  return (
    <div>
      <p className="text-xs text-primary mb-2">Semana: {formatWeekLabel(weekStart)}</p>

      <div className="border border-site-border rounded-lg bg-white overflow-hidden">
        <div className="max-h-[560px] overflow-auto">
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] bg-primary/10 border-b border-site-border sticky top-0 z-10">
            <div className="px-1 py-1.5 text-[10px] font-semibold text-primary">Hora</div>
            {DAYS.map(day => (
              <div key={day.key} className="px-1 py-1.5 text-[10px] sm:text-[11px] font-semibold text-primary border-l border-site-border text-center">
                {day.label}
              </div>
            ))}
          </div>

          {TIME_BLOCKS.map((blockMinutes, blockIndex) => (
            <div
              key={blockMinutes}
              className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b border-site-border/50 last:border-b-0"
            >
              <div
                className="px-1 text-[9px] sm:text-[10px] text-site-muted border-r border-site-border/50 select-none leading-none flex items-center"
                style={{ height: `${ROW_HEIGHT}px` }}
              >
                {minutesToTime(blockMinutes)}
              </div>

              {DAYS.map((day, dayIndex) => {
                const cell = cellMap.get(`${dayIndex}-${blockIndex}`)
                const hasSlot = !!cell?.slotIds?.size
                const hasCita = !!cell?.hasCita
                const slotForClick = cell?.slotForClick

                const baseColor = hasSlot
                  ? (hasCita ? 'bg-amber-300/80 hover:bg-amber-400/80' : 'bg-emerald-400/80 hover:bg-emerald-500/80')
                  : 'bg-white'

                return (
                  <button
                    key={`${day.key}-${blockMinutes}`}
                    type="button"
                    disabled={!hasSlot || !slotForClick}
                    onClick={() => onSelectSlot(slotForClick)}
                    className={`border-l border-site-border/50 transition-colors ${baseColor} disabled:cursor-default`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    title={hasSlot ? (hasCita ? 'Slot con citas existentes (aún reservable si hay espacio)' : 'Slot disponible') : 'Sin slot'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
