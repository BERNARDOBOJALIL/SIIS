import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { ChatWindow } from '../chat'
import { useChat } from '../../hooks/useChat'
import { createContext, useContext } from 'react'

// Contexto para compartir estado del chat entre componentes
const ChatContext = createContext()

export const useChatContext = () => useContext(ChatContext)

export default function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false)
  const { messages, loading: chatLoading, sendMessage, resetChat } = useChat()

  return (
    <ChatContext.Provider value={{ chatOpen, setChatOpen }}>
      <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
        <Navbar />
        
        <div className="flex flex-1 overflow-hidden" style={{ marginTop: '56px' }}>
          {/* Chat Sidebar a la izquierda */}
          <ChatWindow
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
            messages={messages}
            loading={chatLoading}
            onSendMessage={sendMessage}
            onReset={resetChat}
          />

          {/* Contenido principal con transición */}
          <main
            className="flex-1 overflow-hidden transition-all duration-300"
            style={{
              marginLeft: chatOpen ? '0px' : '0px',
              transform: chatOpen ? 'translateX(0)' : 'translateX(0)',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </ChatContext.Provider>
  )
}

