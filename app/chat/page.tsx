'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  intent?: string
  confidence?: number
}

interface LeadData {
  name?: string
  phone?: string
  email?: string
  service?: string
}

const QUICK_REPLIES = [
  { label: '💆 Ver servicios', message: '¿Qué servicios ofrecéis?' },
  { label: '💰 Precios', message: '¿Cuáles son vuestros precios?' },
  { label: '📍 Zonas', message: '¿A qué zonas llegáis?' },
  { label: '📅 Reservar', message: 'Quiero reservar una cita' },
]

const WELCOME_MESSAGE = '¡Hola! 👋 Soy el asistente de MassFlow. Estoy aquí para ayudarte con información sobre nuestros masajes a domicilio, precios, disponibilidad o para reservar una cita. ¿En qué puedo ayudarte?'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('massflow_chat_session')
      if (stored) return stored
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('massflow_chat_session', id)
      return id
    }
    return `session_${Date.now()}`
  })
  const [leadData, setLeadData] = useState<LeadData>({})
  const [showTyping, setShowTyping] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load conversation from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('massflow_chat_messages')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
          setMessageCount(parsed.filter((m: any) => m.sender === 'user').length)
        } catch { /* ignore */ }
      }

      const storedLead = localStorage.getItem('massflow_chat_lead')
      if (storedLead) {
        try { setLeadData(JSON.parse(storedLead)) } catch { /* ignore */ }
      }
    }
  }, [])

  // Save conversation to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('massflow_chat_messages', JSON.stringify(messages))
    }
  }, [messages])

  // Save lead data
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(leadData).length > 0) {
      localStorage.setItem('massflow_chat_lead', JSON.stringify(leadData))
    }
  }, [leadData])

  // Show welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        setMessages([{
          id: 'welcome',
          text: WELCOME_MESSAGE,
          sender: 'bot',
          timestamp: new Date(),
        }])
      }, 500)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, showTyping, scrollToBottom])

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setShowTyping(true)
    setMessageCount(prev => prev + 1)

    // Simulate natural typing delay
    const typingDelay = Math.min(1000 + messageText.length * 20, 2500)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: messageText,
          session_id: sessionId,
        }),
      })

      const data = await response.json()

      // Wait for minimum typing animation
      await new Promise(resolve => setTimeout(resolve, Math.max(0, typingDelay - (Date.now() - userMessage.timestamp.getTime()))))

      setShowTyping(false)

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        text: data.respuesta || 'Lo siento, no he podido procesar tu mensaje. ¿Puedes repetirlo?',
        sender: 'bot',
        timestamp: new Date(),
        intent: data.intencion,
        confidence: data.confianza,
      }

      setMessages(prev => [...prev, botMessage])

      // Update lead data if captured
      if (data.lead_data) {
        setLeadData(prev => ({ ...prev, ...data.lead_data }))
      }
    } catch (error) {
      setShowTyping(false)
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Estamos teniendo problemas técnicos. ¿Me dejas tu teléfono y te llamamos en menos de 1 hora?',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearConversation = () => {
    setMessages([])
    setLeadData({})
    setMessageCount(0)
    localStorage.removeItem('massflow_chat_messages')
    localStorage.removeItem('massflow_chat_lead')
    localStorage.removeItem('massflow_chat_session')
    // Reload to get new session
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xl">💆</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">MassFlow Chat</h1>
            <p className="text-xs opacity-80 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Online · Respuesta en segundos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearConversation}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            title="Borrar conversación (RGPD)"
          >
            🗑️ Borrar chat
          </button>
        </div>
      </div>

      {/* RGPD Notice */}
      {messages.length <= 1 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700">
          🔒 Al usar este chat aceptas el tratamiento de tus datos según nuestra política de privacidad. Puedes borrar tu conversación en cualquier momento.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-end gap-2 max-w-[85%] lg:max-w-[70%]`}>
              {message.sender === 'bot' && (
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">💆</span>
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100'
                }`}
              >
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                <p className={`text-[10px] mt-1 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm">💆</span>
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies (show only at beginning or when appropriate) */}
      {(messages.length <= 1 || messageCount === 0) && !loading && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                onClick={() => sendMessage(qr.message)}
                className="bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-indigo-50 hover:border-indigo-300 transition shadow-sm"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Human escalation button */}
      {messageCount >= 5 && !leadData.phone && (
        <div className="px-4 pb-2">
          <button
            onClick={() => sendMessage('Quiero hablar con una persona')}
            className="w-full bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-xs font-medium hover:bg-amber-100 transition"
          >
            👤 Hablar con una persona
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t p-3 shadow-lg">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Escribe un mensaje..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 text-sm"
            autoFocus
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white w-10 h-10 rounded-full flex items-center justify-center transition shadow-md disabled:shadow-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
