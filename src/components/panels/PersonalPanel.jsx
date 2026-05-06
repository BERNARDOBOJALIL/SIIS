import { useState, useEffect } from 'react'
import { getPersonal, getHorarioPersonal } from '../../services/firestoreService'
import { Users, Search, CheckCircle2, XCircle, Clock3, MapPin, Calendar } from 'lucide-react'

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABEL = {
  lunes: 'L', martes: 'M', miercoles: 'M',
  jueves: 'J', viernes: 'V', sabado: 'S'
}

function normalizarDia(dia) {
  return dia?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() ?? ''
}

function estaDisponiblePersona(horario) {
  if (!horario) return null

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

  const disponibilidad = horario.disponibilidad
  if (!disponibilidad || !Array.isArray(disponibilidad)) return null

  // Buscar el bloque de disponibilidad que aplica hoy
  const bloqueHoy = disponibilidad.find(d => {
    const dias = (d.dias ?? []).map(normalizarDia)
    return dias.includes(dia)
  })

  if (!bloqueHoy) return 'cerrado'

  const [hIni, mIni] = (bloqueHoy.inicio ?? '0:0').split(':').map(Number)
  const [hFin, mFin] = (bloqueHoy.fin ?? '0:0').split(':').map(Number)
  const inicioMin = hIni * 60 + mIni
  const finMin = hFin * 60 + mFin

  if (minutos < inicioMin || minutos >= finMin) return 'cerrado'

  // Verificar si tiene clase ahorita
  const bloquesHoy = (horario[dia] ?? []).filter(b => b?.inicio && b?.fin)
  const enClase = bloquesHoy.some(b => {
    const [hI, mI] = b.inicio.split(':').map(Number)
    const [hF, mF] = b.fin.split(':').map(Number)
    return minutos >= hI * 60 + mI && minutos < hF * 60 + mF
  })

  return enClase ? false : true
}

function DisponibilidadBadge({ disp }) {
  if (disp === true)      return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#16a34a' }}><CheckCircle2 size={12} />Disponible</span>
  if (disp === false)     return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#ef4444' }}><XCircle size={12} />Ocupado</span>
  if (disp === 'cerrado') return <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#94a3b8' }}><XCircle size={12} />No disponible</span>
  return                         <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#f59e0b' }}><Clock3 size={12} />Sin horario</span>
}

