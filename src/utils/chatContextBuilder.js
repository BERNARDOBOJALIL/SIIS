const J_CODE_PATTERN = /\bJ[\s_-]?(\d{1,3})\b/i

export const SIIS_CHAT_CONTEXT_KEYS = {
  activeFloor: 'siis_active_floor',
  lastSelectedSalon: 'siis_last_selected_salon',
  routeGuidance: 'siis_route_guidance',
}

export const SIIS_CHAT_EVENT_NAMES = {
  autoRouteRequest: 'siis:auto-route-request',
}

const SCHEDULE_LITERAL_MARKERS = [
  'horario completo',
  'horarios completos',
  'todos los horarios',
  'todas las clases',
  'calendario completo',
  'detalle de horario',
  'detalle de horarios',
]

const SCHEDULE_TOPIC_MARKERS = ['horario', 'horarios', 'calendario', 'calendarios', 'clase', 'clases']
const SCHEDULE_DETAIL_MARKERS = ['completo', 'completa', 'detalle', 'detallado', 'detallada', 'todos', 'todas', 'semanal']
const ROUTE_PROMPT_MARKERS = [
  'como llego',
  'como llegar',
  'indicaciones',
  'direccion',
  'direccion aproximada',
  'ruta',
  'camino',
  'izquierda',
  'derecha',
  'donde',
  'ubicacion',
  'esta',
]
const SALON_QUERY_MARKERS = [
  'salon',
  'salones',
  'laboratorio',
  'equipamiento',
  'equipo',
  'responsable',
  'responsables',
  'docente',
  'profesor',
  'administrativo',
  'j-',
]

const AUTO_ROUTE_PROMPT_MARKERS = [
  'como llego',
  'como llegar',
  'indicaciones',
  'ruta',
  'guiame',
  'llevame',
  'donde esta',
  'ubicame',
]

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeFloorLabel(value) {
  const raw = String(value || '').trim()
  const normalized = normalizeText(raw)

  if (normalized === 'pb' || normalized === 'planta baja' || normalized === 'baja') return 'planta baja'
  if (normalized === 'pa' || normalized === 'planta alta' || normalized === 'alta') return 'planta alta'
  return raw || ''
}

