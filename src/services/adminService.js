import { http } from './http'

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
  if (Array.isArray(response)) return response.map(normalizeReportItem)
  if (Array.isArray(response?.records)) return response.records.map(normalizeReportItem)
  if (Array.isArray(response?.data)) return response.data.map(normalizeReportItem)
  if (response?.totals_seconds || response?.totalsSeconds || response?.totals) {
    return buildFromTotals(response)
  }
  return []
}

export async function getMachineOccupancyReport() {
  const response = await http.get('/ocupacion/hoy')
  return normalizeMachineReport(response)
}