import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  AlertTriangle,
  BarChart3,
  Database,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Wrench,
} from 'lucide-react'
import { ROUTES } from '../constants'
import { useAuth } from '../context'
import {
  createSalonRecord,
  deleteSalonRecord,
  getSalones,
  getSalonById,
  updateSalonRecord,
} from '../services/firestoreService'
import { getMachineOccupancyRecords } from '../services/adminService'

const MACHINE_CATALOG = {
  zona1: {
    label: 'Taladro de columna',
    maintenance: 'Revisar broca, alineación y limpieza de viruta si el uso supera el promedio.',
  },
  zona2: {
    label: 'Sierra cinta',
    maintenance: 'Verificar tensión de cinta y lubricación antes de un nuevo turno de trabajo.',
  },
  zona3: {
    label: 'Taladro fresador',
    maintenance: 'Revisar husillo, fijación de mesa y vibración residual.',
  },
  zona4: {
    label: 'Fresadora TMD50-PRO',
    maintenance: 'Controlar avance, nivelación y desgaste de herramienta por carga acumulada.',
  },
  zona5: {
    label: 'Dobladora de lámina',
    maintenance: 'Inspeccionar eje de doblado y limpiar puntos de fricción.',
  },
  zona6: {
    label: 'Cizalla de pedal',
    maintenance: 'Revisar filo de corte, holguras y desgaste de pedal/mecanismo.',
  },
}

const EMPTY_SALON = {
  nombre: '',
  nomenclatura: '',
  piso: '',
  tipo: '',
  idConjunto: '',
  tipoHorario: '',
  reserva: false,
  equipamientoJson: '[]',
  responsablesJson: '[]',
  horarioJson: '[]',
}

function salonToDraft(salon) {
  return {
    nombre: salon?.nombre ?? '',
    nomenclatura: salon?.nomenclatura ?? '',
    piso: salon?.piso ?? '',
    tipo: Array.isArray(salon?.tipo) ? salon.tipo.join(', ') : String(salon?.tipo ?? ''),
    idConjunto: salon?.idConjunto ?? '',
    tipoHorario: salon?.tipoHorario ?? '',
    reserva: Boolean(salon?.reserva),
    equipamientoJson: JSON.stringify(Array.isArray(salon?.equipamiento) ? salon.equipamiento : [], null, 2),
    responsablesJson: JSON.stringify(Array.isArray(salon?.responsables) ? salon.responsables : [], null, 2),
    horarioJson: JSON.stringify(Array.isArray(salon?.horario) ? salon.horario : [], null, 2),
  }
}

