# 📚 REFERENCIA TÉCNICA — esquema, nombres y trampas

> Consulta esto cuando necesites los nombres EXACTOS de tablas/columnas o entender
> las rarezas del proyecto. Fuente de verdad: `supabase/migrations/`.

---

## ⚠️ Las 3 trampas que MÁS confunden

### 1. `cliente` (BD) vs `clienta` (interfaz)
- La **base de datos** y **Supabase Auth** usan el rol `'cliente'` (enum `user_role`).
- La **interfaz y `types.ts`** usan `'clienta'`.
- Se traducen en **UN solo punto**: `src/AppContext.tsx` (en el mapeo `profile → currentUser`) y en `src/hooks/useAuth.tsx` (tipo `Profile`).
- **NO renombres todo.** Si necesitas comparar el rol en un componente, usa `'clienta'`. Si escribes en la BD, usa `'cliente'`.

### 2. Estados de reserva: dos vocabularios
- **BD** (enum `reserva_estado`): `pendiente`, `aceptada`, `rechazada`, `completada`, `cancelada`, `expirada`.
- **Interfaz** (`types.ts` `ReservaEstado`): `pendiente_asignacion`, `confirmada`, `completada`, `cancelada_clienta`, `cancelada_masajista`, `rechazada`.
- Se traducen en `mapReserva` (BD→UI) y en `updateReserva` (UI→BD) dentro de `AppContext.tsx`. Si añades un estado, actualiza **los dos** mapeos.

### 3. El login NO es por PIN
- Aunque veas un campo `pin`, `clientes.pin_hash` y un modal de "cambiar PIN", **el login real es email + contraseña** (Supabase Auth, `useAuth.tsx`).
- Lo del PIN es un resto de un diseño viejo. La tarea 4.8 lo sustituye por "cambiar contraseña".

---

## Esquema de la base de datos (resumen)

Tablas en `public` (ver `supabase/migrations/20260507000000_init.sql`):

| Tabla | Para qué | Columnas clave |
|-------|----------|----------------|
| `profiles` | 1 fila por usuario (cualquier rol) | `id` (=auth.users.id), `role`, `full_name`, `email`, `phone`, `avatar_url`, `is_active` |
| `masajistas` | datos extra de masajista | `id`(=profiles.id), `bio`, `especialidades` text[], `zonas_cobertura` text[], `anos_experiencia`, `iban`, `stripe_account_id`, `rating_promedio`, `total_sesiones`, `is_verified`, `is_suspended`, `suspension_reason` |
| `clientes` | datos extra de clienta | `id`(=profiles.id), `direccion`, `ciudad`, `codigo_postal`, `preferencias` jsonb, `is_blocked`, `block_reason`, `internal_notes`, `total_reservas` |
| `servicios` | catálogo | `id`, `nombre`, `descripcion`, `duracion_min`, `precio_eur`, `is_active`, `orden` |
| `disponibilidad` | franjas de masajista | `masajista_id`, `dia_semana`(0-6), `hora_inicio`, `hora_fin`, `is_active` |
| `reservas` | la reserva | `id`, `codigo`(auto `MF-NNNNNN`), `cliente_id`, `masajista_id`(nullable), `servicio_id`, `fecha`, `hora_inicio`, `duracion_min`, `direccion_servicio`, `ciudad`, `codigo_postal`, `estado`, `precio_total`, `comision_pct`, `comision_monto`, `pago_masajista`, `pago_estado`, `expira_en`, `aceptada_en`, `completada_en` |
| `valoraciones` | reseña 1:1 con reserva | `reserva_id`(unique), `cliente_id`, `masajista_id`, `puntuacion`(1-5), `comentario` |
| `documentos` | docs de masajista | `masajista_id`, `tipo`, `storage_path`, `estado`(pendiente/verificado/rechazado), `reviewed_by` |
| `ciclos_pago` | quincenas | `fecha_inicio`, `fecha_fin`, `is_closed` |
| `transferencias` | pago a masajista | `ciclo_id`, `masajista_id`, `monto_eur`, `num_sesiones`, `estado`(pendiente/enviada/confirmada/fallida), `referencia` |
| `notificaciones` | avisos in-app | `user_id`, `tipo`, `titulo`, `mensaje`, `is_read` |
| `configuracion` | ajustes clave/valor | `clave` (PK), `valor` (jsonb) |
| `pagos_stripe` | pagos | `reserva_id`, `stripe_payment_intent_id`, `monto_eur`, `estado` |
| `audit_log` | auditoría | `actor_id`, `action`, `entity`, `entity_id`, `diff` |

**Valores de `configuracion` (seed):** `comision_pct=25`, `precio_maximo_eur=200`, `cancelacion_horas=24`, `solicitud_timeout_min=60`, `moneda="EUR"`, `iva_pct=21`.

> **Comisión real = 25%** (no 40 ni 60). Cualquier 40/60 en la UI es un hardcode a corregir (tarea 2.3). El pago a la masajista = `100 - comision_pct` = 75%.

---

## Lógica de servidor que YA existe (no la reinventes)

En `supabase/migrations/20260507000002_logic.sql`:
- **`handle_new_user`** → al registrarse, crea la fila en `profiles` y en `clientes`/`masajistas` según el rol.
- **`recalc_rating_masajista`** → recalcula `rating_promedio` y `total_sesiones` al insertar una valoración. (Por eso NO hay que calcular el rating a mano.)
- **`notify_reserva_event`** → crea notificaciones automáticas al crear/cambiar una reserva.
- **`set_updated_at`** → mantiene `updated_at`.
- **Vista `v_admin_kpis`** → KPIs del dashboard admin.

Edge Functions (`supabase/functions/`):
- **`admin-actions`** → verifica que quien llama es admin (vía token) y permite: `create_user`, `delete_user`, `update_role`, `close_ciclo` (cierra quincena y genera transferencias). **Bien escrita; solo falta llamarla desde la UI** (tareas 4.7 y 4.10).
- **`expire-reservas`** → marca caducadas las reservas no aceptadas. Falta programarla (tarea 6.1).

**Cómo llamar a una Edge Function desde el frontend:**
```ts
const { data, error } = await supabase.functions.invoke('admin-actions', {
  body: { action: 'close_ciclo', payload: { fecha_inicio, fecha_fin } },
});
```

---

## RLS (seguridad a nivel de fila)
Está activada en todas las tablas (`20260507000001_rls.sql`). Reglas generales: cada quien ve lo suyo; el admin ve todo. Si una consulta "no devuelve nada" pese a haber datos, sospecha de una política RLS que no deja leer esa fila con el rol actual.

---

## Convenciones de la app
- **Capa de datos única:** `src/AppContext.tsx`. Todo `supabase.from(...)` de la app vive ahí (o debería). Los componentes llaman a las funciones del contexto vía `useApp()`.
- **Mapeo BD↔UI:** funciones `mapMasajista`, `mapClienta`, `mapReserva`, `mapTransferencia` en AppContext. Si añades una columna que la UI necesita, añádela al mapper.
- **Iconos:** `lucide-react`. **Fechas:** `date-fns`. **Gráficos:** `recharts`.
