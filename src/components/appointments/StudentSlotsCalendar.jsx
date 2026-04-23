import { DAYS, TIME_BLOCKS, minutesToTime, formatWeekLabel } from './calendarUtils'

const ROW_HEIGHT = 24

function normalizarDia(dia) {
  return dia?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() ?? ''
}

function getClaseEnBloque(blockMinutes, dayIndex, horarioClases) {
  if (!horarioClases) return null
  const DIAS_KEY = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const dia = DIAS_KEY[dayIndex]
  const clases = horarioClases[dia] ?? []
  return clases.find(b => {
    if (!b?.inicio || !b?.fin) return false
    const [hI, mI] = b.inicio.split(':').map(Number)
    const [hF, mF] = b.fin.split(':').map(Number)
    const inicioMin = hI * 60 + mI
    const finMin = hF * 60 + mF
    return blockMinutes >= inicioMin && blockMinutes < finMin
  }) ?? null
}

export default function StudentSlotsCalendar({
  weekStart,
  cellMap,
  onSelectSlot,
  loading,
  hasSlots,
  horarioClases,
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
                const clase = getClaseEnBloque(blockMinutes, dayIndex, horarioClases)

                if (clase) {
                  return (
                    <div
                      key={`${day.key}-${blockMinutes}`}
                      className="border-l border-site-border/50 bg-red-400/80 relative"
                      style={{ height: `${ROW_HEIGHT}px` }}
                      onMouseEnter={e => {
                        const tip = e.currentTarget.querySelector('.tip')
                        if (tip) tip.style.display = 'block'
                      }}
                      onMouseLeave={e => {
                        const tip = e.currentTarget.querySelector('.tip')
                        if (tip) tip.style.display = 'none'
                      }}
                    >
                      <div className="tip" style={{
                        display: 'none',
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#111827',
                        color: '#fff',
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                      }}>
                        {clase.clase && <div style={{ fontWeight: 600 }}>{clase.clase}</div>}
                        {clase.salon && <div style={{ opacity: 0.8 }}>Salón: {clase.salon}</div>}
                      </div>
                    </div>
                  )
                }

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
                    title={hasSlot ? (hasCita ? 'Slot con citas existentes' : 'Slot disponible') : 'Sin slot'}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-2 text-[11px] text-site-muted flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400/80" />Disponible</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300/80" />Con cita existente</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400/80" />Ocupado por clase</span>
      </div>
    </div>
  )
}