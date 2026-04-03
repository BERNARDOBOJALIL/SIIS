import { Bell } from 'lucide-react'
import NotificationItem from './NotificationItem'

export default function NotificationList({ notifications, loading, error }) {
  if (loading) {
    return <p className="text-sm text-site-muted">Cargando notificaciones...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!notifications.length) {
    return (
      <div className="min-h-44 flex flex-col items-center justify-center text-center border border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
        <div className="w-12 h-12 rounded-full bg-site-surface border border-primary/20 flex items-center justify-center mb-3">
          <Bell size={20} className="text-primary" />
        </div>
        <p className="text-sm font-medium text-site-text">No hay notificaciones</p>
        <p className="text-xs text-site-muted mt-1">Las nuevas actualizaciones de tus citas aparecerán aquí.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map(notification => (
        <div key={notification.notificationId} className="student-dashboard-enter-item">
          <NotificationItem notification={notification} />
        </div>
      ))}
    </div>
  )
}