function draftToPayload(draft) {
  const parseJson = (value, fallback) => {
    if (!String(value || '').trim()) return fallback
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error('Los campos JSON deben ser arreglos válidos.')
    return parsed
  }

  const tipoItems = String(draft.tipo || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  const idConjunto = String(draft.idConjunto || '').trim()

  return {
    nombre: String(draft.nombre || '').trim(),
    nomenclatura: String(draft.nomenclatura || '').trim(),
    piso: String(draft.piso || '').trim(),
    tipo: tipoItems.length > 1 ? tipoItems : (tipoItems[0] ?? ''),
    idConjunto: idConjunto === '' ? null : Number(idConjunto),
    tipoHorario: String(draft.tipoHorario || '').trim(),
    reserva: Boolean(draft.reserva),
    equipamiento: parseJson(draft.equipamientoJson, []),
    responsables: parseJson(draft.responsablesJson, []),
    horario: parseJson(draft.horarioJson, []),
  }
}

function formatSeconds(seconds) {
  const total = Number(seconds || 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = Math.round(total % 60)

  if (hours > 0) return `${hours} h ${minutes} min`
  if (minutes > 0) return `${minutes} min ${secs} s`
  return `${secs} s`
}

function getRiskLevel(seconds) {
  const total = Number(seconds || 0)
  const monthSeconds = 30 * 24 * 3600
  if (total > 4 * monthSeconds) return 'Alta'
  if (total >= 2 * monthSeconds) return 'Media'
  return 'Baja'
}

function buildMaintenanceNote(item) {
  const meta = MACHINE_CATALOG[item.machine_id] || {}
  const risk = getRiskLevel(item.occupied_seconds)

  if (risk === 'Alta') {
    return `${meta.maintenance || 'Revisar desgaste, limpieza y calibración.'} Prioridad alta por uso acumulado.`
  }

  if (risk === 'Media') {
    return `${meta.maintenance || 'Revisar componentes móviles.'} Programar verificación preventiva.`
  }

  return meta.maintenance || 'Sin observaciones adicionales.'
}

function SalonEditorCard({ title, salon, saving, onSave, onDelete, allowDelete = false }) {
  const [draft, setDraft] = useState(salonToDraft(salon ?? EMPTY_SALON))
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(salonToDraft(salon ?? EMPTY_SALON))
    setError('')
  }, [salon])

  const updateField = (field, value) => {
    setDraft(current => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      const payload = draftToPayload(draft)
      await onSave(payload)
    } catch (submitError) {
      setError(submitError?.message || 'No se pudo guardar el salón.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            {title}
          </p>
          <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--color-site-black)' }}>
            {draft.nombre || draft.nomenclatura || 'Nuevo registro'}
          </h3>
        </div>
        {allowDelete && onDelete && (
          <button
            type="button"
            disabled={saving}
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
            style={{ borderColor: '#fecaca', color: '#b91c1c' }}
          >
            <Trash2 size={13} />
            Eliminar
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Nombre</span>
          <input className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.nombre} onChange={e => updateField('nombre', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Nomenclatura</span>
          <input className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.nomenclatura} onChange={e => updateField('nomenclatura', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Piso</span>
          <input className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.piso} onChange={e => updateField('piso', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Tipo</span>
          <input className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.tipo} onChange={e => updateField('tipo', e.target.value)} placeholder="aula, laboratorio" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Conjunto</span>
          <input className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.idConjunto} onChange={e => updateField('idConjunto', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Horario</span>
          <select className="w-full rounded-xl border px-3 py-2 outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.tipoHorario} onChange={e => updateField('tipoHorario', e.target.value)}>
            <option value="">Sin definir</option>
            <option value="clases">Clases</option>
            <option value="operacion">Operación</option>
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-site-black)' }}>
        <input type="checkbox" checked={draft.reserva} onChange={e => updateField('reserva', e.target.checked)} />
        Permite reservas
      </label>

      <div className="mt-3 grid gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Equipamiento JSON</span>
          <textarea className="min-h-24 w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.equipamientoJson} onChange={e => updateField('equipamientoJson', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Responsables JSON</span>
          <textarea className="min-h-24 w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.responsablesJson} onChange={e => updateField('responsablesJson', e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Horario JSON</span>
          <textarea className="min-h-24 w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none" style={{ borderColor: 'var(--color-border)' }} value={draft.horarioJson} onChange={e => updateField('horarioJson', e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: 'var(--color-primary)' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        Guardar cambios
      </button>
    </form>
  )
}

function MachineReportsCard({ report, loading, reportScope, onScopeChange, onRefresh, onExport }) {
  const totalSeconds = report.reduce((sum, item) => sum + (item.occupied_seconds || 0), 0)
  const maintenanceCount = report.filter(item => getRiskLevel(item.occupied_seconds || 0) === 'Alta').length

  return (
    <section className="rounded-3xl border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Reporte de máquinas</p>
          <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--color-site-black)' }}>
            {reportScope === 'all' ? 'Histórico completo y mantenimiento sugerido' : 'Ocupación diaria y mantenimiento sugerido'}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={() => onScopeChange('today')}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: reportScope === 'today' ? 'var(--color-primary)' : 'transparent',
                color: reportScope === 'today' ? '#fff' : 'var(--color-text)',
              }}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => onScopeChange('all')}
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: reportScope === 'all' ? 'var(--color-primary)' : 'transparent',
                color: reportScope === 'all' ? '#fff' : 'var(--color-text)',
              }}
            >
              Todos
            </button>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            <RefreshCw size={12} />
            Actualizar
          </button>
          <button type="button" onClick={onExport} disabled={loading || report.length === 0} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
            <Download size={12} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label={reportScope === 'all' ? 'Registros' : 'Máquinas reportadas'} value={report.length} icon={Database} />
        <Metric label="Tiempo acumulado" value={formatSeconds(totalSeconds)} icon={BarChart3} />
        <Metric label="Mantenimientos sugeridos" value={maintenanceCount} icon={Wrench} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={16} className="mr-2 animate-spin" />
          Cargando reporte de uso...
        </div>
      ) : report.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed px-4 py-8 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {reportScope === 'all' ? 'No hay registros históricos de ocupación.' : 'No hay datos de ocupación disponibles para hoy.'}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--color-bg)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Máquina</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Ocupación</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Riesgo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Mantenimiento sugerido</th>
                </tr>
              </thead>
              <tbody>
                {report.map((item, index) => {
                  const meta = MACHINE_CATALOG[item.machine_id] || {}
                  const risk = getRiskLevel(item.occupied_seconds || 0)
                  return (
                    <tr key={`${item.machine_id}-${item.date || 'hoy'}-${index}`} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-site-black)' }}>{item.date || 'Sin fecha'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: 'var(--color-site-black)' }}>{meta.label || item.machine_id}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.machine_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: 'var(--color-site-black)' }}>{formatSeconds(item.occupied_seconds)}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{((item.occupied_seconds || 0) / 3600).toFixed(2)} h</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: risk === 'Alta' ? '#fee2e2' : risk === 'Media' ? '#fef3c7' : '#dcfce7', color: risk === 'Alta' ? '#991b1b' : risk === 'Media' ? '#92400e' : '#166534' }}>
                          {risk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs leading-relaxed" style={{ color: 'var(--color-site-black)' }}>{buildMaintenanceNote(item)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-2xl border px-4 py-3" style={{ borderColor: '#fed7aa', background: '#fff7ed' }}>
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#9a3412' }}>
          <AlertTriangle size={15} />
          Criterio de mantenimiento preventivo
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: '#9a3412' }}>
          Las máquinas con mayor ocupación diaria reciben prioridad alta para inspección visual, limpieza, lubricación y revisión de desgaste. Este criterio puede ajustarse cuando compartas el umbral operativo real de cada equipo.
        </p>
      </div>
    </section>
  )
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        <Icon size={13} />
        {label}
      </div>
      <p className="mt-2 text-lg font-bold" style={{ color: 'var(--color-site-black)' }}>{value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { authLoading, userRole } = useAuth()
  const [salones, setSalones] = useState([])
  const [salonesLoading, setSalonesLoading] = useState(true)
  const [salonesSavingId, setSalonesSavingId] = useState('')
  const [salonesError, setSalonesError] = useState('')
  const [newSalonKey, setNewSalonKey] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSalon, setSelectedSalon] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [report, setReport] = useState([])
  const [reportScope, setReportScope] = useState('today')
  const [reportLoading, setReportLoading] = useState(true)
  const [reportError, setReportError] = useState('')

  const refreshSalones = async () => {
    setSalonesLoading(true)
    setSalonesError('')
    try {
      const data = await getSalones()
      setSalones(data)
    } catch (error) {
      setSalonesError(error?.message || 'No se pudieron cargar los salones.')
    } finally {
      setSalonesLoading(false)
    }
  }

  const handleSearchSalon = async (queryText) => {
    const q = String(queryText || '').trim()
    if (!q) return
    setSearchLoading(true)
    setSelectedSalon(null)
    try {
      // Try as ID first
      let salon = null
      try {
        salon = await getSalonById(q)
      } catch (e) {
        salon = null
      }

      if (!salon) {
        const all = await getSalones()
        const qLow = q.toLowerCase()
        salon = all.find(s => String(s.id || '').toLowerCase() === qLow
          || String(s.nomenclatura || '').toLowerCase().includes(qLow)
          || String(s.nombre || '').toLowerCase().includes(qLow)
          || String(s.idConjunto || '').toLowerCase() === qLow)
      }

      if (!salon) {
        setSalonesError('No se encontró ningún salón que coincida con la búsqueda.')
      } else {
        setSalonesError('')
        setSelectedSalon(salon)
      }
    } catch (error) {
      setSalonesError(error?.message || 'Error buscando salón.')
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSelectedSalon = () => {
    setSelectedSalon(null)
    setSearchQuery('')
    setSalonesError('')
  }

  const getSuggestions = (q) => {
    const text = String(q || '').trim().toLowerCase()
    if (!text) return []
    // compute simple relevance score
    const scored = (salones || []).map(s => {
      const id = String(s.id || '').toLowerCase()
      const nombre = String(s.nombre || '').toLowerCase()
      const nomen = String(s.nomenclatura || '').toLowerCase()
      let score = 0
      if (id === text) score += 100
      if ((nomen || '').startsWith(text)) score += 50
      if ((nombre || '').startsWith(text)) score += 40
      if ((nomen || '').includes(text)) score += 20
      if ((nombre || '').includes(text)) score += 10
      if (String(s.idConjunto || '').toLowerCase() === text) score += 5
      return { s, score }
    }).filter(x => x.score > 0)

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 6).map(x => x.s)
  }

  const refreshReport = async (scope = reportScope) => {
    setReportLoading(true)
    setReportError('')
    try {
      const data = await getMachineOccupancyRecords(scope)
      setReport(data)
    } catch (error) {
      setReportError(error?.message || 'No se pudo cargar el reporte de máquinas.')
      setReport([])
    } finally {
      setReportLoading(false)
    }
  }

  const handleReportScopeChange = async (scope) => {
    if (scope === reportScope) return
    setReportScope(scope)
    await refreshReport(scope)
  }

  useEffect(() => {
    refreshSalones()
    refreshReport('today')
  }, [])

  const handleSaveSalon = async (salonId, payload) => {
    setSalonesSavingId(salonId || 'new')
    try {
      if (salonId) {
        await updateSalonRecord(salonId, payload)
      } else {
        await createSalonRecord(payload)
        setNewSalonKey(current => current + 1)
      }
      await refreshSalones()
    } finally {
      setSalonesSavingId('')
    }
  }

  const handleDeleteSalon = async (salonId) => {
    const confirmed = window.confirm('¿Eliminar este salón? Esta acción no se puede deshacer.')
    if (!confirmed) return

    setSalonesSavingId(salonId)
    try {
      await deleteSalonRecord(salonId)
      await refreshSalones()
    } finally {
      setSalonesSavingId('')
    }
  }

  const exportPdf = () => {
    if (report.length === 0) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const totalSeconds = report.reduce((sum, item) => sum + (item.occupied_seconds || 0), 0)
    const createdAt = new Date().toLocaleString('es-MX')
    const reportTitle = reportScope === 'all' ? 'Reporte historico de uso de maquinas' : 'Reporte de uso de maquinas'

    doc.setFontSize(18)
    doc.text(reportTitle, 14, 18)
    doc.setFontSize(10)
    doc.text(`Generado: ${createdAt}`, 14, 25)
    doc.text(`Total acumulado: ${formatSeconds(totalSeconds)}`, 14, 30)
    doc.text(`${reportScope === 'all' ? 'Registros evaluados' : 'Maquinas evaluadas'}: ${report.length}`, 14, 35)

    autoTable(doc, {
      startY: 42,
      head: [['Fecha', 'Maquina', 'Ocupacion', 'Riesgo', 'Mantenimiento sugerido']],
      body: report.map(item => {
        const meta = MACHINE_CATALOG[item.machine_id] || {}
        const risk = getRiskLevel(item.occupied_seconds || 0)
        return [
          item.date || 'Sin fecha',
          `${meta.label || item.machine_id}\n${item.machine_id}`,
          `${formatSeconds(item.occupied_seconds)}\n${((item.occupied_seconds || 0) / 3600).toFixed(2)} h`,
          risk,
          buildMaintenanceNote(item),
        ]
      }),
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: 'top',
      },
      headStyles: {
        fillColor: [204, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    })

    const safeDate = new Date().toISOString().slice(0, 10)
    const filePrefix = reportScope === 'all' ? 'reporte-maquinas-historico' : 'reporte-maquinas-hoy'
    doc.save(`${filePrefix}-${safeDate}.pdf`)
  }

  const salonSummary = useMemo(() => ({
    total: salones.length,
    conReserva: salones.filter(salon => salon.reserva).length,
  }), [salones])

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Loader2 size={16} className="animate-spin" />
          Verificando acceso...
        </div>
      </div>
    )
  }

  if (userRole !== 'ADMINISTRADOR') {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return (
    <div className="h-full overflow-auto" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
        <header className="rounded-3xl border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ background: 'rgba(204,0,0,0.08)', color: 'var(--color-primary)' }}>
                <Shield size={10} />
                Panel administrativo
              </div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--color-site-black)' }}>Administración SIIS</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Modifica los registros de salones en la base de datos de Firestore y revisa el uso diario de las máquinas con observaciones útiles para mantenimiento preventivo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <Metric label="Salones" value={salonSummary.total} icon={Database} />
              <Metric label="Con reserva" value={salonSummary.conReserva} icon={Plus} />
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="rounded-3xl border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Salones</p>
                  <h2 className="mt-1 text-lg font-bold" style={{ color: 'var(--color-site-black)' }}>Editar registros de la base de datos</h2>
                </div>
                <button type="button" onClick={refreshSalones} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  <RefreshCw size={12} />
                  Refrescar
                </button>
              </div>
              {salonesError && <p className="mt-3 text-sm text-red-600">{salonesError}</p>}
            </div>

            <SalonEditorCard
              key={newSalonKey}
              title="Nuevo salón"
              salon={EMPTY_SALON}
              saving={salonesSavingId === 'new'}
              onSave={(payload) => handleSaveSalon(null, payload)}
            />

            <div className="mt-4 rounded-2xl border bg-white p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex gap-2">
                <div className="relative w-full">
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const suggestions = getSuggestions(searchQuery)
                        if (suggestions.length > 0) {
                          const first = suggestions[0]
                          setSelectedSalon(first)
                          setShowSuggestions(false)
                        } else {
                          handleSearchSalon(searchQuery)
                        }
                      }
                    }}
                    placeholder="Buscar salón por ID, nomenclatura o nombre"
                    className="w-full rounded-xl border px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--color-border)' }}
                  />

                  {showSuggestions && String(searchQuery || '').trim() && !searchLoading && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border bg-white shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
                      {getSuggestions(searchQuery).map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => { setSelectedSalon(s); setSearchQuery(s.nomenclatura || s.id); setShowSuggestions(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <div className="font-medium">{s.nomenclatura || s.nombre || s.id}</div>
                          <div className="text-xs text-gray-500">{s.nombre || s.id} {s.idConjunto ? `· Conjunto ${s.idConjunto}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => handleSearchSalon(searchQuery)} disabled={searchLoading} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  {searchLoading ? <Loader2 size={14} className="animate-spin" /> : 'Buscar'}
                </button>
                <button type="button" onClick={clearSelectedSalon} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                  Limpiar
                </button>
              </div>

              <div className="mt-4">
                {salonesLoading && !selectedSalon ? (
                  <div className="flex items-center justify-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Cargando salones...
                  </div>
                ) : selectedSalon ? (
                  <SalonEditorCard
                    key={selectedSalon.id}
                    title={`Salón ${selectedSalon.nomenclatura || selectedSalon.id}`}
                    salon={selectedSalon}
                    saving={salonesSavingId === selectedSalon.id}
                    allowDelete
                    onSave={(payload) => handleSaveSalon(selectedSalon.id, payload)}
                    onDelete={() => { handleDeleteSalon(selectedSalon.id); clearSelectedSalon() }}
                  />
                ) : (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                    Ingresa términos de búsqueda y presiona Enter o Busca para editar un solo salón.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {reportError && (
              <div className="rounded-3xl border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }}>
                <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> {reportError}</div>
              </div>
            )}

            <MachineReportsCard
              report={report}
              loading={reportLoading}
              reportScope={reportScope}
              onScopeChange={handleReportScopeChange}
              onRefresh={() => refreshReport(reportScope)}
              onExport={exportPdf}
            />
          </section>
        </div>
      </div>
    </div>
  )
}