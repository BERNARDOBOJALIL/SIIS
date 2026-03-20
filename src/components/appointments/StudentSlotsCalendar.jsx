import { DAYS, TIME_BLOCKS, minutesToTime, formatWeekLabel } from './calendarUtils'

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
      <p className="text-xs text-primary mb-3">Semana: {formatWeekLabel(weekStart)}</p>

      <div className="border border-site-border rounded-lg bg-white overflow-hidden">
        <div>
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] bg-primary/10 border-b border-site-border">
            <div className="px-1 py-2 text-[10px] font-semibold text-primary">Hora</div>
            {DAYS.map(day => (
              <div key={day.key} className="px-1 py-2 text-[10px] sm:text-xs font-semibold text-primary border-l border-site-border text-center">
                {day.label}
              </div>
            ))}
          </div>

          {TIME_BLOCKS.map((blockMinutes, blockIndex) => (
            <div
              key={blockMinutes}
              className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] border-b border-site-border/50 last:border-b-0"
            >
              <div className="px-1 py-1 text-[9px] sm:text-[10px] text-site-muted border-r border-site-border/50 select-none">
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
                    className={`h-6 sm:h-7 border-l border-site-border/50 transition-colors ${baseColor} disabled:cursor-default`}
                    title={hasSlot ? (hasCita ? 'Slot con citas existentes (aún reservable si hay espacio)' : 'Slot disponible') : 'Sin slot'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-600 flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400/80" />Slot disponible</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300/80" />Slot con cita PENDIENTE/CONFIRMADA</span>
        <span>Haz clic en un bloque para proponer tu cita</span>
      </div>
    </div>
  )
}
