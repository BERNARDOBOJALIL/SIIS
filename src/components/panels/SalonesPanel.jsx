import { useState, useEffect } from 'react'
import { getSalones } from '../../services/firestoreService'
import {
  School, CheckCircle2, XCircle, Circle,
  FlaskConical, Users, BookOpen, Search,
} from 'lucide-react'
import HorarioGrid from '../common/HorarioGrid'

const TIPO_ICON = {
  aula:        BookOpen,
  laboratorio: FlaskConical,
  sala:        Users,
  oficina:     Users,
  lobby:       Users,
}

const TIPO_LABEL = {
  aula:        'Aula',
  laboratorio: 'Laboratorio',
  sala:        'Sala',
  oficina:     'Oficina',
  lobby:       'Lobby',
}

function normalizarDia(dia) {
  return dia?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() ?? ''
}

function estaDisponible(salon) {
  if (!salon.tipoHorario) return null

  if (salon.tipoHorario === 'clases' && (!salon.horario || !Array.isArray(salon.horario) || salon.horario.length === 0)) {
    const ahora = new Date()
    const diaSemana = ahora.getDay()
    const minutos = ahora.getHours() * 60 + ahora.getMinutes()
    const edificioCerrado =
  diaSemana === 0 ||
  (diaSemana === 6 && minutos >= 14 * 60) ||
  (diaSemana >= 1 && diaSemana <= 5 && minutos >= 22 * 60)
    return edificioCerrado ? 'cerrado' : true
  }

  if (!salon.horario || !Array.isArray(salon.horario) || salon.horario.length === 0) return null

  const bloques = salon.horario.filter(b => b && b.dia && b.inicio && b.fin)
  if (bloques.length === 0) return null

  const ahora = new Date()
  const diaSemana = ahora.getDay()
  const minutos = ahora.getHours() * 60 + ahora.getMinutes()
  const edificioCerrado =
  diaSemana === 0 ||
  (diaSemana === 6 && minutos >= 14 * 60) ||
  (diaSemana >= 1 && diaSemana <= 5 && minutos >= 22 * 60)
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

function DispBadge({ disp }) {
  if (disp === true)     return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16a34a' }}><CheckCircle2 size={12} />Disponible</span>
  if (disp === false)    return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#dc2626' }}><XCircle size={12} />Ocupado</span>
  if (disp === 'cerrado')return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#94a3b8' }}><XCircle size={12} />Cerrado</span>
  return                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#f59e0b' }}><Circle  size={12} />Sin info</span>
}

export default function SalonesPanel() {
  const [salones,  setSalones]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPiso, setFiltroPiso] = useState('todos')

  useEffect(() => {
    getSalones().then(data => {
      setSalones(data)
      setLoading(false)
    })
  }, [])

  const tipos = ['todos', ...new Set(
  salones.flatMap(s => Array.isArray(s.tipo) ? s.tipo : [s.tipo]).filter(Boolean)
)]
  const pisos = ['todos', ...new Set(salones.map(s => s.piso).filter(Boolean))]

  const filtrados = salones
    .map(s => ({ ...s, disp: estaDisponible(s) }))
    .filter(s => {
      const texto = busqueda.toLowerCase()
      const coincideTexto =
        !texto ||
        s.nombre?.toLowerCase().includes(texto) ||
        s.nomenclatura?.toLowerCase().includes(texto)
      const coincideTipo = filtroTipo === 'todos' || 
  (Array.isArray(s.tipo) ? s.tipo.includes(filtroTipo) : s.tipo === filtroTipo)
      const coincidePiso = filtroPiso === 'todos' || s.piso === filtroPiso
      return coincideTexto && coincideTipo && coincidePiso
    })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 shrink-0"
        style={{ background: 'var(--color-site-white)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <School size={18} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--color-site-black)' }}>
            Salones y Espacios
          </h1>
          <span className="ml-auto text-[12px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'var(--color-primary)', color: '#fff' }}>
            {filtrados.length}
          </span>
        </div>

        {/* Buscador */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o nomenclatura..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] outline-none"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {/* Filtro tipo */}
          <div className="flex gap-1 flex-wrap">
            {tipos.map(tipo => (
              <button key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                style={{
                  background: filtroTipo === tipo ? 'var(--color-primary)' : 'var(--color-bg)',
                  color:      filtroTipo === tipo ? '#fff' : 'var(--color-text-muted)',
                  border:     `1px solid ${filtroTipo === tipo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                {tipo === 'todos' ? 'Todos los tipos' : TIPO_LABEL[tipo] ?? tipo}
              </button>
            ))}
          </div>

          {/* Filtro piso */}
          <div className="flex gap-1 flex-wrap">
            {pisos.map(piso => (
              <button key={piso}
                onClick={() => setFiltroPiso(piso)}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                style={{
                  background: filtroPiso === piso ? 'var(--color-primary)' : 'var(--color-bg)',
                  color:      filtroPiso === piso ? '#fff' : 'var(--color-text-muted)',
                  border:     `1px solid ${filtroPiso === piso ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}>
                {piso === 'todos' ? 'Todos los pisos' : piso}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de cards ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-center text-[13px] py-10" style={{ color: 'var(--color-text-muted)' }}>
            Cargando salones...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-[13px] py-10" style={{ color: 'var(--color-text-muted)' }}>
            No se encontraron espacios.
          </p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtrados.map(salon => {
              const TipoIcon = TIPO_ICON[salon.tipo] || BookOpen
              return (
                <div key={salon.id}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: 'var(--color-site-white)',
                    border: `1px solid ${
  salon.disp === true     ? '#bbf7d0' :
  salon.disp === false    ? '#fecdd3' :
  salon.disp === 'cerrado'? '#e2e8f0' :
  salon.disp === null     ? '#fed7aa' : 'var(--color-border)'
}`,
                  }}>

                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TipoIcon size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <div>
                        <p className="text-[14px] font-bold leading-tight"
                          style={{ color: 'var(--color-site-black)' }}>
                          {salon.nombre ?? salon.nomenclatura ?? '—'}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {salon.nomenclatura} · {salon.piso ?? '—'}
                        </p>
                      </div>
                    </div>
                    <DispBadge disp={salon.disp} />
                  </div>

                  {/* Equipamiento */}
                  {Array.isArray(salon.equipamiento) && salon.equipamiento.filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {salon.equipamiento.filter(Boolean).map((eq, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                          {eq}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Responsables */}
                  {Array.isArray(salon.responsables) && salon.responsables.filter(r => r?.nombre).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                        style={{ color: 'var(--color-text-muted)' }}>Responsable(s)</p>
                      {salon.responsables.filter(r => r?.nombre).map((r, i) => (
                        <p key={i} className="text-[12px]" style={{ color: 'var(--color-text)' }}>
                          <span className="font-semibold">{r.nombre}</span>
                          {r.cargo && <span style={{ color: 'var(--color-text-muted)' }}> · {r.cargo}</span>}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Horario */}
{salon.tipoHorario && (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1"
      style={{ color: 'var(--color-text-muted)' }}>
      {salon.tipoHorario === 'operacion' ? 'Horario de operación' : 'Horario de clases'}
    </p>
    {salon.tipoHorario === 'clases' ? (
      <HorarioGrid horario={salon.horario ?? []} />
    ) : (
      <div className="flex flex-col gap-0.5">
        {(salon.horario ?? []).filter(b => b?.dia).map((b, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <span className="capitalize font-medium" style={{ color: 'var(--color-text)' }}>{b.dia}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>{b.inicio} – {b.fin}</span>
          </div>
        ))}
      </div>
    )}
  </div>
)}

                  {/* Reserva */}
                  {salon.reserva === true && (
                    <p className="text-[11px] font-medium" style={{ color: 'var(--color-primary)' }}>
                      ✓ Permite reservas
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}