import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  Camera,
  CheckCircle2,
  Clock,
  Zap,
  Eye,
  EyeOff,
  RotateCcw,
  Radio,
  CircleDot,
  Factory,
  RefreshCw,
  Wifi,
  AlertTriangle,
  X,
  MapPin,
  User,
  Info,
  ImageIcon,
  Bolt,
} from 'lucide-react'
import { TRACKNY_HTTP_URL, TRACKNY_WS_URL } from '../../constants'

// ─── Constants ────────────────────────────────────────────────────────────────

const RECONNECT_DELAY_MS = 2500
const VIDEO_META_ENDPOINT = `${TRACKNY_HTTP_URL}/api/video/meta`
const VIDEO_STREAM_ENDPOINT = `${TRACKNY_HTTP_URL}/api/video/live`
const VIDEO_SNAPSHOT_ENDPOINT = `${TRACKNY_HTTP_URL}/api/video/snapshot`

// ─── Zone metadata catalog ────────────────────────────────────────────────────
// Add or edit entries here to enrich any zone card/modal.
// Keys must match what the WebSocket sends (lowercase).

const ZONE_CATALOG = {
  'zona 1': {
    displayName:  'Taladro de columna',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    'Material de 4x4" máx. Brocas hasta de 1" de vástago',
    materials:    'Madera, polímeros sintéticos (acrílicos, estirenos y resina) no ferrosos (lámina de alu)',
    voltage:      'N/D',
    rpm:          '3000 r.p.m',
    use:          'Maquinaria para barrenado. Se utiliza con diferentes brocas de hasta 1" de vástago dependiendo del resultado que se deseé obtener',
    accessories:  [],
    image:       '/taladro-columna.jfif',
  },
  'zona 2': {
    displayName:  'Sierra cinta',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    'Piezas de 4x4" a 6". Espesores de 3 mm a 200 mm. Tipos de corte rectos',
    materials:    'Maderas',
    voltage:      '220V',
    rpm:          '3000 rpm',
    use:          'Herramienta para cortes exactos rectos',
    accessories:  [],
    image:        'sierra-cinta.png',
  },
  'zona 5': {
    displayName:  'Dobladora de lámina',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    '1 metro de longitud. Espesor máximo a doblar: 2 mm',
    materials:    'Lámina de aluminio, lámina galvanizada, lámina negra',
    voltage:      'N/D',
    rpm:          'Maquinaria Manual',
    use:          'Doblez de láminas de metal',
    accessories:  [],
    image:        'Dobladoras-Universales.webp',
  },
  'zona 6': {
    displayName:  'Cizalla de pedal',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    '1 metro de longitud. Espesor máximo a cortar: 2 mm',
    materials:    'Lámina de aluminio, lámina negra, lámina galvanizada',
    voltage:      'N/D',
    rpm:          'Maquinaria manual-mecanica',
    use:          'Corte de láminas',
    accessories:  [],
    image:        '/cizalla-pedal.webp',
  },
  'zona 4': {
    displayName:  'Fresadora TMD50-PRO',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    'Mesa de trabajo de 20 cm por 30 cm',
    materials:    'Madera y metales',
    voltage:      '220V',
    rpm:          '200 a 1800',
    use:          'Realización de barrenos cilíndricos, perforaciones cónicas o ranurado dependiendo del cortador colocado',
    accessories: [
      'Lámpara de halógeno (sólo TMD-50PRO o ZX50F)',
      'Avance longitudinal (sólo TMD-50PRO o ZX50F)',
      'Juego de boquillas R8',
      'Cono reductor R8-MT3',
      'Cono reductor MT3-MT2',
      'Prensa de 6” con base giratoria',
      'Chuck broquero',
      'Árbol R8 para chuck Broquero',
    ],
    image: '/tmd50-pro.webp',
  },
  'zona 3': {
    displayName:  'Taladro fresador',
    location:     'Taller industrial (J 128)',
    responsible:  'Jefe de taller industrial',
    workTable:    'Mesa de trabajo de 20 cm por 20 cm',
    materials:    'Madera y metales',
    voltage:      '220V',
    rpm:          '200 a 1800',
    use:          'Realización de barrenos cilíndricos, perforaciones cónicas o ranurado dependiendo del cortador colocado',
    accessories:  [],
    image:        '/taladro-fresador.webp',
  },
}

