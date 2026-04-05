import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// App original — citas académicas
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// App nueva — salones
const firebaseConfigSalones = {
  apiKey: import.meta.env.VITE_FIREBASE_SALONES_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_SALONES_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_SALONES_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_SALONES_APP_ID,
}

const firebaseApp = initializeApp(firebaseConfig)
const firebaseAppSalones = initializeApp(firebaseConfigSalones, 'salones')

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const dbSalones = getFirestore(firebaseAppSalones)