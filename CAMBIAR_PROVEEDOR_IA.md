# 🔄 Cómo Cambiar de Proveedor de IA

## 🚀 Ultra Rápido (3 opciones)

### OPCIÓN 1: Cambiar para TODOS los clientes

**1. Editar `.env.local`**:

```env
# Antes (Anthropic - por defecto)
ANTHROPIC_API_KEY=sk-ant-xxx

# Después (OpenAI - cambiar a esto)
OPENAI_API_KEY=sk-proj-xxx
# O
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyDxxx
```

**2. Actualizar el webhook** para usar otro proveedor por defecto:

`app/api/whatsapp/webhook/route.ts`:

```typescript
// Cambiar línea (antes):
const clasificacion = await clasificarIntencion(textoMensaje, conversacion)

// Por:
const clasificacion = await clasificarIntencionMultiTenant(
  textoMensaje,
  conversacion,
  'default-empresa-id'  // Si usas un solo cliente
)
```

**3. Deploy a Vercel**:

```bash
git add .
git commit -m "chore: Change default IA provider to OpenAI"
git push
```

---

### OPCIÓN 2: Cambiar para un cliente específico (Multi-tenant)

**En Supabase SQL**:

```sql
-- Cambiar cliente de Anthropic a OpenAI
UPDATE public.empresas SET
  proveedor_ia = 'openai',
  api_key_ia = 'sk-proj-xxxx_su_api_key'
WHERE nombre = 'Masajes Juan García';

-- O cambiar a Gemini
UPDATE public.empresas SET
  proveedor_ia = 'gemini',
  api_key_ia = 'AIzaSy_su_api_key'
WHERE nombre = 'Masajes Juan García';

-- O volver a Anthropic
UPDATE public.empresas SET
  proveedor_ia = 'anthropic',
  api_key_ia = 'sk-ant-_su_api_key'
WHERE nombre = 'Masajes Juan García';
```

**Listo**. El cliente verá cambios inmediatos.

---

### OPCIÓN 3: Pruebas (sin cambiar producción)

**En tu `.env.local` local:**

```bash
# Probar OpenAI mientras usas Anthropic en producción
OPENAI_API_KEY=sk-proj-test-xxx
```

**En código**:

```typescript
// Crear proveedor específico para testing
const proveedorTest = new OpenAIProvider(process.env.OPENAI_API_KEY)
const resultado = await proveedorTest.clasificar(mensaje, contexto)
console.log('OpenAI resultado:', resultado)
```

---

## 📊 Comparación de Proveedores

| Aspecto | OpenAI | Gemini | Claude | Heurística |
|--------|--------|--------|--------|-----------|
| **Costo** | $0.15/1M | $0.075/1M | $0.80/1M | Gratis |
| **Calidad** | Muy buena | Buena | Excelente | Básica |
| **Setup** | 2 min | 3 min | 2 min | 0 min |
| **Latencia** | ~100ms | ~150ms | ~200ms | <1ms |
| **Internet** | Necesario | Necesario | Necesario | NO |
| **Para 100 clientes** | €15/mes | €7.50/mes | €80/mes | €0 |

---

## 💰 COSTOS REALES POR 1000 MENSAJES

```
OpenAI GPT-4o mini:
- 1000 mensajes ≈ 50000 tokens ≈ $0.0075 = €0.007

Google Gemini:
- 1000 mensajes ≈ 50000 tokens ≈ $0.00375 = €0.004

Anthropic Claude:
- 1000 mensajes ≈ 50000 tokens ≈ $0.04 = €0.04

Heurística (fallback):
- 1000 mensajes = €0 ✅
```

---

## 🎯 RECOMENDACIONES

| Caso | Proveedor | Por qué |
|------|----------|--------|
| Clientes presupuestados | Gemini | Más barato + buena calidad |
| Máxima calidad | Claude | Mejor entiende contexto |
| Balance costo/calidad | OpenAI | Punto medio perfecto |
| Sin internet/servidor propio | Local | Gratis, pero requiere GPU |
| Fallback de emergencia | Heurística | Nunca falla, sin costo |

---

## 🔌 CÓMO FUNCIONA INTERNAMENTE

