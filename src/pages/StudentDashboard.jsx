import { useEffect, useMemo, useRef, useState } from 'react'
import { BellRing, CalendarClock, CircleCheckBig, CircleX, ClipboardList, UserCircle2 } from 'lucide-react'
import StudentCalendar from '../components/citas/StudentCalendar'
import NotificationList from '../components/notifications/NotificationList'
import { useNotifications } from '../hooks/useNotifications'
import { useStudentCitas } from '../hooks/useStudentCitas'

function buildStats(citas) {
  return {
    total: citas.length,
    pendientes: citas.filter(c => c.estado === 'PENDIENTE').length,
    confirmadas: citas.filter(c => c.estado === 'CONFIRMADA').length,
    rechazadas: citas.filter(c => c.estado === 'RECHAZADA').length,
  }
}

export default function StudentDashboard({ estudianteId, studentName, studentEmail }) {
  const { notifications, loading: notificationsLoading, error: notificationsError } = useNotifications(estudianteId)
  const { citas, loading: citasLoading, error: citasError, cancelCita } = useStudentCitas(estudianteId)
  const [toasts, setToasts] = useState([])
  const previousStatusesRef = useRef(new Map())

  const stats = useMemo(() => buildStats(citas), [citas])

  useEffect(() => {
    const previousStatuses = previousStatusesRef.current
    const nextStatuses = new Map()
    const nextToasts = []

    citas.forEach((cita) => {
      nextStatuses.set(cita.citaId, cita.estado)
      const previous = previousStatuses.get(cita.citaId)

      if (previous && previous !== cita.estado) {
        nextToasts.push({
          id: `${cita.citaId}-${Date.now()}`,
          message: `Tu cita cambió de ${previous} a ${cita.estado}`,
        })
      }
    })

    previousStatusesRef.current = nextStatuses

    if (nextToasts.length > 0) {
      setToasts(current => [...current, ...nextToasts])
      nextToasts.forEach((toast) => {
        setTimeout(() => {
          setToasts(current => current.filter(item => item.id !== toast.id))
        }, 3500)
      })
    }
  }, [citas])

  return (
    <div className="mt-6 relative">
      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px] gap-4 items-start">
        <aside className="bg-site-surface border border-site-border rounded-xl p-4 md:p-5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-primary">
              <UserCircle2 size={18} />
              <h2 className="text-base font-semibold">Panel del estudiante</h2>
            </div>
            <p className="text-sm text-site-text mt-2">{studentName || 'Estudiante'}</p>
            <p className="text-xs text-site-muted">{studentEmail || 'Sin correo'}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricCard label="Total" value={stats.total} icon={ClipboardList} />
            <MetricCard label="Pendientes" value={stats.pendientes} icon={CalendarClock} className="text-amber-700" />
            <MetricCard label="Confirmadas" value={stats.confirmadas} icon={CircleCheckBig} className="text-green-700" />
            <MetricCard label="Rechazadas" value={stats.rechazadas} icon={CircleX} className="text-red-700" />
          </div>

          {citasError && <p className="mt-3 text-xs text-red-600">{citasError}</p>}
        </aside>

        <section className="min-h-[420px] relative">
          <StudentCalendar citas={citas} loading={citasLoading} onCancelCita={cancelCita} />
        </section>

        <aside className="bg-site-surface border border-site-border rounded-xl p-4 md:p-5 h-full max-h-[740px] overflow-hidden">
          <h3 className="text-base font-semibold text-site-text mb-3 inline-flex items-center gap-2">
            <BellRing size={17} className="text-primary" /> Notificaciones
          </h3>
          <div className="h-[640px] overflow-y-auto pr-1">
            <NotificationList
              notifications={notifications}
              loading={notificationsLoading}
              error={notificationsError}
            />
          </div>
        </aside>
      </div>

      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-primary text-site-white text-sm px-3 py-2 rounded-lg shadow-lg border border-primary-dark/40">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon, className = '' }) {
  return (
    <div className="bg-site-bg border border-site-border rounded-lg p-3">
      <p className="text-[11px] text-site-muted inline-flex items-center gap-1">
        {Icon && <Icon size={12} className="text-primary" />} {label}
      </p>
      <p className={`text-xl font-semibold text-site-text ${className}`}>{value}</p>
    </div>
  )
}
