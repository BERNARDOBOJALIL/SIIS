// URL base de la API (se sobreescribe con variables de entorno)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://agenteragsiis.onrender.com'

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  APPOINTMENTS: '/citas',
  LOGIN: '/login',
}

// Claves de localStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
}
