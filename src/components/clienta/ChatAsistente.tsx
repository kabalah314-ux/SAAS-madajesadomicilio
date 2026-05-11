import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, MessageCircle, Minimize2 } from 'lucide-react'

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

export default function ChatAsistente() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('massflow_chat_session_cliente')
      if (stored) return stored
      const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('massflow_chat_session_cliente', id)
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
      const stored = localStorage.getItem('massflow_chat_messages_cliente')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
        } catch { /* ignore */ }
      }

      const storedData = localStorage.getItem('massflow_captured_data_cliente')
      if (storedData) {
        try { setCapturedData(JSON.parse(storedData)) } catch { /* ignore */ }
      }
    }
  }, [])

  // Save conversation
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('massflow_chat_messages_cliente', JSON.stringify(messages))
    }
  }, [messages])

  // Save captured data
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(capturedData).length > 0) {
      localStorage.setItem('massflow_captured_data_cliente', JSON.stringify(capturedData))
    }
  }, [capturedData])

  // Show welcome message when first opened
  useEffect(() => {
    if (isOpen && !isMinimized && messages.length === 0) {
      setTimeout(() => {
        sendWelcome()
      }, 500)
    }
  }, [isOpen, isMinimized])

  // Listen for open chat event from sidebar
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true)
      setIsMinimized(false)
    }

    window.addEventListener('openChatAsistente', handleOpenChat)
    return () => window.removeEventListener('openChatAsistente', handleOpenChat)
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

    await new Promise(resolve => setTimeout(resolve, 800))

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
    localStorage.removeItem('massflow_chat_messages_cliente')
    localStorage.removeItem('massflow_captured_data_cliente')
    localStorage.removeItem('massflow_chat_session_cliente')
    setTimeout(() => sendWelcome(), 500)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-110 transition-all duration-300"
        title="Hablar con Lía"
      >
        <MessageCircle size={28} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            1
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
        isMinimized
          ? 'bottom-6 right-6 w-80 h-16'
          : 'bottom-6 right-6 w-96 h-[600px]'
      }`}
      style={{ maxHeight: isMinimized ? '4rem' : 'calc(100vh - 8rem)' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
            <span className="text-xl">💆</span>
          </div>
          <div>
            <h3 className="font-bold text-sm">Lía · Asistente MassFlow</h3>
            <p className="text-xs opacity-90 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            <Minimize2 size={18} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Progress indicator */}
          {Object.keys(capturedData).length > 0 && (
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-2">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {capturedData.nombre && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Nombre</span>}
                {(capturedData.zona || capturedData.cp) && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Zona</span>}
                {capturedData.servicio && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Servicio</span>}
                {capturedData.telefono && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Teléfono</span>}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-pink-50/30">
            {messages.length === 0 && !loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">💆</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-600">Lía está aquí para ayudarte</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%]`}>
                  {message.sender === 'bot' && (
                    <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-xs">💆</span>
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-xl text-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md'
                        : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="break-words whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    <p className={`text-[10px] mt-1 ${message.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {showTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-xs">💆</span>
                  </div>
                  <div className="bg-white px-4 py-2 rounded-xl rounded-bl-sm shadow-sm border border-gray-100">
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
            <div className="px-3 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {currentQuickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(reply)}
                    className="bg-white border-2 border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="bg-white border-t border-gray-200 p-3 rounded-b-2xl">
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
                className="flex-1 px-3 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 text-sm"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md disabled:shadow-none"
              >
                <Send size={18} />
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2 w-full text-center"
              >
                Borrar conversación
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
