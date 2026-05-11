'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  quickReplies?: string[]
}

interface CapturedData {
  nombre?: string
  zona?: string
  cp?: string
  servicio?: string
  fecha?: string
  hora?: string
  direccion?: string
  telefono?: string
  email?: string
}

export default function ChatV2Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('massflow_chat_session_v2')
      if (stored) return stored
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('massflow_chat_session_v2', id)
      return id
    }
    return `session_${Date.now()}`
  })
  const [capturedData, setCapturedData] = useState<CapturedData>({})
  const [phase, setPhase] = useState<string>('BIENVENIDA')
  const [showTyping, setShowTyping] = useState(false)
  const [currentQuickReplies, setCurrentQuickReplies] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load conversation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('massflow_chat_messages_v2')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
        } catch { /* ignore */ }
      }

      const storedData = localStorage.getItem('massflow_captured_data')
      if (storedData) {
        try { setCapturedData(JSON.parse(storedData)) } catch { /* ignore */ }
      }
    }
  }, [])

  // Save conversation
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('massflow_chat_messages_v2', JSON.stringify(messages))
    }
  }, [messages])

  // Save captured data
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(capturedData).length > 0) {
      localStorage.setItem('massflow_captured_data', JSON.stringify(capturedData))
    }
  }, [capturedData])

  // Show welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setTimeout(() => {
        sendWelcome()
      }, 800)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, showTyping, scrollToBottom])

  const sendWelcome = async () => {
    setLoading(true)
    setShowTyping(true)

    await new Promise(resolve => setTimeout(resolve, 1200))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: 'hola', session_id: sessionId }),
      })

      const data = await response.json()

      setShowTyping(false)

      const botMessage: Message = {
        id: 'welcome',
        text: data.respuesta || '👋 ¡Hola! Soy Lía, la asistente de MassFlow. ¿En qué puedo ayudarte?',
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: data.quick_replies || [],
      }

      setMessages([botMessage])
      setCurrentQuickReplies(data.quick_replies || [])
      setPhase(data.phase || 'BIENVENIDA')
      if (data.captured_data) setCapturedData(data.captured_data)
    } catch (error) {
      setShowTyping(false)
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

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
    setCurrentQuickReplies([])

    // Simulate typing delay
    const typingDelay = Math.min(800 + messageText.length * 15, 2000)
    const startTime = Date.now()

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
      const elapsed = Date.now() - startTime
      if (elapsed < typingDelay) {
        await new Promise(resolve => setTimeout(resolve, typingDelay - elapsed))
      }

      setShowTyping(false)

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        text: data.respuesta || 'Lo siento, no pude procesar tu mensaje.',
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: data.quick_replies || [],
      }

      setMessages(prev => [...prev, botMessage])
      setCurrentQuickReplies(data.quick_replies || [])
      setPhase(data.phase || phase)
      if (data.captured_data) setCapturedData(data.captured_data)
    } catch (error) {
      setShowTyping(false)
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Estamos teniendo problemas técnicos. ¿Me dejas tu teléfono y te llamamos? 📞',
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
    setCapturedData({})
    setPhase('BIENVENIDA')
    setCurrentQuickReplies([])
    localStorage.removeItem('massflow_chat_messages_v2')
    localStorage.removeItem('massflow_captured_data')
    localStorage.removeItem('massflow_chat_session_v2')
    window.location.reload()
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 shadow-xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
              <span className="text-2xl">💆</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Lía · MassFlow</h1>
              <p className="text-xs opacity-90 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></span>
                Online · Respuesta en segundos
              </p>
            </div>
          </div>
          <button
            onClick={clearConversation}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition backdrop-blur-sm border border-white/20"
            title="Borrar conversación (RGPD)"
          >
            🗑️ Borrar
          </button>
        </div>
      </div>

      {/* RGPD Notice */}
      {messages.length <= 1 && (
        <div className="bg-blue-100/80 backdrop-blur-sm border-b border-blue-200 px-4 py-2.5 text-xs text-blue-800">
          <div className="max-w-4xl mx-auto">
            🔒 Al usar este chat aceptas el tratamiento de tus datos según nuestra política de privacidad. Puedes borrar tu conversación en cualquier momento.
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {Object.keys(capturedData).length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm border-b border-gray-200 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs">
            <span className="text-gray-600">Datos capturados:</span>
            {capturedData.nombre && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Nombre</span>}
            {(capturedData.zona || capturedData.cp) && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Zona</span>}
            {capturedData.servicio && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Servicio</span>}
            {capturedData.fecha && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Fecha</span>}
            {capturedData.hora && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Hora</span>}
            {capturedData.direccion && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Dirección</span>}
            {capturedData.telefono && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Teléfono</span>}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 && !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">💆</span>
              </div>
              <p className="text-lg font-semibold mb-2 text-gray-600">Bienvenido a MassFlow</p>
              <p className="text-sm text-gray-500">Tu asistente personal para masajes a domicilio</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`flex items-end gap-2 max-w-[85%] lg:max-w-[70%]`}>
              {message.sender === 'bot' && (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-sm">💆</span>
                </div>
              )}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-md shadow-lg'
                    : 'bg-white/90 backdrop-blur-sm text-gray-800 rounded-bl-md shadow-md border border-gray-100'
                }`}
              >
                <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                <p className={`text-[10px] mt-1.5 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
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
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-sm">💆</span>
              </div>
              <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-2xl rounded-bl-md shadow-md border border-gray-100">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {currentQuickReplies.length > 0 && !loading && (
        <div className="px-4 pb-3 max-w-4xl mx-auto w-full">
          <div className="flex flex-wrap gap-2 justify-center">
            {currentQuickReplies.map((reply, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(reply)}
                className="bg-white/90 backdrop-blur-sm border-2 border-indigo-200 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:scale-105 transition-all shadow-sm hover:shadow-md"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4 shadow-2xl">
        <div className="max-w-4xl mx-auto">
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
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 text-sm bg-white/90 backdrop-blur-sm transition"
              autoFocus
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg disabled:shadow-none hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Lía te responderá en segundos · Conversación segura y privada
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  )
}
