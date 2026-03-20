import { Bell, CalendarCheck2, CircleX, MessageSquareText, Send } from 'lucide-react'

function formatDate(value) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const badgeClasses = {
  SOLICITUD: 'bg-amber-100 text-amber-800',
  CONFIRMACION: 'bg-green-100 text-green-800',
  RECHAZO: 'bg-red-100 text-red-800',
  CANCELACION: 'bg-slate-100 text-slate-800',
}

const typeIcons = {
  SOLICITUD: Send,
  CONFIRMACION: CalendarCheck2,
  RECHAZO: CircleX,
  CANCELACION: MessageSquareText,
}

export default function NotificationItem({ notification }) {
  const badgeClass = badgeClasses[notification.tipo] || 'bg-blue-100 text-blue-800'
  const Icon = typeIcons[notification.tipo] || Bell

  return (
    <article className="border border-site-border rounded-lg p-3 bg-site-bg hover:border-primary/40 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 ${badgeClass}`}>
          <Icon size={11} /> {notification.tipo || 'INFO'}
        </span>
        <span className="text-[11px] text-site-muted">
          {formatDate(notification.createdAt || notification.updatedAt)}
        </span>
      </div>
      <p className="text-sm text-site-text mt-2">{notification.mensaje || 'Sin mensaje'}</p>
    </article>
  )
}