function extractJCodeNumber(...values) {
  for (const value of values) {
    const text = String(value || '')
    const match = text.match(J_CODE_PATTERN)
    if (!match) continue
    const parsed = Number.parseInt(match[1], 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function zoneHintFromCode(code) {
  if (!Number.isFinite(code)) return ''
  if (code <= 7) return 'Bloque derecho'
  if (code >7 &&  code < 12) return 'A la izquierda de la entrada principal'
  if (code >= 12 && code <= 19) return 'Bloque izquierdo'
  if (code >= 20 && code <= 24) return 'Zona central por la explanada'
  if (code == 25) return 'En la explanda'
  return 'A la derecha de la entrada principal'
}

function stairsHintFromCode(code) {
  if (!Number.isFinite(code)) return ''
  if (code >= 12 && code <= 19) return 'referencia cercana a la escalera izquierda'
  if (code >= 1  && code <= 7) return 'referencia cercana a la escalera derecha'
  return ''
}

function specialAreaHint(nameBlob) {
  const normalized = normalizeText(nameBlob)
  if (!normalized) return ''
  if (normalized.includes('enfermer') || normalized.includes('primeros auxilios')) return 'zona de servicios de apoyo'
  if (normalized.includes('easyplot') || normalized.includes('oficina')) return 'zona administrativa'
  if (normalized.includes('laboratorio')) return 'bloque de laboratorios'
  return ''
}

function buildApproxLocation(salon) {
  const nomenclatura = String(salon?.nomenclatura || '').trim()
  const nombre = String(salon?.nombre || '').trim()
  const piso = normalizeFloorLabel(salon?.piso)
  const code = extractJCodeNumber(nomenclatura, nombre)

  const hints = [
    piso,
    zoneHintFromCode(code),
    stairsHintFromCode(code),
    specialAreaHint(`${nomenclatura} ${nombre}`),
  ].filter(Boolean)

  const unique = [...new Set(hints)]
  return unique.join(', ')
}

function cleanEquipamiento(value, maxItems = 8) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()

  value.forEach((item) => {
    const text = String(item || '').trim()
    if (!text) return
    const key = normalizeText(text)
    if (!key || seen.has(key)) return
    seen.add(key)
    if (out.length < maxItems) out.push(text)
  })

  return out
}

function tokenize(normalizedPrompt) {
  if (!normalizedPrompt) return []
  return normalizedPrompt.split(' ').filter(token => token.length >= 3)
}

function scoreSalon(salon, promptNorm, tokens) {
  const nomenclatura = normalizeText(salon?.nomenclatura)
  const nombre = normalizeText(salon?.nombre)
  const piso = normalizeText(salon?.piso)
  const tipo = normalizeText(salon?.tipo)
  const equip = normalizeText((cleanEquipamiento(salon?.equipamiento) || []).join(' '))
  const blob = `${nomenclatura} ${nombre} ${piso} ${tipo} ${equip}`.trim()

  if (!blob) return 0

  let score = 0
  if (nomenclatura && promptNorm.includes(nomenclatura)) score += 5
  if (nombre && promptNorm.includes(nombre)) score += 4

  tokens.forEach((token) => {
    if (blob.includes(token)) score += 1
  })

  return score
}

function compactSalon(salon) {
  return {
    nomenclatura: String(salon?.nomenclatura || '').trim(),
    nombre: String(salon?.nombre || '').trim(),
    tipo: String(salon?.tipo || '').trim(),
    piso: normalizeFloorLabel(salon?.piso),
    ubicacion_aproximada: buildApproxLocation(salon),
    equipamiento: cleanEquipamiento(salon?.equipamiento),
  }
}

function readJSONFromLocalStorage(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readMapContext() {
  if (typeof window === 'undefined') {
    return { activeFloor: null, selectedSalon: null, routeGuidance: null }
  }

  const activeFloor = window.localStorage.getItem(SIIS_CHAT_CONTEXT_KEYS.activeFloor)
  const selectedSalon = readJSONFromLocalStorage(SIIS_CHAT_CONTEXT_KEYS.lastSelectedSalon)
  const routeGuidance = readJSONFromLocalStorage(SIIS_CHAT_CONTEXT_KEYS.routeGuidance)
  return {
    activeFloor: String(activeFloor || '').trim() || null,
    selectedSalon: selectedSalon && typeof selectedSalon === 'object' ? selectedSalon : null,
    routeGuidance: routeGuidance && typeof routeGuidance === 'object' ? routeGuidance : null,
  }
}

function shouldIncludeRouteGuidance(promptNorm, routeGuidance) {
  const routeActive = Boolean(routeGuidance?.active)
  if (!routeActive) return false
  if (!promptNorm) return true
  return (
    ROUTE_PROMPT_MARKERS.some(marker => promptNorm.includes(marker))
    || SALON_QUERY_MARKERS.some(marker => promptNorm.includes(marker))
    || routeActive
  )
}

function compactRouteGuidance(routeGuidance) {
  if (!routeGuidance || typeof routeGuidance !== 'object') return null

  const steps = Array.isArray(routeGuidance.steps)
    ? routeGuidance.steps.map(step => String(step || '').trim()).filter(Boolean).slice(0, 5)
    : []

  const directionSteps = Array.isArray(routeGuidance.directionSteps)
    ? routeGuidance.directionSteps
      .map(step => String(step || '').trim())
      .filter(Boolean)
      .slice(0, 3)
    : []

  const payload = {
    active: Boolean(routeGuidance.active),
    floor: String(routeGuidance.floor || '').trim() || null,
    origin: String(routeGuidance.origin || '').trim() || null,
    destination: String(routeGuidance.destination || '').trim() || null,
    left_turns: Number.isFinite(routeGuidance.leftTurns) ? routeGuidance.leftTurns : null,
    right_turns: Number.isFinite(routeGuidance.rightTurns) ? routeGuidance.rightTurns : null,
    direction_steps: directionSteps,
    steps,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value != null && value !== '' && value !== false && !(Array.isArray(value) && value.length === 0)),
  )
}

function requestsDetailedSchedule(promptNorm) {
  if (!promptNorm) return false

  if (SCHEDULE_LITERAL_MARKERS.some(marker => promptNorm.includes(marker))) {
    return true
  }

  const hasTopic = SCHEDULE_TOPIC_MARKERS.some(marker => promptNorm.includes(marker))
  const hasDetail = SCHEDULE_DETAIL_MARKERS.some(marker => promptNorm.includes(marker))
  return hasTopic && hasDetail
}

function findSalonBySelection(selection, salones) {
  if (!selection || !Array.isArray(salones) || salones.length === 0) return null

  const candidates = [selection.name, selection.rawName, selection.fullName]
    .map(value => normalizeText(value))
    .filter(Boolean)

  if (candidates.length === 0) return null

  for (const salon of salones) {
    const nom = normalizeText(salon?.nomenclatura)
    const nombre = normalizeText(salon?.nombre)
    if (candidates.some(token => token === nom || token === nombre || nom.includes(token) || nombre.includes(token))) {
      return salon
    }
  }

  return null
}

function hasAutoRouteIntent(promptNorm) {
  if (!promptNorm) return false
  return AUTO_ROUTE_PROMPT_MARKERS.some(marker => promptNorm.includes(marker))
}

function formatJCodeFromPrompt(promptText) {
  const match = String(promptText || '').match(J_CODE_PATTERN)
  if (!match) return null
  const number = Number.parseInt(match[1], 10)
  if (!Number.isFinite(number)) return null
  return `J-${String(number).padStart(3, '0')}`
}

function findSalonByJCode(jCode, salones) {
  if (!jCode || !Array.isArray(salones) || salones.length === 0) return null
  const target = normalizeText(jCode)
  return salones.find((salon) => {
    const nom = normalizeText(salon?.nomenclatura)
    return nom === target || nom.includes(target)
  }) || null
}

function findBestSalonFromPrompt(promptText, promptNorm, salones) {
  if (!Array.isArray(salones) || salones.length === 0) return null

  const jCode = formatJCodeFromPrompt(promptText)
  const byCode = findSalonByJCode(jCode, salones)
  if (byCode) return byCode

  const tokens = tokenize(promptNorm)
  const scored = salones
    .map(salon => ({ salon, score: scoreSalon(salon, promptNorm, tokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.salon || null
}

export function buildAutoRouteRequest({ prompt, salones = [] } = {}) {
  const promptText = String(prompt || '').trim()
  if (!promptText) return { enabled: false }

  const promptNorm = normalizeText(promptText)
  if (!hasAutoRouteIntent(promptNorm)) {
    return { enabled: false }
  }

  const targetSalon = findBestSalonFromPrompt(promptText, promptNorm, salones)
  if (!targetSalon) {
    return { enabled: false }
  }

  const targetLabel = String(targetSalon?.nomenclatura || targetSalon?.nombre || '').trim()
  if (!targetLabel) {
    return { enabled: false }
  }

  return {
    enabled: true,
    targetLabel,
    targetSalon: compactSalon(targetSalon),
  }
}

function pickRelevantSalones(promptNorm, salones, maxItems = 3) {
  if (!Array.isArray(salones) || salones.length === 0) return []
  const tokens = tokenize(promptNorm)

  const scored = salones
    .map(salon => ({ salon, score: scoreSalon(salon, promptNorm, tokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, maxItems).map(item => compactSalon(item.salon))
}

export function buildFrontendChatContext({ prompt, salones = [], maxChars = 1400 } = {}) {
  const promptText = String(prompt || '').trim()
  if (!promptText) return ''

  const promptNorm = normalizeText(promptText)
  const mapContext = readMapContext()
  const relevantSalones = pickRelevantSalones(promptNorm, salones, 3)
  const selectedSalon = findSalonBySelection(mapContext.selectedSalon, salones)
  const includeRouteGuidance = shouldIncludeRouteGuidance(promptNorm, mapContext.routeGuidance)
  const routeGuidance = includeRouteGuidance ? compactRouteGuidance(mapContext.routeGuidance) : null

  const basePayload = {
    source: 'siis_frontend',
    active_floor: mapContext.activeFloor,
    last_selected_salon: selectedSalon ? compactSalon(selectedSalon) : mapContext.selectedSalon,
    route_guidance: routeGuidance,
    schedule_detail_requested_ui: requestsDetailedSchedule(promptNorm),
  }

  const buildPayload = (salonesSlice) => {
    const payload = { ...basePayload }
    if (Array.isArray(salonesSlice) && salonesSlice.length > 0) {
      payload.relevant_salones = salonesSlice
    }

    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value != null && value !== '' && value !== false),
    )
  }

  let currentSalones = [...relevantSalones]
  let serialized = ''

  while (currentSalones.length >= 0) {
    const payload = buildPayload(currentSalones)
    serialized = JSON.stringify(payload)
    if (serialized.length <= maxChars || currentSalones.length === 0) {
      break
    }
    currentSalones = currentSalones.slice(0, -1)
  }

  return `SIIS_FRONTEND_CONTEXT\n${serialized}`
}
