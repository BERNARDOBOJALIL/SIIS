import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BellRing,
  CalendarClock,
  ChevronRight,
  CircleCheckBig,
  CircleX,
  ClipboardList,
  UserCircle2,
} from 'lucide-react'
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
  const recentNotifications = useMemo(() => notifications.slice(0, 6), [notifications])

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
    <div className="relative student-dashboard-shell h-full min-h-0">
      <div className="student-dashboard-enter h-full min-h-0 rounded-2xl border border-site-border bg-site-surface p-3 md:p-4 lg:p-5 shadow-[0_12px_30px_rgba(10,10,10,0.05)] flex flex-col">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2 text-primary">
              <UserCircle2 size={18} />
              <h2 className="text-base font-semibold tracking-tight">Dashboard del estudiante</h2>
            </div>
            <p className="text-sm text-site-text mt-2">{studentName || 'Estudiante'}</p>
            <p className="text-xs text-site-muted">{studentEmail || 'Sin correo'}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 w-full lg:w-auto">
            <MetricCard label="Total" value={stats.total} icon={ClipboardList} />
            <MetricCard label="Pendientes" value={stats.pendientes} icon={CalendarClock} className="text-amber-700" />
            <MetricCard label="Confirmadas" value={stats.confirmadas} icon={CircleCheckBig} className="text-green-700" />
            <MetricCard label="Rechazadas" value={stats.rechazadas} icon={CircleX} className="text-red-700" />
          </div>
        </header>

        {citasError && <p className="mt-3 text-xs text-red-600">{citasError}</p>}

        <div className="mt-3 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-3 items-stretch dashboard-main-grid flex-1 min-h-0">
          <section className="min-h-0 relative student-dashboard-panel student-dashboard-panel-calendar">
            <StudentCalendar citas={citas} loading={citasLoading} onCancelCita={cancelCita} />
          </section>

          <aside className="student-dashboard-panel rounded-xl border border-site-border bg-site-bg/60 p-3 md:p-4 overflow-hidden">
            <h3 className="text-base font-semibold text-site-text mb-2 inline-flex items-center gap-2">
              <BellRing size={17} className="text-primary" /> Notificaciones recientes
            </h3>
            <p className="text-xs text-site-muted mb-3">
              Mostrando las 6 actualizaciones mas recientes para mantener el panel limpio.
            </p>

            <div className="max-h-[420px] overflow-y-auto pr-1">
              <NotificationList
                notifications={recentNotifications}
                loading={notificationsLoading}
                error={notificationsError}
              />
            </div>

            {notifications.length > 6 && (
              <p className="mt-3 text-xs text-site-muted inline-flex items-center gap-1">
                Hay {notifications.length - 6} notificaciones adicionales
                <ChevronRight size={12} className="text-primary" />
              </p>
            )}
          </aside>
        </div>
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
    <div className="bg-site-bg border border-site-border rounded-xl px-3 py-2.5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <p className="text-[11px] text-site-muted inline-flex items-center gap-1">
        {Icon && <Icon size={12} className="text-primary" />} {label}
      </p>
      <p className={`text-lg md:text-xl font-semibold text-site-text ${className}`}>{value}</p>
    </div>
  )
}
