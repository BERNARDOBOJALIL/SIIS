import { useState, useEffect } from 'react'
import { getSalones } from '../../services/firestoreService'
import {
  School, CheckCircle2, XCircle, Clock3, CalendarDays,
  MapPin, FlaskConical, Users, BookOpen, Settings, Circle, ChevronRight,
} from 'lucide-react'
import HorarioGrid from '../common/HorarioGrid'

const LEYENDA = [
  { color: '#22c55e', label: 'Disponible',  Icon: CheckCircle2 },
  { color: '#ef4444', label: 'Ocupado',     Icon: XCircle      },
  { color: '#94a3b8', label: 'Cerrado',     Icon: XCircle      },
  { color: '#f59e0b', label: 'Sin info',    Icon: Circle       },
]

const TIPO_ICON = {
  aula:  BookOpen,
  lab:   FlaskConical,
  sala:  Users,
}

function normalizarDia(dia) {
  return dia?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() ?? ''
}

function estaDisponible(salon) {
  // Si no tiene horario ni tipoHorario, no hay info suficiente
  if (!salon.tipoHorario || !salon.horario || !Array.isArray(salon.horario) || salon.horario.length === 0) return null

  const bloques = salon.horario.filter(b => b && b.dia && b.inicio && b.fin)
  if (bloques.length === 0) return null

  const ahora = new Date()
  const diaSemana = ahora.getDay()
  const minutos = ahora.getHours() * 60 + ahora.getMinutes()

  const edificioCerrado =
    diaSemana === 0 ||
    (diaSemana === 6 && minutos >= 14 * 60)

  if (edificioCerrado) return 'cerrado'

  const dia = ahora.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (salon.tipoHorario === 'operacion') {
    const abierto = bloques.some(b => {
      if (normalizarDia(b.dia) !== dia) return false
      const [hI, mI] = b.inicio.split(':').map(Number)
      const [hF, mF] = b.fin.split(':').map(Number)
      return minutos >= hI * 60 + mI && minutos < hF * 60 + mF
    })
    return abierto ? true : 'cerrado'
  }

  if (salon.tipoHorario === 'clases') {
    const ocupado = bloques.some(b => {
      if (normalizarDia(b.dia) !== dia) return false
      const [hI, mI] = b.inicio.split(':').map(Number)
      const [hF, mF] = b.fin.split(':').map(Number)
      return minutos >= hI * 60 + mI && minutos < hF * 60 + mF
    })
    return ocupado ? false : true
  }

  return null
}

const DAYS   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio',
                'agosto','septiembre','octubre','noviembre','diciembre']

function useDateTime() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  return now
}