function canonicalizeZoneKey(key = '') {
  return String(key)
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function getZoneMeta(key) {
  const rawKey = String(key ?? '')
  const normalized = canonicalizeZoneKey(key)
  if (!normalized) return null
  const directMatch = (
    ZONE_CATALOG[normalized] ??
    ZONE_CATALOG[normalized.replace(/\s+/g, '')] ??
    null
  )
  if (directMatch) return directMatch

  // Fallback: if backend sends only a number or mixed label, map to "zona N".
  const numberMatch = rawKey.match(/\d+/)
  if (numberMatch) {
    return ZONE_CATALOG[`zona ${numberMatch[0]}`] ?? null
  }

  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeSocketPayload(payload) {
  if (!payload || typeof payload !== 'object') return { states: {}, totals: {} }
  if (payload.states && typeof payload.states === 'object') {
    return {
      states: payload.states,
      totals: typeof payload.totals_seconds === 'object' ? payload.totals_seconds : {},
    }
  }
  return {
    states: payload,
    totals: typeof payload.totals_seconds === 'object' ? payload.totals_seconds : {},
  }
}

function parseZoneEntries(states = {}, totals = {}) {
  return Object.entries(states)
    .filter(([key]) => key)
    .sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }))
    .map(([key, value]) => ({
      key,
      occupied: Number(value) === 1,
      totalSeconds: totals[key] ?? null,
    }))
}

function formatSeconds(secs) {
  if (secs === null || secs === undefined) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function PulsingDot({ color }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  )
}

function ConnectionBadge({ state }) {
  const configs = {
    connected:    { icon: Wifi,          label: 'En vivo',      dot: '#10b981', text: '#065f46', bg: '#d1fae5' },
    connecting:   { icon: Radio,         label: 'Conectando',   dot: '#3b82f6', text: '#1e40af', bg: '#dbeafe' },
    reconnecting: { icon: RotateCcw,     label: 'Reconectando', dot: '#f59e0b', text: '#92400e', bg: '#fef3c7' },
    error:        { icon: AlertTriangle, label: 'Sin conexión', dot: '#ef4444', text: '#991b1b', bg: '#fee2e2' },
  }
  const cfg = configs[state] ?? configs.connecting
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
      <PulsingDot color={cfg.dot} />
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ zones }) {
  const total    = zones.length
  const occupied = zones.filter(z => z.occupied).length
  const free     = total - occupied
  const pct      = total > 0 ? Math.round((occupied / total) * 100) : 0

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Resumen de ocupación</p>
        <p className="text-xs font-bold" style={{ color: 'var(--color-site-black)' }}>{pct}% en uso</p>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-border)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: pct > 70 ? '#dc2626' : pct > 40 ? '#f59e0b' : '#10b981' }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Total',    value: total,    color: 'var(--color-site-black)' },
          { label: 'Ocupadas', value: occupied, color: '#dc2626' },
          { label: 'Libres',   value: free,     color: '#059669' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl py-2" style={{ background: 'var(--color-bg)' }}>
            <p className="text-xl font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Machine card ─────────────────────────────────────────────────────────────

function MachineCard({ zone, index, onOpen }) {
  const { key, occupied, totalSeconds } = zone
  const meta      = getZoneMeta(key)
  const timeLabel = formatSeconds(totalSeconds)

  return (
    <article
      className="group rounded-3xl p-4 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1"
      style={{
        background:     'linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%)',
        border:         `1.5px solid ${occupied ? '#fca5a5' : '#86efac'}`,
        boxShadow:      occupied ? '0 8px 22px rgba(220,38,38,0.10)' : '0 8px 22px rgba(5,150,105,0.10)',
        animationDelay: `${index * 60}ms`,
        cursor:         meta ? 'pointer' : 'default',
      }}
      onClick={() => meta && onOpen(zone)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ background: occupied ? '#fef2f2' : '#ecfdf5', color: occupied ? '#dc2626' : '#059669' }}
          >
            <Factory size={18} />
            <span
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2"
              style={{ background: occupied ? '#ef4444' : '#10b981', borderColor: 'var(--color-site-white)' }}
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold capitalize truncate" style={{ color: 'var(--color-site-black)' }}>
              {meta?.displayName ?? key}
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              {meta ? key : 'Visión por computadora'}
            </p>
          </div>
        </div>
        <span
          className="flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-black tracking-wide"
          style={{ background: occupied ? '#fecaca' : '#bbf7d0', color: occupied ? '#991b1b' : '#166534' }}
        >
          {occupied ? 'OCUPADA' : 'LIBRE'}
        </span>
      </div>

      <div style={{ height: '1px', background: 'var(--color-border)' }} />

      <div className="flex items-center gap-2">
        {occupied
          ? <Activity size={13} style={{ color: '#dc2626' }} />
          : <CheckCircle2 size={13} style={{ color: '#059669' }} />}
        <p className="text-xs font-medium" style={{ color: 'var(--color-site-black)' }}>
          {occupied ? 'Máquina en uso — no disponible' : 'Disponible para usarse ahora'}
        </p>
      </div>

      {timeLabel && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
          <Clock size={11} style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tiempo acumulado hoy:</p>
          <p className="ml-auto text-xs font-bold" style={{ color: 'var(--color-site-black)' }}>{timeLabel}</p>
        </div>
      )}

      {meta && (
        <>
          <div className="rounded-2xl p-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-muted)' }}>
              Ficha rapida
            </p>
            <div className="flex gap-3">
              <div
                className="relative w-24 flex-shrink-0 overflow-hidden rounded-xl"
                style={{
                  aspectRatio: '3 / 4',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-site-white)',
                }}
              >
                {meta.image ? (
                  <img
                    src={meta.image}
                    alt={`Foto de ${meta.displayName}`}
                    className="block h-full w-full"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    <ImageIcon size={17} />
                    <p className="text-[10px]">Sin foto</p>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-tight" style={{ color: 'var(--color-site-black)' }}>
                  <strong>Ubicación:</strong> {meta.location}
                </p>
                <p className="mt-1 text-[11px] leading-tight" style={{ color: 'var(--color-site-black)' }}>
                  <strong>Mesa:</strong> {meta.workTable}
                </p>
                <p className="mt-1 text-[11px] leading-tight" style={{ color: 'var(--color-site-black)' }}>
                  <strong>Responsable:</strong> {meta.responsible}
                </p>
                <p className="mt-1 text-[11px] leading-tight" style={{ color: 'var(--color-site-black)' }}>
                  <strong>Materiales:</strong> {meta.materials}
                </p>
                <div className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: '#e8f0ff', color: '#1e40af' }}>
                  {`Alimentacion ${meta.voltage} | RPM ${meta.rpm}`}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {meta && (
        <p className="text-[11px] text-right" style={{ color: 'var(--color-text-muted)' }}>
          Ver ficha técnica →
        </p>
      )}
    </article>
  )
}