```typescript
// 1. Factory inteligente
const proveedor = crearProveedorIA({
  proveedor: 'openai',  // ← Tú eliges
  apiKey: 'tu_key_aqui'
})

// 2. Todos tienen la MISMA interfaz
await proveedor.clasificar(mensaje, contexto)
// Devuelve siempre: { intencion, confianza, proveedor }

// 3. Resultado idéntico, independiente del proveedor
// ✅ Compatible con todo el resto del código
```

---

## 🚀 PASOS PARA CAMBIAR EN PRODUCCIÓN

### Cambio con CERO downtime:

**1. Actualizar en Supabase (1 segundo)**:

```sql
UPDATE public.empresas SET proveedor_ia = 'openai' WHERE es_activo = true;
```

**2. Listo**. Los mensajes nuevos usan OpenAI.

**3. Mensajes antiguos siguen siendo de Anthropic** (historial intacto).

---

## ⚠️ GOTCHAS IMPORTANTES

### ❌ Error común 1: Olvidar API Key

```typescript
// ❌ FALLA
UPDATE public.empresas SET proveedor_ia = 'openai' WHERE id = 'xxx';
// Sin actualizar api_key_ia → error en tiempo de ejecución

// ✅ CORRECTO
UPDATE public.empresas SET 
  proveedor_ia = 'openai',
  api_key_ia = 'sk-proj-xxxx'  // ← También actualizar
WHERE id = 'xxx';
```

### ❌ Error común 2: Credenciales expiradas

- **OpenAI**: Las keys pueden revocar. Revisar que tenga $ disponible.
- **Gemini**: APIs key del proyecto correcto.
- **Claude**: Estar en tier pagado, no trial gratis.

### ❌ Error común 3: Rate limiting

Si cambias a un proveedor muy barato y usas muchos mensajes:

```
// Gemini tiene límite de 1500 requests/min (free)
// Si excedes: esperar o pagar por tier superior
```

---

## 🧪 TESTING DE CAMBIO

**Antes de hacer cambio en producción:**

```bash
# 1. Local
npm run dev

# 2. Probar en consola del navegador
fetch('/api/test-provider', {
  method: 'POST',
  body: JSON.stringify({
    proveedor: 'openai',
    mensaje: 'Hola quiero una cita',
    empresa_id: 'test-xxx'
  })
})

# 3. Ver respuesta
// { intencion: "RESERVAR_CITA", confianza: 0.8, proveedor: "openai" }

# 4. Si funciona → cambiar en producción
```

---

## 🔄 ROLLBACK (Volver atrás)

Si algo falla, revertir es instantáneo:

```sql
-- Volver a Anthropic
UPDATE public.empresas SET 
  proveedor_ia = 'anthropic',
  api_key_ia = 'sk-ant-xxxx_original'
WHERE id = 'empresa_problematica';
```

**Los clientes ven el cambio en el próximo mensaje** (~5 segundos).

---

## 📈 MIGRACIÓN GRADUAL

**Para cambiar sin riesgo:**

```
Día 1: 10% de clientes en OpenAI, 90% en Anthropic
Día 2: 25% OpenAI, 75% Anthropic
Día 3: 50% OpenAI, 50% Anthropic
Día 4: 75% OpenAI, 25% Anthropic
Día 5: 100% OpenAI
```

**Código para esto**:

```typescript
// En la función de clasificación
const porcentajeOpenAI = obtenerPorcentajeDelDia()

if (Math.random() < porcentajeOpenAI) {
  return await clasificarConOpenAI(...)
} else {
  return await clasificarConAnthropic(...)
}
```

---

## ✅ CHECKLIST

- [ ] Tienes API key del nuevo proveedor
- [ ] Probaste localmente que funciona
- [ ] Actualizaste BD con `proveedor_ia` y `api_key_ia`
- [ ] Esperaste 2 minutos
- [ ] Enviaste mensaje de prueba por WhatsApp
- [ ] Bot respondió correctamente
- [ ] No hay errores en logs de Vercel

**Listo para clientes**. Cambio fue <1 minuto y sin downtime. ✅

---

**Última actualización**: 2026-05-08
