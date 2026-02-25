import { http } from './http'

/**
 * Servicio de autenticación.
 */
export const authService = {
  login: (credentials) => http.post('/auth/login', credentials),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
}
