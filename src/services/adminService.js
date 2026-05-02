import { TRACKNY_HTTP_URL } from '../constants'

function normalizeMachineId(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, '')
    .replace(/\s+/g, '')
}

function parseDateValue(value) {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value?.$date) return String(value.$date)
  return null
}

function normalizeReportItem(item) {
  const machineId = normalizeMachineId(item?.machine_id || item?.machineId || item?.zona || '')
  const occupiedSeconds = Number(item?.occupied_seconds ?? item?.occupiedSeconds ?? 0)

  return {
    date: String(item?.date || '').trim(),
    machine_id: machineId,
    occupied_seconds: Number.isFinite(occupiedSeconds) ? occupiedSeconds : 0,
    created_at: parseDateValue(item?.created_at || item?.createdAt),
    updated_at: parseDateValue(item?.updated_at || item?.updatedAt),
  }
}

function buildFromTotals(response) {
  const totals = response?.totals_seconds || response?.totalsSeconds || response?.totals || {}
  return Object.entries(totals)
    .filter(([machineId]) => machineId)
    .map(([machineId, occupiedSeconds]) => normalizeReportItem({
      date: response?.date || '',
      machine_id: machineId,
      occupied_seconds: occupiedSeconds,
      created_at: response?.created_at || response?.createdAt,
      updated_at: response?.updated_at || response?.updatedAt,
    }))
}

function normalizeMachineReport(response) {
  if (response?.machine_id || response?.machineId) return [normalizeReportItem(response)]
  if (Array.isArray(response)) return response.map(normalizeReportItem)
  if (Array.isArray(response?.records)) return response.records.map(normalizeReportItem)
  if (Array.isArray(response?.data)) return response.data.map(normalizeReportItem)
  if (Array.isArray(response?.items)) return response.items.map(normalizeReportItem)
  if (response?.totals_seconds || response?.totalsSeconds || response?.totals) {
    return buildFromTotals(response)
  }
  return []
}

function buildTracknyEndpoint(path) {
  return import.meta.env.DEV ? `/trackny-proxy${path}` : `${TRACKNY_HTTP_URL}${path}`
}

async function fetchTracknyJson(path) {
  const response = await fetch(buildTracknyEndpoint(path))

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    const error = new Error(errorPayload.message || `Error ${response.status}`)
    error.status = response.status
    throw error
  }

  return response.json()
}

async function fetchTracknyOccupancyToday() {
  return fetchTracknyJson('/api/ocupacion/hoy')
}

export async function getMachineOccupancyReport() {
  const response = await fetchTracknyOccupancyToday()
  return normalizeMachineReport(response)
}

export async function getMachineOccupancyRecords(scope = 'today') {
  if (scope !== 'all') {
    return getMachineOccupancyReport()
  }

  const response = await fetchTracknyJson('/api/ocupacion/registros')
  return normalizeMachineReport(response)
}