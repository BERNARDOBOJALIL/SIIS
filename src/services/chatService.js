/**
 * Servicio para comunicarse con la API del agente inteligente de chat
 */

// URL base de la API del agente inteligente
// Configurable mediante variable de entorno VITE_CHAT_API_URL
const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_URL || 'https://agenteragsiis.onrender.com'

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(`${CHAT_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail?.[0]?.msg || error.message || `Error ${response.status}`)
  }

  return response.json()
}

/**
 * Enviar un mensaje al agente y obtener respuesta
 * @param {string} prompt - El mensaje del usuario
 * @param {string} sessionId - ID de la sesión (por defecto "default")
 * @param {string} frontendContext - Contexto opcional generado en el frontend (mapa/salones)
 * @returns {Promise<{response: string, session_id: string}>}
 */
export async function sendMessage(prompt, sessionId = 'default', frontendContext = '') {
  const payload = {
    prompt,
    session_id: sessionId,
  }

  const compactContext = String(frontendContext || '').trim()
  if (compactContext) {
    payload.frontend_context = compactContext
  }

  return request('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Verificar el estado de la API
 * @returns {Promise<{status: string, collection_count: number}>}
 */
export async function checkHealth() {
  return request('/health')
}

/**
 * Resetear la sesión del chat
 * @param {string} sessionId - ID de la sesión a resetear
 * @returns {Promise<string>}
 */
export async function resetSession(sessionId = 'default') {
  return request(`/chat/${sessionId}`, {
    method: 'DELETE',
  })
}

export const chatService = {
  sendMessage,
  checkHealth,
  resetSession,
}
