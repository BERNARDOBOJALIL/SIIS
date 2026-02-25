// URL base de la API (se sobreescribe con variables de entorno)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
}

// Claves de localStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
}
