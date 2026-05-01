import { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { getUserDataFromFirestore, upsertAuthenticatedUserProfile } from '../services/firestoreService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Garantiza que exista el documento en "usuarios" para cualquier método de acceso.
        await upsertAuthenticatedUserProfile(currentUser)
        const firestoreData = await getUserDataFromFirestore(currentUser.uid, currentUser.email)
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

  const registerStudent = async ({ nombre, email, password }) => {
    const credentials = await createUserWithEmailAndPassword(auth, email, password)
    const displayName = String(nombre || '').trim()

    if (displayName) {
      await updateProfile(credentials.user, { displayName })
    }

    await upsertAuthenticatedUserProfile(credentials.user, {
      nombre: displayName,
      rol: 'ESTUDIANTE',
    })

    return credentials
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const credentials = await signInWithPopup(auth, provider)

    await upsertAuthenticatedUserProfile(credentials.user, {
      rol: 'ESTUDIANTE',
    })

    return credentials
  }

  const logout = async () => signOut(auth)

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        login,
        registerStudent,
        loginWithGoogle,
        logout,
        isAuthenticated: !!user,
        authLoading,
        userRole: userData?.rol,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
