import {
  doc, getDoc, collection, query, where, getDocs,
  runTransaction, updateDoc, addDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

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

    return snapshot.docs.map(doc => ({
      citaId: doc.id,
      ...doc.data(),
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
      // Update cita estado
      const citaRef = doc(db, 'citas', citaId)
      transaction.update(citaRef, {
        estado: 'CONFIRMADA',
        updatedAt: serverTimestamp(),
      })

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
      // Update cita estado
      const citaRef = doc(db, 'citas', citaId)
      transaction.update(citaRef, {
        estado: 'RECHAZADA',
        updatedAt: serverTimestamp(),
      })

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