// ─── Zone detail modal ────────────────────────────────────────────────────────

function ZoneModal({ zone, onClose }) {
  const meta = getZoneMeta(zone.key)
  if (!meta) return null

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const Field = ({ label, value }) => (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p className="mt-1 text-xs font-semibold leading-snug" style={{ color: 'var(--color-site-black)' }}>{value}</p>
    </div>
  )

  const SectionTitle = ({ icon: Icon, children }) => (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
      <Icon size={10} />
      {children}
    </p>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: 'rgba(5,10,20,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex w-full flex-col overflow-hidden sm:max-w-4xl"
        style={{
          background:   'linear-gradient(180deg, #ffffff 0%, #fcfcfc 100%)',
          border:       '1px solid var(--color-border)',
          maxHeight:    '92dvh',
          borderRadius: '24px 24px 0 0',
          boxShadow:    '0 24px 60px rgba(15,23,42,0.25)',
        }}
      >
        {/* Sticky header */}
        <div className="flex flex-shrink-0 items-start justify-between gap-4 px-5 pt-5 pb-4 sm:px-6"
          style={{ borderBottom: '1px solid var(--color-border)', background: 'linear-gradient(135deg, rgba(204,0,0,0.08) 0%, rgba(204,0,0,0.02) 100%)' }}>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: zone.occupied ? '#fecaca' : '#bbf7d0', color: zone.occupied ? '#991b1b' : '#166534' }}
              >
                {zone.occupied ? <Activity size={9} /> : <CheckCircle2 size={9} />}
                {zone.occupied ? 'OCUPADA' : 'LIBRE'}
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                {zone.key}
              </span>
            </div>
            <h2 className="truncate text-lg font-extrabold leading-tight sm:text-xl" style={{ color: 'var(--color-site-black)' }}>
              {meta.displayName}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <MapPin size={10} />
              {meta.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="overflow-y-auto px-5 pb-6 pt-4 sm:px-6"
          style={{ maxHeight: 'calc(92dvh - 96px)' }}
        >
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--color-border)', background: '#f4f4f5' }}>
              {meta.image ? (
                <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl" style={{ aspectRatio: '3 / 4', background: '#000' }}>
                  <img
                    src={meta.image}
                    alt={meta.displayName}
                    className="block h-full w-full"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-[280px] flex-col items-center justify-center gap-2 rounded-xl py-12" style={{ aspectRatio: '3 / 4', color: 'var(--color-text-muted)', background: 'var(--color-site-white)' }}>
                  <ImageIcon size={24} />
                  <p className="text-xs">Sin imagen registrada</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-3" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)' }}>
              <SectionTitle icon={Bolt}>Características técnicas</SectionTitle>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: '#e8f0ff', color: '#1e40af' }}>
                  Alimentación: {meta.voltage}
                </span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: '#ecfdf5', color: '#065f46' }}>
                  RPM: {meta.rpm}
                </span>
              </div>
            </div>

            <div className="rounded-2xl p-3" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)' }}>
              <SectionTitle icon={User}>Información general</SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Ubicación" value={meta.location} />
                <Field label="Responsable" value={meta.responsible} />
                <Field label="Mesa de trabajo" value={meta.workTable} />
                <Field label="Materiales" value={meta.materials} />
              </div>
            </div>

            <div className="rounded-2xl p-3" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)' }}>
              <SectionTitle icon={Info}>Uso</SectionTitle>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-site-black)' }}>{meta.use}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ connectionState, wsUrl }) {
  return (
    <div className="rounded-3xl px-6 py-16 text-center" style={{ background: 'var(--color-site-white)', border: '1.5px dashed var(--color-border)' }}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(204,0,0,0.07)', color: 'var(--color-primary)' }}>
        <CircleDot size={22} />
      </div>
      <p className="text-base font-bold" style={{ color: 'var(--color-site-black)' }}>
        {connectionState === 'connected' ? 'Sin datos aún' : 'Esperando conexión…'}
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {connectionState === 'connected'
          ? 'El WebSocket está conectado; aguardando el primer mensaje del backend.'
          : 'Estableciendo conexión con el servidor de visión.'}
      </p>
      <p className="mt-4 inline-block rounded-lg px-3 py-1 text-[11px] font-mono break-all"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
        {wsUrl}
      </p>
    </div>
  )
}

