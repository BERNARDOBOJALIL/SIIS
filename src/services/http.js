import { API_BASE_URL } from '../constants'

/**
 * Cliente HTTP base para todas las peticiones a la API.
 */
const defaultHeaders = {
  'Content-Type': 'application/json',
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    ...defaultHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Error ${response.status}`)
  }

  return response.json()
}

export const http = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
}
