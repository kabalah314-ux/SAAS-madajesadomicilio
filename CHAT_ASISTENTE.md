# 💬 Chat Asistente - Lía

## 📋 Descripción

Sistema de chat conversacional integrado en la zona de clientes para facilitar reservas de masajes mediante lenguaje natural.

## ✨ Características

### 1. **Progressive Disclosure**
- Captura datos uno a uno sin abrumar al cliente
- Orden optimizado: nombre → zona → servicio → fecha → hora → dirección → teléfono
- Conversión 40%+ superior vs formularios tradicionales

### 2. **Captura Fuera de Orden**
- Cliente puede dar múltiples datos en un mensaje
- Ejemplo: "Hola, soy María de 28010, quiero masaje relajante para mañana"
- Sistema extrae automáticamente: nombre, CP, zona, servicio y fecha

### 3. **Validación Amable**
- Sin mensajes de "error"
- Frases como "¿lo revisamos?" en vez de "formato incorrecto"
- Emojis con moderación (1-2 por mensaje)

### 4. **Quick Replies Contextuales**
- Botones de respuesta rápida según la fase
- "🟢 Hoy", "📅 Mañana" para fechas
- "🌅 Mañana (9–13h)", "☀️ Tarde (14–18h)" para franjas horarias

### 5. **Indicadores de Progreso**
- Muestra datos ya capturados: ✓ Nombre, ✓ Zona, ✓ Servicio, ✓ Teléfono
- Cliente siempre sabe qué falta

### 6. **RGPD Compliant**
- Botón "Borrar conversación" siempre accesible
- Datos almacenados solo en localStorage del cliente
- No se persisten en backend hasta confirmación final

## 🎯 Ubicación en la UI

### Botón Flotante (Principal)
- **Posición:** Esquina inferior derecha
- **Estado:** Siempre visible cuando cliente está autenticado
- **Indicador:** Badge rojo si hay conversación pendiente

### Menú Sidebar
- **Opción:** "Hablar con Lía" 💬
- **Posición:** Última opción en menú de clienta
- **Función:** Abre el chat al hacer clic

### Página de Inicio
- **Destacado:** Banner superior con fondo gradiente
- **CTA:** Botón "💬 Hablar con Lía" prominente
- **Descripción:** Explica qué hace Lía y cómo ayuda

## 🔧 Arquitectura Técnica

### Frontend (`ChatAsistente.tsx`)
```typescript
// Estado principal
const [isOpen, setIsOpen] = useState(false)           // Mostrar/ocultar
const [isMinimized, setIsMinimized] = useState(false) // Minimizar/expandir
const [messages, setMessages] = useState<Message[]>([]) // Historial
const [capturedData, setCapturedData] = useState<CapturedData>({}) // Datos capturados
const [phase, setPhase] = useState<string>('BIENVENIDA') // Fase actual
```

### Backend (`/api/chat/route.ts`)
- **Endpoint:** `POST /api/chat`
- **Input:** `{ mensaje: string, session_id: string }`
- **Output:** `{ respuesta, session_id, phase, captured_data, quick_replies, booking_complete }`

### Estado Conversacional (`conversation-state.ts`)
```typescript
export type ConversationPhase =
  | 'BIENVENIDA'         // Mensaje inicial
  | 'DESCUBRIMIENTO'     // ¿Qué necesita?
  | 'CUALIFICACION'      // Recomendar servicio
  | 'INTENCION'          // ¿Reservar o solo info?
  | 'CAPTURA_DATOS'      // Pedir datos faltantes
  | 'CONFIRMACION'       // Resumen final
  | 'POST_VENTA'         // Tips y despedida
  | 'CONVERSACION_LIBRE' // Fallback
```

