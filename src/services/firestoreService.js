import {
  doc, getDoc, collection, query, where, getDocs,
  runTransaction, addDoc, serverTimestamp, setDoc, Timestamp, deleteDoc,
} from 'firebase/firestore'
import { db, dbSalones } from './firebase'

const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

function getWeekStart(date = new Date()) {
  const current = new Date(date)
  current.setHours(0, 0, 0, 0)
  const day = current.getDay()
  const diff = day === 0 ? -6 : 1 - day
  current.setDate(current.getDate() + diff)
  return current
}

function buildDateFromTime(baseDate, timeString) {
  const [hoursStr = '0', minutesStr = '0'] = String(timeString || '0:0').split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const date = new Date(baseDate)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function getDefaultHorarios() {
  return {
    lunes: [],
    martes: [],
    miercoles: [],
    jueves: [],
    viernes: [],
    sabado: [],
  }
}

function toDate(value) {
  if (!value) return null
  if (value?.toDate) return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Obtiene los datos del usuario desde la colección 'usuarios' usando su UID.
 * @param {string} uid - UID del usuario autenticado en Firebase
 * @returns {Promise<Object|null>} Objeto con datos del usuario incluyendo rol, o null si no existe
 */
export async function getUserDataFromFirestore(uid) {
  try {
    const userDocRef = doc(db, 'usuarios', uid)
    const userSnapshot = await getDoc(userDocRef)

    if (!userSnapshot.exists()) {
      console.warn(`Usuario con UID ${uid} no encontrado en Firestore`)
      return null
    }

    return {
      uid,
      ...userSnapshot.data(),
    }
  } catch (error) {
    console.error('Error fetching user data from Firestore:', error)
    return null
  }
}

/**
 * Obtiene lista de académicos desde 'usuarios' filtrado por rol: "ACADEMICO"
 * @returns {Promise<Array>} Lista de académicos con uid, nombre, email, etc.
 */
export async function getAcademicos() {
  try {
    const usuariosRef = collection(db, 'usuarios')
    const q = query(usuariosRef, where('rol', '==', 'ACADEMICO'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error fetching académicos:', error)
    return []
  }
}

/**
 * Obtiene slots disponibles de un académico desde calendarios/{academicoId}/slots
 * @param {string} academicoId - UID del académico
 * @returns {Promise<Array>} Lista de slots disponibles
 */
export async function getAcademicoSlots(academicoId) {
  try {
    const slotsRef = collection(db, `calendarios/${academicoId}/slots`)
    const q = query(slotsRef, where('disponible', '==', true))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(slotDoc => {
      const data = slotDoc.data()
      const inicioDate = toDate(data.inicio)
      const finDate = toDate(data.fin)
      const ventanaDuracion = inicioDate && finDate ? Math.round((finDate.getTime() - inicioDate.getTime()) / 60000) : null

      return {
        slotId: slotDoc.id,
        ...data,
        inicio: data.inicio,
        fin: data.fin,
        ventanaDuracion: ventanaDuracion && ventanaDuracion > 0 ? ventanaDuracion : null,
      }
    })
  } catch (error) {
    console.error(`Error fetching slots for académico ${academicoId}:`, error)
    return []
  }
}

/**
 * Crea una cita desde una ventana de disponibilidad sin bloquear el slot.
 * @param {Object} data - { estudianteId, academicoId, slotId, fechaHora, duracion, motivo }
 * @returns {Promise<string>} ID del documento cita creado
 */
export async function crearCita(data) {
  const { estudianteId, academicoId, slotId, fechaHora, duracion, motivo } = data

  try {
    const slotRef = doc(db, `calendarios/${academicoId}/slots`, slotId)
    const slotSnap = await getDoc(slotRef)

    if (!slotSnap.exists()) {
      throw new Error(`Slot ${slotId} no encontrado`)
    }

    const slotData = slotSnap.data()
    const inicioVentana = toDate(slotData.inicio)
    const finVentana = toDate(slotData.fin)
    const fechaInicio = toDate(fechaHora)
    const duracionMinutos = Number(duracion)

    if (!inicioVentana || !finVentana || !fechaInicio || !Number.isFinite(duracionMinutos) || duracionMinutos <= 0) {
      throw new Error('Datos de cita inválidos')
    }

    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000)

    if (fechaInicio < inicioVentana || fechaFin > finVentana) {
      throw new Error('La fecha y duración propuesta exceden la ventana del slot')
    }

    const citaRef = await addDoc(collection(db, 'citas'), {
      estudianteId,
      academicoId,
      slotId,
      fechaHora: fechaInicio,
      fechaFin,
      duracion: duracionMinutos,
      motivo,
      estado: 'PENDIENTE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await addDoc(collection(db, 'notificaciones'), {
      tipo: 'SOLICITUD',
      destino: academicoId,
      estudianteId,
      citaId: citaRef.id,
      mensaje: `Nueva solicitud de cita con motivo: ${motivo}`,
      leida: false,
      createdAt: serverTimestamp(),
    })

    return citaRef.id
  } catch (error) {
    console.error('Error creando cita:', error)
    throw error
  }
}

/**
 * Obtiene citas pendientes para un académico
 * @param {string} academicoId
 * @returns {Promise<Array>}
 */
export async function getPendingCitasForAcademico(academicoId) {
  try {
    const citasRef = collection(db, 'citas')
    const q = query(
      citasRef,
      where('academicoId', '==', academicoId),
      where('estado', '==', 'PENDIENTE'),
    )
    const snapshot = await getDocs(q)

    const citas = snapshot.docs.map(doc => ({
      citaId: doc.id,
      ...doc.data(),
    }))

    const uniqueStudentIds = [...new Set(citas.map(cita => cita.estudianteId).filter(Boolean))]
    const studentsMap = new Map()

    await Promise.all(
      uniqueStudentIds.map(async (studentId) => {
        try {
          const userRef = doc(db, 'usuarios', studentId)
          const userSnap = await getDoc(userRef)
          if (userSnap.exists()) {
            const userData = userSnap.data()
            studentsMap.set(studentId, userData.nombre || userData.email || 'Estudiante')
          }
        } catch (error) {
          console.error(`Error fetching student ${studentId}:`, error)
        }
      }),
    )

    return citas.map(cita => ({
      ...cita,
      estudianteNombre: studentsMap.get(cita.estudianteId) || 'Estudiante',
    }))
  } catch (error) {
    console.error('Error fetching pending citas:', error)
    return []
  }
}

/**
 * Acepta una cita y notifica al estudiante
 * @param {string} citaId
 * @param {string} estudianteId
 * @returns {Promise<void>}
 */
export async function acceptCita(citaId, estudianteId) {
  try {
    return await runTransaction(db, async (transaction) => {
      const citaRef = doc(db, 'citas', citaId)
      const citaSnap = await transaction.get(citaRef)
      if (!citaSnap.exists()) {
        throw new Error('Cita no encontrada')
      }

      const citaData = citaSnap.data()

      // Update cita estado
      transaction.update(citaRef, {
        estado: 'CONFIRMADA',
        updatedAt: serverTimestamp(),
      })

      // Block slot to avoid showing it as available for new requests
      if (citaData?.academicoId && citaData?.slotId) {
        const slotRef = doc(db, `calendarios/${citaData.academicoId}/slots`, citaData.slotId)
        transaction.update(slotRef, {
          disponible: false,
          updatedAt: serverTimestamp(),
        })
      }

      // Create notification for student
      const notificacionesRef = collection(db, 'notificaciones')
      transaction.set(doc(notificacionesRef), {
        tipo: 'CONFIRMACION',
        destino: estudianteId,
        citaId,
        mensaje: 'Tu cita ha sido confirmada',
        leida: false,
        createdAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error('Error accepting cita:', error)
    throw error
  }
}

/**
 * Rechaza una cita y notifica al estudiante
 * @param {string} citaId
 * @param {string} estudianteId
 * @returns {Promise<void>}
 */
export async function rejectCita(citaId, estudianteId) {
  try {
    return await runTransaction(db, async (transaction) => {
      const citaRef = doc(db, 'citas', citaId)
      const citaSnap = await transaction.get(citaRef)
      if (!citaSnap.exists()) {
        throw new Error('Cita no encontrada')
      }

      const citaData = citaSnap.data()

      // Update cita estado
      transaction.update(citaRef, {
        estado: 'RECHAZADA',
        updatedAt: serverTimestamp(),
      })

      // Return slot to available state
      if (citaData?.academicoId && citaData?.slotId) {
        const slotRef = doc(db, `calendarios/${citaData.academicoId}/slots`, citaData.slotId)
        transaction.update(slotRef, {
          disponible: true,
          updatedAt: serverTimestamp(),
        })
      }

      // Create notification for student
      const notificacionesRef = collection(db, 'notificaciones')
      transaction.set(doc(notificacionesRef), {
        tipo: 'RECHAZO',
        destino: estudianteId,
        citaId,
        mensaje: 'Tu cita ha sido rechazada',
        leida: false,
        createdAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error('Error rejecting cita:', error)
    throw error
  }
}

/**
 * Obtiene configuración base de horarios para un académico.
 * @param {string} academicoId
 * @returns {Promise<Object>}
 */
export async function getHorariosBase(academicoId) {
  try {
    const horarioRef = doc(db, 'horarios', academicoId)
    const snapshot = await getDoc(horarioRef)

    if (!snapshot.exists()) {
      return {
        academicoId,
        ...getDefaultHorarios(),
      }
    }

    const data = snapshot.data()
    const normalized = getDefaultHorarios()

    DAY_KEYS.forEach(dayKey => {
      normalized[dayKey] = Array.isArray(data[dayKey])
        ? data[dayKey].map(range => ({
            inicio: range?.inicio,
            fin: range?.fin,
          })).filter(range => range.inicio && range.fin)
        : []
    })

    return {
      academicoId,
      ...normalized,
    }
  } catch (error) {
    console.error('Error fetching horarios base:', error)
    return {
      academicoId,
      ...getDefaultHorarios(),
    }
  }
}

/**
 * Guarda configuración base de horarios para un académico.
 * @param {string} academicoId
 * @param {Object} horarios
 * @returns {Promise<void>}
 */
export async function saveHorariosBase(academicoId, horarios) {
  const payload = getDefaultHorarios()

  DAY_KEYS.forEach(dayKey => {
    payload[dayKey] = Array.isArray(horarios?.[dayKey])
      ? horarios[dayKey]
        .map(range => ({
          inicio: range?.inicio,
          fin: range?.fin,
        }))
        .filter(range => range.inicio && range.fin && range.inicio < range.fin)
      : []
  })

  const horarioRef = doc(db, 'horarios', academicoId)
  await setDoc(horarioRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Obtiene slots de la semana (lunes a domingo) para un académico.
 * @param {string} academicoId
 * @param {Date} weekStart
 * @returns {Promise<Array>}
 */
export async function getAcademicoWeekSlots(academicoId, weekStart) {
  try {
    const start = getWeekStart(weekStart)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)

    const slotsRef = collection(db, `calendarios/${academicoId}/slots`)
    const q = query(
      slotsRef,
      where('inicio', '>=', Timestamp.fromDate(start)),
      where('inicio', '<', Timestamp.fromDate(end)),
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(slotDoc => ({
      slotId: slotDoc.id,
      ...slotDoc.data(),
    }))
  } catch (error) {
    console.error('Error fetching week slots:', error)
    return []
  }
}

/**
 * Crea un slot adicional para la semana actual (excepción de horario).
 * @param {string} academicoId
 * @param {{ inicio: Date, fin: Date }} slot
 * @returns {Promise<string>}
 */
export async function createOneTimeSlot(academicoId, slot) {
  const inicio = toDate(slot?.inicio)
  const fin = toDate(slot?.fin)

  if (!inicio || !fin || fin <= inicio) {
    throw new Error('Rango de slot inválido')
  }

  const weekStart = getWeekStart(inicio)

  const slotRef = await addDoc(collection(db, `calendarios/${academicoId}/slots`), {
    inicio,
    fin,
    disponible: true,
    source: 'EXTRA',
    weekStart: Timestamp.fromDate(weekStart),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return slotRef.id
}

/**
 * Elimina un slot de la semana actual (sin afectar horario base).
 * @param {string} academicoId
 * @param {string} slotId
 * @returns {Promise<void>}
 */
export async function deleteWeekSlot(academicoId, slotId) {
  const slotRef = doc(db, `calendarios/${academicoId}/slots`, slotId)
  await deleteDoc(slotRef)
}

/**
 * Obtiene citas de una semana para resaltar bloques ocupados.
 * @param {string} academicoId
 * @param {Date} weekStart
 * @returns {Promise<Array>}
 */
export async function getAcademicoWeekCitas(academicoId, weekStart) {
  const start = getWeekStart(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)

  const isWithinWeek = (value) => {
    const date = toDate(value)
    if (!date) return false
    return date >= start && date < end
  }

  try {
    const citasRef = collection(db, 'citas')
    const q = query(
      citasRef,
      where('academicoId', '==', academicoId),
      where('fechaHora', '>=', Timestamp.fromDate(start)),
      where('fechaHora', '<', Timestamp.fromDate(end)),
    )
    const snapshot = await getDocs(q)

    return snapshot.docs
      .map(citaDoc => ({ citaId: citaDoc.id, ...citaDoc.data() }))
      .filter(cita => cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA')
  } catch (error) {
    console.error('Error fetching week citas with range query, using fallback:', error)

    try {
      const citasRef = collection(db, 'citas')
      const fallbackQuery = query(citasRef, where('academicoId', '==', academicoId))
      const fallbackSnapshot = await getDocs(fallbackQuery)

      return fallbackSnapshot.docs
        .map(citaDoc => ({ citaId: citaDoc.id, ...citaDoc.data() }))
        .filter(cita => (cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA') && isWithinWeek(cita.fechaHora))
    } catch (fallbackError) {
      console.error('Error fetching week citas fallback:', fallbackError)
      return []
    }
  }
}

/**
 * Genera slots semanales a partir del horario base si aún no existen.
 * @param {string} academicoId
 * @param {Date} dateInWeek
 * @returns {Promise<{ generated: boolean, count: number }>}
 */
export async function ensureWeeklySlotsGenerated(academicoId, dateInWeek = new Date()) {
  const weekStart = getWeekStart(dateInWeek)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const existing = await getAcademicoWeekSlots(academicoId, weekStart)
  const existingRangeKeys = new Set(
    existing
      .map((slot) => {
        const start = toDate(slot.inicio)
        const end = toDate(slot.fin)
        if (!start || !end || end <= start) return null
        return `${start.getTime()}-${end.getTime()}`
      })
      .filter(Boolean),
  )

  const horarios = await getHorariosBase(academicoId)
  const slotsToCreate = []

  DAY_KEYS.forEach((dayKey, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    const ranges = Array.isArray(horarios[dayKey]) ? horarios[dayKey] : []
    ranges.forEach(range => {
      const inicio = buildDateFromTime(date, range.inicio)
      const fin = buildDateFromTime(date, range.fin)
      const rangeKey = `${inicio.getTime()}-${fin.getTime()}`

      if (fin > inicio && !existingRangeKeys.has(rangeKey)) {
        existingRangeKeys.add(rangeKey)
        slotsToCreate.push({
          inicio,
          fin,
          disponible: true,
          source: 'BASE',
          weekStart: Timestamp.fromDate(weekStart),
          generatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
    })
  })

  if (slotsToCreate.length === 0) {
    return { generated: false, count: 0 }
  }

  await Promise.all(
    slotsToCreate.map(slot => addDoc(collection(db, `calendarios/${academicoId}/slots`), slot)),
  )

  return { generated: true, count: slotsToCreate.length, start: weekStart, end: weekEnd }
}

/**
 * Sincroniza los slots BASE de la semana actual con el horario base guardado.
 * - Crea bloques faltantes.
 * - Elimina bloques BASE obsoletos que no tengan citas PENDIENTE/CONFIRMADA.
 * @param {string} academicoId
 * @param {Date} dateInWeek
 * @returns {Promise<{created: number, deleted: number}>}
 */
export async function syncWeeklySlotsFromBase(academicoId, dateInWeek = new Date()) {
  const weekStart = getWeekStart(dateInWeek)
  const horarios = await getHorariosBase(academicoId)
  const [existingSlots, weekCitas] = await Promise.all([
    getAcademicoWeekSlots(academicoId, weekStart),
    getAcademicoWeekCitas(academicoId, weekStart),
  ])

  const desiredRangeKeys = new Set()
  const desiredRanges = []

  DAY_KEYS.forEach((dayKey, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    const ranges = Array.isArray(horarios[dayKey]) ? horarios[dayKey] : []
    ranges.forEach((range) => {
      const inicio = buildDateFromTime(date, range.inicio)
      const fin = buildDateFromTime(date, range.fin)
      if (fin <= inicio) return

      const key = `${inicio.getTime()}-${fin.getTime()}`
      desiredRangeKeys.add(key)
      desiredRanges.push({ inicio, fin, key })
    })
  })

  const citasActivas = weekCitas.filter(cita => cita.estado === 'PENDIENTE' || cita.estado === 'CONFIRMADA')

  const slotHasBlockingCita = (slot) => {
    const slotStart = toDate(slot.inicio)
    const slotEnd = toDate(slot.fin)
    if (!slotStart || !slotEnd) return false

    return citasActivas.some((cita) => {
      const citaStart = toDate(cita.fechaHora)
      const citaEndField = toDate(cita.fechaFin)
      const citaDuration = Number(cita.duracion) || 30
      const citaEnd = citaEndField || (citaStart ? new Date(citaStart.getTime() + citaDuration * 60000) : null)
      if (!citaStart || !citaEnd) return false
      return citaStart < slotEnd && citaEnd > slotStart
    })
  }

  const existingRangeKeys = new Set()
  const slotsToDelete = []

  existingSlots.forEach((slot) => {
    const start = toDate(slot.inicio)
    const end = toDate(slot.fin)
    if (!start || !end || end <= start) return

    const key = `${start.getTime()}-${end.getTime()}`
    const isBaseSlot = slot.source === 'BASE'

    if (isBaseSlot && !desiredRangeKeys.has(key) && !slotHasBlockingCita(slot)) {
      slotsToDelete.push(slot)
      return
    }

    existingRangeKeys.add(key)
  })

  const slotsToCreate = desiredRanges
    .filter(range => !existingRangeKeys.has(range.key))
    .map(range => ({
      inicio: range.inicio,
      fin: range.fin,
      disponible: true,
      source: 'BASE',
      weekStart: Timestamp.fromDate(weekStart),
      generatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))

  await Promise.all([
    ...slotsToDelete.map(slot => deleteDoc(doc(db, `calendarios/${academicoId}/slots`, slot.slotId))),
    ...slotsToCreate.map(slot => addDoc(collection(db, `calendarios/${academicoId}/slots`), slot)),
  ])

  return {
    created: slotsToCreate.length,
    deleted: slotsToDelete.length,
  }
}

/**
 * Obtiene todos los salones de la colección 'salones'
 * @returns {Promise<Array>}
 */
export async function getSalones() {
  try {
    const salonesRef = collection(dbSalones, 'salones')
    const snapshot = await getDocs(salonesRef)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error fetching salones:', error)
    return []
  }
}

/**
 * Obtiene un salón por su ID
 * @param {string} salonId
 * @returns {Promise<Object|null>}
 */
export async function getSalonById(salonId) {
  try {
    const salonRef = doc(dbSalones, 'salones', salonId)
    const snapshot = await getDoc(salonRef)
    if (!snapshot.exists()) return null
    return { id: snapshot.id, ...snapshot.data() }
  } catch (error) {
    console.error('Error fetching salon:', error)
    return null
  }
}

/**
 * Obtiene todos los salones de un mismo conjunto
 * @param {number} idConjunto
 * @returns {Promise<Array>}
 */
export async function getSalonesByConjunto(idConjunto) {
  try {
    const salonesRef = collection(dbSalones, 'salones')
    const q = query(salonesRef, where('idConjunto', '==', idConjunto))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error fetching salones por conjunto:', error)
    return []
  }
}