export default function RightPanel({ piso }) {
  const now    = useDateTime()
  const [salones,  setSalones]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [salonSel, setSalonSel] = useState(null)

  useEffect(() => {
    getSalones().then(data => {
      setSalones(data)
      setLoading(false)
    })
  }, [])

  const hh  = String(now.getHours()).padStart(2, '0')
  const mm  = String(now.getMinutes()).padStart(2, '0')
  const ss  = String(now.getSeconds()).padStart(2, '0')
  const day = DAYS[now.getDay()]
  const date = `${now.getDate()} de ${MONTHS[now.getMonth()]} de ${now.getFullYear()}`

  const salonesConDisp = salones
  .filter(s => !piso || s.piso === piso)
  .map(s => ({ ...s, disp: estaDisponible(s) }))
  const libres = salonesConDisp.filter(s => s.disp === true).length

  return (
    <aside
      className="right-panel flex flex-col h-full overflow-y-auto"
      style={{
        background:  'var(--color-site-white)',
        borderLeft:  '1px solid var(--color-border)',
      }}
    >
      {/* ── Logo + Reloj ─────────────────────────────── */}
      <div
        className="right-panel-header flex flex-col items-center gap-2 py-5 px-4 shrink-0"
        style={{
          background:    'var(--color-site-white)',
          borderBottom:  '2px solid var(--color-primary)',
        }}
      >
        <img
          src="/Logo_proyecto.svg"
          alt="SIIS"
          className="h-14 w-auto object-contain"
        />
        <p className="text-[10px] uppercase tracking-widest font-semibold text-center"
          style={{ color: 'var(--color-text-muted)' }}>
          Sistema de Información y Servicios
        </p>

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
      <section className="right-panel-rooms px-3.5 pt-4 pb-3 flex-1 min-h-0 flex flex-col">
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
            {libres}/{salonesConDisp.length}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1.5 rounded-full mb-3 overflow-hidden"
          style={{ background: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round((libres / salonesConDisp.length) * 100)}%`,
              background: 'var(--color-primary)',
            }}
          />
        </div>

        {/* Lista de salones */}
        <div className="room-list flex flex-col gap-1.5 overflow-y-auto min-h-0">
  {loading ? (
    <p className="text-[12px] text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
      Cargando salones...
    </p>
  ) : (
    salonesConDisp.map(salon => {
      const TipoIcon = TIPO_ICON[salon.tipo] || BookOpen
      const disponible = salon.disp
      return (
        <div
          key={salon.id}
          onClick={() => setSalonSel(salon)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer hover:opacity-80"
          style={{
            border: `1px solid ${
  disponible === true     ? '#bbf7d0' :
  disponible === false    ? '#fecdd3' :
  disponible === 'cerrado'? '#e2e8f0' :
  disponible === null     ? '#fed7aa' : 'var(--color-border)'
}`,
          }}
        >
          <TipoIcon size={13} style={{
            color: disponible === true  ? '#16a34a' :
       disponible === false ? '#dc2626' :
       disponible === null  ? '#f59e0b' : '#94a3b8',
            flexShrink: 0
          }} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate"
              style={{ color: 'var(--color-text)' }}>
              {salon.nombre}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {salon.nomenclatura} · {salon.piso}
            </p>
          </div>
          {disponible === true     && <CheckCircle2 size={14} style={{ color: '#16a34a', flexShrink: 0 }} />}
{disponible === false    && <XCircle      size={14} style={{ color: '#dc2626', flexShrink: 0 }} />}
{disponible === 'cerrado'&& <XCircle      size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
{disponible === null     && <Circle       size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />}
        </div>
      )
    })
  )}
</div>
      </section>

      {/* Divisor */}
      <div className="mx-3.5" style={{ height: 1, background: 'var(--color-border)' }} />

      {/* ── Leyenda del mapa ───────────────────────────── */}
      <section className="right-panel-legend px-3.5 pt-3 pb-5">
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

        {/* Hora actualización */}
        <div className="flex items-center gap-1 mt-2.5 justify-end">
          <Clock3 size={10} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            Actualizado: {hh}:{mm}
          </span>
        </div>
      </section>
      {/* ── Detalle de salón ───────────────────────────── */}
{salonSel && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.4)' }}
    onClick={() => setSalonSel(null)}
  >
    <div
      className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3 overflow-y-auto max-h-[80vh]"
      style={{ background: 'var(--color-site-white)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-primary)' }}>
            {salonSel.nomenclatura ?? '—'} · {salonSel.piso ?? '—'}
          </p>
          <h3 className="text-[16px] font-bold leading-tight"
            style={{ color: 'var(--color-site-black)' }}>
            {salonSel.nombre ?? salonSel.nomenclatura ?? '—'}
          </h3>
        </div>
        <button onClick={() => setSalonSel(null)}
          className="text-[20px] leading-none font-light"
          style={{ color: 'var(--color-text-muted)' }}>✕</button>
      </div>

      {/* Disponibilidad */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background:
  salonSel.disp === true     ? '#f0fdf4' :
  salonSel.disp === false    ? '#fef2f2' :
  salonSel.disp === 'cerrado'? '#f8fafc' : '#fff7ed'
}}>
        {salonSel.disp === true     && <CheckCircle2 size={14} style={{ color: '#16a34a' }} />}
        {salonSel.disp === false    && <XCircle      size={14} style={{ color: '#dc2626' }} />}
        {salonSel.disp === 'cerrado'&& <XCircle      size={14} style={{ color: '#94a3b8' }} />}
        {salonSel.disp === null     && <Circle       size={14} style={{ color: '#f59e0b' }} />}
        <span className="text-[12px] font-semibold" style={{ color:
  salonSel.disp === true     ? '#16a34a' :
  salonSel.disp === false    ? '#dc2626' :
  salonSel.disp === 'cerrado'? '#94a3b8' : '#f59e0b'
}}>
          {salonSel.disp === true     ? 'Disponible ahora' :
           salonSel.disp === false    ? 'Ocupado ahora'    :
           salonSel.disp === 'cerrado'? 'Cerrado'          : 'Sin información'}
        </span>
      </div>

      {/* Equipamiento */}
      {Array.isArray(salonSel.equipamiento) && salonSel.equipamiento.filter(Boolean).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}>Equipamiento</p>
          <div className="flex flex-wrap gap-1.5">
            {salonSel.equipamiento.filter(Boolean).map((eq, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                {eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Responsables */}
      {Array.isArray(salonSel.responsables) && salonSel.responsables.filter(r => r?.nombre).length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--color-text-muted)' }}>Responsable(s)</p>
          {salonSel.responsables.filter(r => r?.nombre).map((r, i) => (
            <div key={i} className="text-[12px]" style={{ color: 'var(--color-text)' }}>
              <span className="font-semibold">{r.nombre}</span>
              {r.cargo && <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}> · {r.cargo}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Horario */}
{Array.isArray(salonSel.horario) && salonSel.horario.filter(b => b?.dia).length > 0 && (
  <div>
    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
      style={{ color: 'var(--color-text-muted)' }}>
      {salonSel.tipoHorario === 'operacion' ? 'Horario de operación' : 'Horario de clases'}
    </p>
    {salonSel.tipoHorario === 'clases' ? (
      <HorarioGrid horario={salonSel.horario} />
    ) : (
      <div className="flex flex-col gap-1">
        {salonSel.horario.filter(b => b?.dia).map((b, i) => (
          <div key={i} className="flex items-center justify-between text-[12px] px-2 py-1 rounded-lg"
            style={{ background: 'var(--color-bg)' }}>
            <span className="capitalize font-medium" style={{ color: 'var(--color-text)' }}>{b.dia}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{b.inicio} – {b.fin}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}

      {/* Reserva */}
      {salonSel.reserva === true && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <CalendarDays size={13} style={{ color: 'var(--color-primary)' }} />
          <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>Este espacio permite reservas</span>
        </div>
      )}
    </div>
  </div>
)}
    </aside>
  )
}