// ─── Camera section ───────────────────────────────────────────────────────────

function CameraSection({ streamUrl, snapshotUrl, cameraAvailable, cameraLoading, onError }) {
  return (
    <section className="rounded-3xl overflow-hidden" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Camera size={14} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-site-black)' }}>Cámara en vivo</h2>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: cameraAvailable ? '#d1fae5' : '#fee2e2', color: cameraAvailable ? '#065f46' : '#991b1b' }}
        >
          {cameraAvailable && <PulsingDot color="#10b981" />}
          {cameraAvailable ? 'Señal activa' : 'Sin señal'}
        </span>
      </div>
      {cameraLoading ? (
        <div className="flex items-center justify-center py-14 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
            Validando disponibilidad…
          </div>
        </div>
      ) : (
        <div style={{ background: '#0a0a0a' }}>
          <img
            src={cameraAvailable ? streamUrl : `${snapshotUrl}?t=${Date.now()}`}
            alt={cameraAvailable ? 'Video en vivo de ocupación' : 'Último snapshot de cámara'}
            className="block h-auto w-full"
            style={{ maxHeight: '58dvh', objectFit: 'cover' }}
            loading="eager"
            onError={onError}
          />
        </div>
      )}
      {!cameraLoading && !cameraAvailable && (
        <p className="px-5 py-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Mostrando último snapshot disponible.</p>
      )}
    </section>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function MaquinasPanel() {
  const [connectionState, setConnectionState] = useState('connecting')
  const [zones, setZones]                     = useState([])
  const [error, setError]                     = useState('')
  const [showCamera, setShowCamera]           = useState(false)
  const [cameraAvailable, setCameraAvailable] = useState(false)
  const [cameraLoading, setCameraLoading]     = useState(true)
  const [lastUpdated, setLastUpdated]         = useState(null)
  const [selectedZone, setSelectedZone]       = useState(null)
  const reconnectTimerRef = useRef(null)
  const socketRef         = useRef(null)

  // WebSocket
  useEffect(() => {
    let cancelled = false

    const cleanupSocket = () => {
      if (reconnectTimerRef.current) { window.clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
      if (socketRef.current) {
        socketRef.current.onopen = socketRef.current.onmessage =
          socketRef.current.onerror = socketRef.current.onclose = null
        socketRef.current.close()
        socketRef.current = null
      }
    }

    const connect = () => {
      cleanupSocket()
      try {
        const socket = new WebSocket(TRACKNY_WS_URL)
        socketRef.current = socket
        socket.onopen    = () => { if (cancelled) return; setConnectionState('connected'); setError('') }
        socket.onmessage = (event) => {
          if (cancelled) return
          try {
            const payload = normalizeSocketPayload(JSON.parse(event.data))
            setZones(parseZoneEntries(payload.states, payload.totals))
            setConnectionState('connected')
            setLastUpdated(new Date())
            setError('')
          } catch { setError('El WebSocket respondió con un formato no válido.') }
        }
        socket.onerror = () => { if (cancelled) return; setConnectionState('error'); setError('No se pudo establecer la conexión con el WebSocket.') }
        socket.onclose = () => { if (cancelled) return; setConnectionState('reconnecting'); reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS) }
      } catch { setConnectionState('error'); setError('No se pudo crear la conexión WebSocket.') }
    }

    connect()
    return () => { cancelled = true; cleanupSocket() }
  }, [])

  // Camera polling
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      setCameraLoading(true)
      try {
        const res = await fetch(VIDEO_META_ENDPOINT)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setCameraAvailable(Boolean(data?.available))
      } catch { if (!cancelled) setCameraAvailable(false) }
      finally   { if (!cancelled) setCameraLoading(false) }
    }
    check()
    const id = window.setInterval(check, 15000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])

  return (
    <section className="h-full overflow-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">

        {/* ── Header ── */}
        <header className="rounded-3xl p-5 md:p-6" style={{ background: 'var(--color-site-white)', border: '1px solid var(--color-border)', boxShadow: '0 8px 24px rgba(17,17,17,0.05)' }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ background: 'rgba(204,0,0,0.08)', color: 'var(--color-primary)' }}>
                <Zap size={10} />
                Monitoreo en tiempo real
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl" style={{ color: 'var(--color-site-black)' }}>
                Estado de máquinas
              </h1>
              {lastUpdated && (
                <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={10} />
                  Última actualización: {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ConnectionBadge state={connectionState} />
              <button type="button" onClick={() => setShowCamera(c => !c)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: showCamera ? 'rgba(204,0,0,0.09)' : 'var(--color-bg)', border: `1px solid ${showCamera ? 'rgba(204,0,0,0.25)' : 'var(--color-border)'}`, color: 'var(--color-primary)' }}>
                {showCamera ? <EyeOff size={11} /> : <Eye size={11} />}
                {showCamera ? 'Ocultar cámara' : 'Ver cámara'}
              </button>
              <button type="button" onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <RefreshCw size={11} />
                Recargar
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-medium" style={{ color: 'var(--color-site-black)' }}><strong>OCUPADA</strong> — en uso ahora</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium" style={{ color: 'var(--color-site-black)' }}><strong>LIBRE</strong> — disponible</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>· Toca una tarjeta para ver su ficha técnica</span>
          </div>
        </header>

        {showCamera && (
          <CameraSection
            streamUrl={VIDEO_STREAM_ENDPOINT}
            snapshotUrl={VIDEO_SNAPSHOT_ENDPOINT}
            cameraAvailable={cameraAvailable}
            cameraLoading={cameraLoading}
            onError={() => setCameraAvailable(false)}
          />
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
            style={{ background: 'rgba(204,0,0,0.06)', border: '1px solid rgba(204,0,0,0.18)', color: 'var(--color-primary-dark)' }}>
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {zones.length === 0 ? (
          <EmptyState connectionState={connectionState} wsUrl={TRACKNY_WS_URL} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {zones.map((zone, i) => (
              <MachineCard key={zone.key} zone={zone} index={i} onOpen={setSelectedZone} />
            ))}
          </div>
        )}

      </div>

      {/* ── Zone detail modal ── */}
      {selectedZone && <ZoneModal zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </section>
  )
}