import { AlertCircle } from 'lucide-react'

/**
 * Componente para renderizar un mensaje individual en el chat
 */
export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  if (isError) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2">
        <div className="flex gap-3 px-3 py-2.5 rounded-lg border border-red-200" style={{ background: '#fee2e2' }}>
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[85%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed break-words ${
            isUser
              ? 'text-white rounded-br-none'
              : 'border rounded-bl-none'
          }`}
          style={{
            background: isUser ? 'var(--color-primary)' : 'var(--color-bg)',
            color: isUser ? 'white' : 'var(--color-text)',
            borderColor: isUser ? 'transparent' : 'var(--color-border)',
          }}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}
