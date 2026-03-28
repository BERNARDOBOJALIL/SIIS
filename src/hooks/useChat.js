import { useState, useCallback, useRef, useEffect } from 'react'
import { chatService } from '../services/chatService'

/**
 * Hook personalizado para manejar la lógica del chat
 * Mantiene el historial de mensajes y se comunica con la API del agente
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionId] = useState(() => {
    // Generar una sesión única o usar la del localStorage
    const saved = localStorage.getItem('chatSessionId')
    if (saved) return saved
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('chatSessionId', newSessionId)
    return newSessionId
  })

  // Verificar que el API está disponible al montar el componente
  useEffect(() => {
    chatService.checkHealth()
      .catch(err => console.warn('Chat API no disponible:', err.message))
  }, [])

  /**
   * Enviar un mensaje y obtener respuesta del agente
   */
  const sendMessage = useCallback(async (prompt) => {
    if (!prompt.trim()) return

    setError(null)
    setLoading(true)

    // Agregar el mensaje del usuario al historial
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Enviar al API
      const response = await chatService.sendMessage(prompt, sessionId)

      // Agregar la respuesta del agente
      const agentMessage = {
        id: `msg_${Date.now()}_agent`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      setError(err.message || 'Error al enviar el mensaje')
      // Agregar un mensaje de error
      const errorMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'error',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  /**
   * Resetear la sesión y limpiar el historial
   */
  const resetChat = useCallback(async () => {
    try {
      await chatService.resetSession(sessionId)
      setMessages([])
      setError(null)
    } catch (err) {
      setError(err.message || 'Error al resetear la sesión')
    }
  }, [sessionId])

  /**
   * Limpiar los mensajes localmente
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    resetChat,
    clearMessages,
  }
}
