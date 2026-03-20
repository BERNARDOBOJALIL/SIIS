import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../services/firebase'

export function useStudentCitas(estudianteId) {
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!estudianteId) {
      setCitas([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const citasRef = collection(db, 'citas')
    const citasQuery = query(citasRef, where('estudianteId', '==', estudianteId))

    const unsubscribe = onSnapshot(
      citasQuery,
      (snapshot) => {
        const data = snapshot.docs
          .map(docSnap => ({ citaId: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => {
            const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate().getTime() : 0
            const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate().getTime() : 0
            return dateA - dateB
          })

        setCitas(data)
        setError('')
        setLoading(false)
      },
      () => {
        setError('No se pudieron cargar tus citas')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [estudianteId])

  const cancelCita = async (cita) => {
    const citaRef = doc(db, 'citas', cita.citaId)

    await updateDoc(citaRef, {
      estado: 'CANCELADA',
      updatedAt: serverTimestamp(),
    })

    await addDoc(collection(db, 'notificaciones'), {
      tipo: 'CANCELACION',
      destino: cita.academicoId,
      estudianteId: cita.estudianteId,
      citaId: cita.citaId,
      mensaje: 'El estudiante canceló una cita pendiente',
      leida: false,
      createdAt: serverTimestamp(),
    })
  }

  return {
    citas,
    loading,
    error,
    cancelCita,
  }
}
