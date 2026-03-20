export const DAYS = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sabado', label: 'Sáb' },
]

export const START_MINUTES = 7 * 60
export const END_MINUTES = 21 * 60
export const BLOCK_MINUTES = 30

export const TIME_BLOCKS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / BLOCK_MINUTES },
  (_, index) => START_MINUTES + (index * BLOCK_MINUTES),
)

export function getEmptyHorarios() {
  return {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
  }
}

export function toDateValue(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function minutesToTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mins = String(minutes % 60).padStart(2, '0')
  return `${hours}:${mins}`
}

export function timeToMinutes(timeString) {
  const [h = '0', m = '0'] = String(timeString || '0:0').split(':')
  return (Number(h) * 60) + Number(m)
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameWeekday(date, expectedIndex) {
  const day = date.getDay()
  const index = day === 0 ? 6 : day - 1
  return index === expectedIndex
}

export function buildDateForCell(weekStart, dayIndex, blockIndex) {
  const date = addDays(weekStart, dayIndex)
  const minutes = START_MINUTES + (blockIndex * BLOCK_MINUTES)
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return date
}

export function dateToBlockIndex(date) {
  const minutes = (date.getHours() * 60) + date.getMinutes()
  return Math.floor((minutes - START_MINUTES) / BLOCK_MINUTES)
}

export function dayRangesToSet(ranges = []) {
  const set = new Set()
  ranges.forEach((range) => {
    const startMinutes = timeToMinutes(range.inicio)
    const endMinutes = timeToMinutes(range.fin)
    const startIndex = Math.max(0, Math.floor((startMinutes - START_MINUTES) / BLOCK_MINUTES))
    const endIndex = Math.min(TIME_BLOCKS.length, Math.ceil((endMinutes - START_MINUTES) / BLOCK_MINUTES))
    for (let idx = startIndex; idx < endIndex; idx += 1) {
      set.add(idx)
    }
  })
  return set
}

export function setToDayRanges(set) {
  const indices = [...set].sort((a, b) => a - b)
  if (indices.length === 0) return []

  const ranges = []
  let runStart = indices[0]
  let prev = indices[0]

  for (let i = 1; i < indices.length; i += 1) {
    const current = indices[i]
    if (current !== prev + 1) {
      ranges.push({
        inicio: minutesToTime(START_MINUTES + (runStart * BLOCK_MINUTES)),
        fin: minutesToTime(START_MINUTES + ((prev + 1) * BLOCK_MINUTES)),
      })
      runStart = current
    }
    prev = current
  }

  ranges.push({
    inicio: minutesToTime(START_MINUTES + (runStart * BLOCK_MINUTES)),
    fin: minutesToTime(START_MINUTES + ((prev + 1) * BLOCK_MINUTES)),
  })

  return ranges
}

export function getRangeBounds(drag) {
  const start = Math.min(drag.startIndex, drag.currentIndex)
  const end = Math.max(drag.startIndex, drag.currentIndex)
  return { start, end }
}

export function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 5)
  return `${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(weekStart)} - ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(weekEnd)}`
}
