import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { getUserDataFromFirestore } from '../services/firestoreService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Fetch user data from Firestore using UID
        const firestoreData = await getUserDataFromFirestore(currentUser.uid)
        setUserData(firestoreData)
      } else {
        setUser(null)
        setUserData(null)
      }
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = async () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, userData, login, logout, isAuthenticated: !!user, authLoading, userRole: userData?.rol }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