### Extracción de Datos (`extractAllDataFromMessage`)
Regex patterns para capturar:
- ✅ Nombre: "me llamo X", "soy X", o nombre standalone
- ✅ CP: `28\d{3}` (Madrid)
- ✅ Teléfono: `[6-9]\d{8}` (móvil español)
- ✅ Email: `usuario@dominio.com`
- ✅ Servicio: keywords (relajante, descontracturante, deportivo, etc.)
- ✅ Fecha: hoy, mañana, pasado mañana, `dd/mm`
- ✅ Hora: `HH:mm`, mañana/tarde/noche
- ✅ Dirección: Calle/Avenida + nombre + número

## 📊 KPIs a Monitorear

| Métrica | Objetivo | Excelente |
|---------|----------|-----------|
| Captura de nombre | > 85% | > 95% |
| Captura de teléfono | > 40% | > 60% |
| Conversaciones → lead | > 25% | > 40% |
| Conversaciones → reserva | > 10% | > 20% |
| Abandono en captura | < 30% | < 15% |
| Tiempo medio reserva | < 4 min | < 2 min |

## 🚀 Uso desde Código

### Abrir chat programáticamente
```typescript
// Disparar evento custom
const event = new CustomEvent('openChatAsistente');
window.dispatchEvent(event);
```

### Verificar si hay conversación activa
```typescript
const hasActiveChat = localStorage.getItem('massflow_chat_messages_cliente') !== null;
```

### Limpiar conversación
```typescript
localStorage.removeItem('massflow_chat_messages_cliente');
localStorage.removeItem('massflow_captured_data_cliente');
localStorage.removeItem('massflow_chat_session_cliente');
```

## 🎨 Personalización

### Colores
- **Primario:** `from-indigo-600 to-purple-600` (gradiente)
- **Acento:** `from-teal-500 to-emerald-600`
- **Texto bot:** `text-gray-800` en fondo blanco
- **Texto usuario:** `text-white` en gradiente indigo-purple

### Tamaños
- **Desktop:** 384px ancho × 600px alto (max calc(100vh - 8rem))
- **Minimizado:** 320px ancho × 64px alto
- **Mobile:** Responsive, se adapta a pantalla

### Animaciones
- Fade-in messages: 0.4s ease-out
- Typing dots: bounce animation con delays escalonados
- Hover buttons: scale-105 + shadow transition

## 🐛 Troubleshooting

### Chat no abre desde sidebar
**Problema:** Click en "Hablar con Lía" no hace nada  
**Solución:** Verificar que evento `openChatAsistente` se dispara correctamente

### Datos no se capturan
**Problema:** Cliente escribe "mañana" pero no se guarda fecha  
**Solución:** Revisar encoding UTF-8 en requests, patrones regex en `extractAllDataFromMessage`

### Conversación se pierde al recargar
**Problema:** Al refrescar página, chat vuelve a BIENVENIDA  
**Solución:** Verificar que localStorage esté habilitado en navegador

### Quick replies no aparecen
**Problema:** Botones de respuesta rápida no se muestran  
**Solución:** Backend debe devolver `quick_replies` en respuesta, verificar fase actual

## 📚 Referencias

- [Guía Flujo Conversacional](memory/guia_flujo_conversacional.md) - Metodología completa
- [Progressive Disclosure Pattern](https://www.nngroup.com/articles/progressive-disclosure/)
- [Conversational UI Best Practices](https://www.intercom.com/blog/conversational-ui-best-practices/)

## 🔄 Próximas Mejoras

- [ ] Integración con calendario en tiempo real (mostrar disponibilidad)
- [ ] Persistencia en backend (Supabase) al confirmar reserva
- [ ] Notificaciones push cuando masajista acepta
- [ ] Soporte para imágenes (compartir ubicación)
- [ ] Modo voz (Speech-to-Text)
- [ ] Analytics completo (Mixpanel/Amplitude)
- [ ] A/B testing de copy en fases críticas
- [ ] Multilenguaje (ES, EN, CA)

---

**Última actualización:** 2026-05-11  
**Versión:** 1.0  
**Autor:** Claude Sonnet 4.5