function HorarioPersona({ horario }) {
  if (!horario) return null

  const disponibilidad = horario.disponibilidad
  if (!Array.isArray(disponibilidad) || disponibilidad.length === 0) return null

  // Obtener todos los días con actividad
  const diasConActividad = DIAS_ORDEN.filter(dia => {
    return disponibilidad.some(d => (d.dias ?? []).map(normalizarDia).includes(dia))
  })

  if (diasConActividad.length === 0) return null

  // Obtener rango de horas mínimo y máximo
  let minHora = 24, maxHora = 0
  disponibilidad.forEach(d => {
    const [hI] = (d.inicio ?? '0:0').split(':').map(Number)
    const [hF] = (d.fin ?? '0:0').split(':').map(Number)
    if (hI < minHora) minHora = hI
    if (hF > maxHora) maxHora = hF
  })

  // Generar rangos de 1 hora
  const rangos = []
  for (let h = minHora; h < maxHora; h++) {
    rangos.push({ inicio: `${h}:00`, fin: `${h + 1}:00`, inicioH: h })
  }

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--color-text-muted)' }}>Horario</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
          <thead>
            <tr>
              <th style={{ padding: '2px 4px', color: 'var(--color-text-muted)', textAlign: 'left' }}></th>
              {diasConActividad.map(dia => (
                <th key={dia} style={{ padding: '2px 4px', color: 'var(--color-text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  {DIAS_LABEL[dia]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rangos.map(({ inicio, fin, inicioH }) => (
              <tr key={inicio}>
                <td style={{ padding: '2px 4px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', paddingRight: 6, fontSize: '9px' }}>
                  {inicioH}h
                </td>
                {diasConActividad.map(dia => {
                  // Verificar si está dentro de disponibilidad
                  const bloqueDisp = disponibilidad.find(d => {
                    const dias = (d.dias ?? []).map(normalizarDia)
                    if (!dias.includes(dia)) return false
                    const [hI] = d.inicio.split(':').map(Number)
                    const [hF] = d.fin.split(':').map(Number)
                    return inicioH >= hI && inicioH < hF
                  })

                  if (!bloqueDisp) {
                    return (
                      <td key={dia} style={{ padding: '2px 3px', textAlign: 'center' }}>
                        <div style={{ width: 14, height: 14, margin: '0 auto' }} />
                      </td>
                    )
                  }

                  // Verificar si tiene clase en este bloque
                  const bloquesClase = (horario[dia] ?? []).filter(b => {
                    if (!b?.inicio || !b?.fin) return false
                    const [hI] = b.inicio.split(':').map(Number)
                    const [hF] = b.fin.split(':').map(Number)
                    return inicioH >= hI && inicioH < hF
                  })

                  const tieneClase = bloquesClase.length > 0
                  const bloque = bloquesClase[0]

                  return (
                    <td key={dia} style={{ padding: '2px 3px', textAlign: 'center' }}>
                      <div
                        style={{ position: 'relative', display: 'inline-block' }}
                        onMouseEnter={e => {
                          const tip = e.currentTarget.querySelector('.tip')
                          if (tip) tip.style.display = 'block'
                        }}
                        onMouseLeave={e => {
                          const tip = e.currentTarget.querySelector('.tip')
                          if (tip) tip.style.display = 'none'
                        }}
                      >
                        <div style={{
                          width: 14, height: 14, borderRadius: 3,
                          background: tieneClase ? '#ef4444' : '#e2e8f0',
border: tieneClase ? 'none' : '1px solid #cbd5e1',
                          margin: '0 auto',
                          cursor: tieneClase ? 'help' : 'default',
                        }} />
                        {tieneClase && bloque && (
                          <div className="tip" style={{
                            display: 'none',
                            position: 'absolute',
                            top: '18px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--color-site-black)',
                            color: '#fff',
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            zIndex: 100,
                            pointerEvents: 'none',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                          }}>
                            {bloque.clase && <div style={{ fontWeight: 600 }}>{bloque.clase}</div>}
                            {bloque.salon && <div style={{ opacity: 0.8 }}>Salón: {bloque.salon}</div>}
                            <div style={{ opacity: 0.7 }}>{bloque.inicio}–{bloque.fin}</div>
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PersonalPanel() {
  const [personal, setPersonal] = useState([])
  const [horarios, setHorarios] = useState({})
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroDept, setFiltroDept] = useState('todos')

  useEffect(() => {
    getPersonal().then(async data => {
      setPersonal(data)
      // Cargar horarios de todos en paralelo
      const horariosData = await Promise.all(
        data.map(p => getHorarioPersonal(p.uid).then(h => ({ uid: p.uid, horario: h })))
      )
      const map = {}
      horariosData.forEach(({ uid, horario }) => { map[uid] = horario })
      setHorarios(map)
      setLoading(false)
    })
  }, [])

  const departamentos = ['todos', ...new Set(personal.map(p => p.departamento).filter(Boolean))]

  const filtrados = personal
  .map(p => ({ ...p, disp: estaDisponiblePersona(horarios[p.uid]) }))
  .sort((a, b) => {
    const nomA = a.ubicacion ?? ''
    const nomB = b.ubicacion ?? ''
    return nomA.localeCompare(nomB, 'es', { numeric: true })
  })
  .filter(p => {
      const texto = busqueda.toLowerCase()
      const coincideTexto = !texto ||
        p.nombre?.toLowerCase().includes(texto) ||
        p.cargo?.toLowerCase().includes(texto)
      const coincideDept = filtroDept === 'todos' || p.departamento === filtroDept
      return coincideTexto && coincideDept
    })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 shrink-0"
        style={{ background: 'var(--color-site-white)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} style={{ color: 'var(--color-primary)' }} />
          <h1 className="text-[18px] font-bold" style={{ color: 'var(--color-site-black)' }}>
            Personal
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
            placeholder="Buscar por nombre o cargo..."
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

        {/* Filtro departamento */}
        <div className="flex gap-1 flex-wrap">
          {departamentos.map(dept => (
            <button key={dept}
              onClick={() => setFiltroDept(dept)}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
              style={{
                background: filtroDept === dept ? 'var(--color-primary)' : 'var(--color-bg)',
                color:      filtroDept === dept ? '#fff' : 'var(--color-text-muted)',
                border:     `1px solid ${filtroDept === dept ? 'var(--color-primary)' : 'var(--color-border)'}`,
              }}>
              {dept === 'todos' ? 'Todos' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid de cards ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-center text-[13px] py-10" style={{ color: 'var(--color-text-muted)' }}>
            Cargando personal...
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-[13px] py-10" style={{ color: 'var(--color-text-muted)' }}>
            No se encontró personal.
          </p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filtrados.map(persona => (
              <div key={persona.uid}
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: 'var(--color-site-white)',
                  border: `1px solid ${
                    persona.disp === true     ? '#bbf7d0' :
                    persona.disp === false    ? '#fecdd3' :
                    persona.disp === 'cerrado'? '#e2e8f0' : 'var(--color-border)'
                  }`,
                }}>

                {/* Header card */}
                <div className="flex items-center gap-3">
                  {persona.foto ? (
                    <img src={persona.foto} alt={persona.nombre}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                      style={{ border: '2px solid var(--color-border)' }} />
                  ) : (
                    <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-[18px] font-bold"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}>
                      {persona.nombre?.[0] ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold leading-tight truncate"
                      style={{ color: 'var(--color-site-black)' }}>
                      {persona.nombre ?? '—'}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {persona.cargo ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Disponibilidad */}
                <DisponibilidadBadge disp={persona.disp} />

                {/* Ubicación */}
                {persona.ubicacion && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <span className="text-[12px]" style={{ color: 'var(--color-text)' }}>
                      {persona.ubicacion}
                    </span>
                  </div>
                )}

                {/* Descripción */}
                {persona.descripcion && (
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {persona.descripcion}
                  </p>
                )}

                {/* Horario */}
                {horarios[persona.uid] && (
                  <HorarioPersona horario={horarios[persona.uid]} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}