import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'

export function useNotifications(estudianteId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!estudianteId) {
      setNotifications([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const notificationsRef = collection(db, 'notificaciones')
    const notificationsQuery = query(notificationsRef, where('destino', '==', estudianteId))

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items = snapshot.docs
          .map(docSnap => ({ notificationId: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
            return dateB - dateA
          })

        setNotifications(items)
        setError('')
        setLoading(false)
      },
      () => {
        setError('No se pudieron cargar las notificaciones')
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [estudianteId])

  return {
    notifications,
    loading,
    error,
  }
}
