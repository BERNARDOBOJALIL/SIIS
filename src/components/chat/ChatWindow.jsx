import { useEffect, useRef, useState } from 'react'
import { X, RotateCcw, Minimize2, Maximize2, GripVertical, MessageCircle } from 'lucide-react'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'

/**
 * Ventana flotante de chat en el lado izquierdo
 */
export default function ChatWindow({ isOpen, onClose, messages, loading, onSendMessage, onReset }) {
  const messagesEndRef = useRef(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // Auto-scroll hacia el último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768

  // Mobile: fullscreen
  if (!isDesktop) {
    return (
      <>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={onClose}
            />
            <div
              className="fixed inset-0 z-50 flex flex-col"
              style={{ background: 'var(--color-site-white)' }}
            >
              <ChatHeader onClose={onClose} onReset={onReset} messages={messages} isMinimized={false} />
              <ChatContentArea messages={messages} loading={loading} messagesEndRef={messagesEndRef} />
              <ChatInput onSendMessage={onSendMessage} isLoading={loading} />
            </div>
          </>
        )}
      </>
    )
  }

  // Desktop: sidebar a la izquierda
  return (
    <div
      className="relative flex flex-col h-full transition-all duration-300 overflow-hidden"
      style={{
        width: isOpen ? '400px' : '0px',
        borderRight: isOpen ? '1px solid var(--color-border)' : 'none',
        background: 'var(--color-site-white)',
      }}
    >
      {isOpen && (
        <>
          <ChatHeader
            onClose={onClose}
            onReset={onReset}
            messages={messages}
            isMinimized={isMinimized}
            onToggleMinimize={() => setIsMinimized(!isMinimized)}
          />

          {!isMinimized && (
            <>
              <ChatContentArea messages={messages} loading={loading} messagesEndRef={messagesEndRef} />
              <ChatInput onSendMessage={onSendMessage} isLoading={loading} />
            </>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Header del chat
 */
function ChatHeader({ onClose, onReset, messages, isMinimized, onToggleMinimize }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b select-none"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-bg)',
      }}
    >
      <MessageCircle size={16} style={{ color: 'var(--color-primary)' }} />

      <div className="flex-1">
        <h3 className="font-semibold text-sm">Agente Inteligente</h3>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
          Online
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {messages.length > 0 && (
          <button
            onClick={onReset}
            title="Resetear conversación"
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
            style={{ color: 'var(--color-text)' }}
          >
            <RotateCcw size={14} />
          </button>
        )}

        <button
          onClick={onToggleMinimize}
          title={isMinimized ? 'Expandir' : 'Minimizar'}
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>

        <button
          onClick={onClose}
          title="Cerrar"
          className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          style={{ color: 'var(--color-text)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

/**
 * Área de mensajes
 */
function ChatContentArea({ messages, loading, messagesEndRef }) {
  return (
    <>
      {/* Mensaje inicial */}
      {messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-xs">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              <MessageCircle size={24} />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Hola</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Soy tu asistente inteligente. Estoy aquí para ayudarte con cualquier pregunta que tengas.
            </p>
          </div>
        </div>
      )}

      {/* Historial de mensajes */}
      {messages.length > 0 && (
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{
            background: 'var(--color-bg)',
          }}
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {loading && (
            <div className="flex gap-2 justify-start ml-2">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
    </>
  )
}
