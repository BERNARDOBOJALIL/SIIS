// URL base de la API (se sobreescribe con variables de entorno)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://agenteragsiis.onrender.com'

// URL base del backend Trackny (ocupacion de maquinas)
export const TRACKNY_HTTP_URL = import.meta.env.VITE_TRACKNY_HTTP_URL || 'https://trackny.onrender.com'

function getDefaultWebSocketUrl(apiBaseUrl) {
  try {
    const url = new URL(apiBaseUrl)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = '/ws'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return 'wss://agenteragsiis.onrender.com/ws'
  }
}

export const TRACKNY_WS_URL = import.meta.env.VITE_TRACKNY_WS_URL || getDefaultWebSocketUrl(TRACKNY_HTTP_URL)

// Rutas de la aplicación
export const ROUTES = {
  HOME: '/',
  APPOINTMENTS: '/citas',
  SALONES: '/salones',
  PERSONAL: '/personal',
  MAQUINAS: '/maquinas',
  ADMIN: '/admin',
  LOGIN: '/login',
}

// Claves de localStorage
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
}
