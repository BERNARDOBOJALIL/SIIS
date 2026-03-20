const estadoClasses = {
  PENDIENTE: 'bg-amber-500 border-amber-600 text-white',
  CONFIRMADA: 'bg-green-600 border-green-700 text-white',
  RECHAZADA: 'bg-red-600 border-red-700 text-white',
  CANCELADA: 'bg-slate-500 border-slate-600 text-white',
}

function formatTime(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '--:--'
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export default function CitaBlock({ cita, top, height, onClick }) {
  const className = estadoClasses[cita.estado] || 'bg-blue-600 border-blue-700 text-white'

  return (
    <button
      type="button"
      onClick={() => onClick(cita)}
      className={`absolute left-1 right-1 rounded-md border px-2 py-1 text-left shadow-sm hover:brightness-95 transition ${className}`}
      style={{ top: `${top}px`, height: `${Math.max(height, 22)}px` }}
      title={`${cita.estado || 'Cita'} · ${formatTime(cita.fechaHora)} - ${formatTime(cita.fechaFin)}`}
    >
      <p className="text-[9px] font-semibold leading-tight uppercase tracking-wide">{cita.estado || 'CITA'}</p>
      <p className="text-[10px] leading-tight mt-0.5">{formatTime(cita.fechaHora)} - {formatTime(cita.fechaFin)}</p>
    </button>
  )
}
