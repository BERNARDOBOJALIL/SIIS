import { useState, useEffect } from 'react'
import {
  School, CheckCircle2, XCircle, Clock3, CalendarDays,
  MapPin, FlaskConical, Users, BookOpen, Settings,
  Circle,
} from 'lucide-react'

/* ── Datos de demo ── */
const SALONES = [
  { id: 'A-101', nombre: 'Aula 101',       tipo: 'aula',   disponible: true  },
  { id: 'A-102', nombre: 'Aula 102',       tipo: 'aula',   disponible: false },
  { id: 'A-103', nombre: 'Aula 103',       tipo: 'aula',   disponible: true  },
  { id: 'A-104', nombre: 'Aula 104',       tipo: 'aula',   disponible: false },
  { id: 'B-201', nombre: 'Lab. Cómputo',   tipo: 'lab',    disponible: true  },
  { id: 'B-202', nombre: 'Lab. Física',    tipo: 'lab',    disponible: false },
  { id: 'C-301', nombre: 'Sala Juntas',    tipo: 'sala',   disponible: true  },
]

const LEYENDA = [
  { color: '#22c55e', label: 'Disponible',     Icon: CheckCircle2 },
  { color: '#ef4444', label: 'Ocupado',         Icon: XCircle      },
  { color: '#3b82f6', label: 'Administrativo',  Icon: Settings     },
  { color: '#f59e0b', label: 'Mantenimiento',   Icon: Settings     },
  { color: '#8b5cf6', label: 'Evento',          Icon: Users        },
  { color: '#94a3b8', label: 'Sin asignar',     Icon: Circle       },
]

const TIPO_ICON = {
  aula:  BookOpen,
  lab:   FlaskConical,
  sala:  Users,
}

const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio',
                'agosto','septiembre','octubre','noviembre','diciembre']

function useDateTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  return now
}

export default function RightPanel() {
  const now   = useDateTime()
  const hh    = String(now.getHours()).padStart(2,'0')
  const mm    = String(now.getMinutes()).padStart(2,'0')
  const ss    = String(now.getSeconds()).padStart(2,'0')
  const day   = DAYS[now.getDay()]
  const date  = `${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`
  const libres = SALONES.filter(s => s.disponible).length

  return (
    <aside
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background:  'var(--color-site-white)',
        borderLeft:  '1px solid var(--color-border)',
      }}
    >
      {/* ── Logo + Reloj ─────────────────────────────── */}
      <div
        className="flex flex-col items-center gap-2 py-5 px-4 shrink-0"
        style={{
          background:    'var(--color-site-white)',
          borderBottom:  '2px solid var(--color-primary)',
        }}
      >
        {/* Logo IDIT */}
        <img
          src="/logo_idit.png"
          alt="IDIT"
          className="h-14 w-auto object-contain"
        />

        {/* Reloj */}
        <div className="mt-1 flex items-baseline gap-0.5 tabular-nums select-none">
          <span className="text-[36px] font-bold leading-none tracking-tight"
            style={{ color: 'var(--color-site-black)' }}>
            {hh}<span className="animate-pulse opacity-70">:</span>{mm}
          </span>
          <span className="text-[18px] font-medium ml-1"
            style={{ color: 'var(--color-text-muted)' }}>
            {ss}
          </span>
        </div>

        {/* Fecha */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <CalendarDays size={12} style={{ color: 'var(--color-text-muted)' }} />
          <div className="text-center leading-tight">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
              {day}
            </span>
            <span className="text-[11px] ml-1" style={{ color: 'var(--color-text-muted)' }}>
              {date}
            </span>
          </div>
        </div>
      </div>

      {/* ── Disponibilidad ─────────────────────────────── */}
      <section className="px-3.5 pt-4 pb-3 shrink-0">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <School size={14} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-site-black)' }}>
              Disponibilidad
            </h2>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            {libres}/{SALONES.length}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1.5 rounded-full mb-3 overflow-hidden"
          style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${Math.round((libres/SALONES.length)*100)}%`,
              background: 'var(--color-primary)',
            }}
          />
        </div>

        {/* Lista de salones */}
        <div className="flex flex-col gap-1.5">
          {SALONES.map(salon => {
            const TipoIcon = TIPO_ICON[salon.tipo] || BookOpen
            return (
              <div
                key={salon.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-default"
                style={{
                  background: salon.disponible ? '#f0fdf4' : '#fff1f2',
                  border:     `1px solid ${salon.disponible ? '#bbf7d0' : '#fecdd3'}`,
                }}
              >
                <TipoIcon size={13}
                  style={{ color: salon.disponible ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold leading-tight truncate"
                    style={{ color: 'var(--color-text)' }}>
                    {salon.nombre}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {salon.id}
                  </p>
                </div>
                {salon.disponible
                  ? <CheckCircle2 size={14} style={{ color:'#16a34a', flexShrink:0 }} />
                  : <XCircle      size={14} style={{ color:'#dc2626', flexShrink:0 }} />
                }
              </div>
            )
          })}
        </div>
      </section>

      {/* Divisor */}
      <div className="mx-3.5" style={{ height: 1, background: 'var(--color-border)' }} />

      {/* ── Leyenda del mapa ───────────────────────────── */}
      <section className="px-3.5 pt-3 pb-5">
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin size={14} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-site-black)' }}>
            Leyenda del Mapa
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {LEYENDA.map(({ color, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
              <span className="text-[11px] leading-tight" style={{ color: 'var(--color-text)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Preview mini mapa */}
        <div
          className="mt-3 rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            height:     '80px',
            background: 'linear-gradient(135deg, #f5f5f5 0%, #ebebeb 100%)',
            border:     '1px dashed var(--color-border)',
          }}
        >
          <div className="flex flex-col items-center gap-1"
            style={{ color: 'var(--color-text-muted)' }}>
            <MapPin size={18} />
            <span className="text-[10px]">Vista previa del mapa</span>
          </div>
        </div>

        {/* Hora actualización */}
        <div className="flex items-center gap-1 mt-2.5 justify-end">
          <Clock3 size={10} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Actualizado: {hh}:{mm}
          </span>
        </div>
      </section>
    </aside>
  )
}
