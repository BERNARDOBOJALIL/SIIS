import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

/**
 * Componente de entrada de texto para el chat
 */
export default function ChatInput({ onSendMessage, isLoading }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e) => {
    // Enviar con Ctrl+Enter o Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e)
      return
    }
  }

  return (
    <div
      className="border-t p-3"
      style={{
        background: 'var(--color-site-white)',
        borderColor: 'var(--color-border)',
      }}
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe aquí..."
          disabled={isLoading}
          rows={2}
          className="flex-1 px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 transition-all"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = `0 0 0 3px rgba(204, 0, 0, 0.1)`
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none'
          }}
        />
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="flex items-center justify-center w-10 px-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            background: 'var(--color-primary)',
          }}
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
      <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--color-text-muted)' }}>
        Ctrl+Enter para enviar
      </p>
    </div>
  )
}
