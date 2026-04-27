# MassFlow - Sistema de Gestión de Masajes a Domicilio

Sistema completo de gestión para servicios de masajes a domicilio con 3 roles de usuario: **Admin**, **Masajista** y **Clienta**.

## 🚀 Características Implementadas

### FASE A - Panel Masajista ✅

- **Mi Calendario** - Vista semanal con sesiones asignadas, navegación entre semanas, modal de detalle
- **Solicitudes Pendientes** - Listado de solicitudes con temporizador, botones aceptar/rechazar
- **Historial de Servicios** - Tabla completa con filtros, totales, valoraciones
- **Mis Cobros** - Ciclo actual de pagos, historial de transferencias
- **Documentación** - Gestión de 3 documentos (Autónoma, Seguro RC, DNI) con estados
- **Mi Perfil** - Edición de bio, especialidades, zonas de cobertura, estadísticas

### FASE B - Panel Cliente (Parcial) ✅

- **Mis Datos** - Formulario completo de datos personales, dirección habitual, preferencias, cambio de PIN
- **Mis Reservas** - Listado con estadísticas y badges de estado
- Vista de inicio con accesos directos

### Panel Admin (Stub) 📊

- Dashboard básico con KPIs generales
- Vistas completas en desarrollo

## 🎨 Stack Tecnológico

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (estilos)
- **Lucide React** (iconos)
- **Recharts** (gráficos - instalado para futuras vistas)
- **date-fns** (manejo de fechas)

## 📦 Estructura de Datos

### Usuarios
- **Admin**: Gestión total del sistema
- **Masajista**: bio, especialidades, zonas, documentos, rating
- **Clienta**: dirección habitual, preferencias, historial

### Sistema
- **Reservas**: 6 estados (pendiente, confirmada, completada, cancelada)
- **Servicios**: 6 tipos de masajes con precios configurables
- **Transferencias**: ciclos quincenales de pago a masajistas
- **Valoraciones**: sistema de 1-5 estrellas con comentarios
- **Notificaciones**: sistema in-app con badges

## 🔐 Usuarios de Demo

### Admin
- Email: `admin@massflow.com`
- PIN: `1111`

### Masajista (Laura)
- Email: `laura@massflow.com`
- PIN: `2222`

### Cliente (Ana)
- Email: `ana@email.com`
- PIN: `5555`

## 🎯 Reglas de Negocio

- **Comisión plataforma**: 40% (configurable)
- **Pago masajista**: 60% (configurable)
- **Precio máximo sesión**: 60€
- **Ciclo de pago**: Quincenal (1-15 y 16-fin de mes)
- **Tiempo respuesta solicitud**: 2 horas
- **Cancelación cliente**: Hasta 24h antes

## 🛠️ Próximas Implementaciones

### Panel Admin Completo
- Dashboard con gráficos Recharts
- Gestión completa de reservas con asignación
- CRUD de masajistas con verificación de docs
- Gestión de clientas con perfiles detallados
- Módulo de transferencias
- Configuración del sistema

### Panel Cliente Completo
- Flujo de reserva de 6 pasos con validaciones
- Cancelación de reservas (con regla de 24h)
- Sistema de valoraciones completo
- Repetir reserva

### Coherencia Global
- Propagación de estados entre paneles
- Sistema de notificaciones completo
- Empty states en todas las secciones
- Responsive completo (mobile, tablet, desktop)
- Dark mode

## 🚀 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build producción
npm run build
```

## 📱 Responsive

- **Desktop**: Tablas completas, calendarios semanales
- **Tablet**: Grid adaptativo, navegación lateral
- **Mobile**: Cards apiladas, bottom sheets, lista diaria

## 🎨 Sistema de Diseño

- **Colores primarios**: Teal/Emerald gradient
- **Badges de estado**: 
  - Verde = Completado/Verificado
  - Amarillo = Pendiente
  - Azul = Confirmado
  - Rojo = Cancelado/Error
  - Gris = Inactivo
- **Iconos**: Lucide React (consistentes)
- **Fuentes**: Sistema nativo (sans-serif)
- **Shadows**: Elevaciones sutiles
- **Animaciones**: Transiciones suaves

## 📊 Estado Actual

**Completado**: 60%
- ✅ Autenticación y roles
- ✅ Panel Masajista (90%)
- ✅ Panel Cliente (40%)
- ⏳ Panel Admin (20%)
- ⏳ Coherencia global (30%)

---

**MassFlow** © 2024 - Sistema de gestión profesional para servicios de masajes a domicilio
