# 🚀 LÉEME PRIMERO — Harness de MassFlow

> **Si acabas de abrir este proyecto (seas humano o IA), empieza por aquí.**
> Este `harness/` es el "centro de control" para llevar MassFlow a **100% funcional**
> sin perderse, aunque cambies de ordenador o pase tiempo entre sesiones.

---

## ¿Qué es MassFlow?

Un **SaaS de masajes a domicilio**. Tres roles:
- **Clienta** → reserva una sesión.
- **Masajista** → recibe la solicitud, la atiende y cobra.
- **Admin** → gestiona el negocio (catálogo, finanzas, pagos, verificación).

La plataforma se queda una **comisión**. Stack: **React + Vite + TypeScript + Tailwind + Supabase** (Postgres + Auth + Storage + Edge Functions). Se despliega en **Vercel**.

---

## El objetivo

Llevar la app de **~50% funcional** (UI casi terminada, pero muchos botones son "fachada" y faltan flujos clave) a **100% funcional y usable de verdad**.

---

## Cómo se usa este harness (en 4 pasos)

1. **Lee este archivo** (estás aquí).
2. **Abre [`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md)** → es la lista de tareas con casillas `[ ]`/`[x]`. Es la **única fuente de verdad** del progreso. Busca la primera tarea sin marcar.
3. **Lee [`02_COMO_TRABAJAR.md`](02_COMO_TRABAJAR.md)** → te dice exactamente cómo hacer una tarea, comprobarla y marcar la casilla.
4. Si la app no arranca o no tienes Supabase, ve a [`03_SETUP_ENTORNO.md`](03_SETUP_ENTORNO.md).

¿Dudas técnicas (esquema de BD, nombres raros, "por qué cliente vs clienta")? → [`04_REFERENCIA_TECNICA.md`](04_REFERENCIA_TECNICA.md).

---

## 📜 Reglas de oro (NO las rompas)

1. **El progreso vive en `01_ESTADO_Y_PLAN.md`.** Cuando termines una tarea, marca su casilla `[x]` y añade una línea en el "Diario" al final de ese archivo. No crees documentos nuevos tipo `FINAL_v2.md`.
2. **Verifica antes de marcar.** Una tarea está hecha solo si `npm run build` pasa sin errores Y (si es posible) lo has visto funcionar en la app. Ver [`02_COMO_TRABAJAR.md`](02_COMO_TRABAJAR.md).
3. **Una tarea cada vez, en orden.** Las fases están ordenadas a propósito (seguridad antes que pulido). No saltes a la Fase 5 si la 1 está sin terminar.
4. **No te creas los docs viejos.** Los archivos `PROYECTO_100_COMPLETO.md`, `RESUMEN_FINAL.md`, etc. dicen "100% completado" y es **mentira**. La verdad está en este harness.
5. **La capa de datos real es `src/AppContext.tsx`.** Ahí se cargan y guardan los datos en Supabase. NO uses `src/mockData.ts` (es código muerto). Ver [`04_REFERENCIA_TECNICA.md`](04_REFERENCIA_TECNICA.md).
6. **Cliente = clienta.** La base de datos usa `cliente`; la interfaz usa `clienta`. Se traducen en un solo punto. No lo "arregles" cambiándolo en mil sitios. Ver referencia técnica.
7. **Cambios pequeños y comprobables.** Edita, compila, comprueba, marca. Repite.

---

## Mapa rápido del repo

```
SAAS-madajesadomicilio/
├── harness/              ← ESTÁS AQUÍ (centro de control)
├── GUIA_MAESTRA.md       ← visión general del proyecto (entra después de este harness)
├── src/                  ← la app React
│   ├── AppContext.tsx    ← ⭐ capa de datos (Supabase). El archivo más importante.
│   ├── hooks/useAuth.tsx ← login/registro (Supabase Auth)
│   ├── types.ts          ← tipos del dominio
│   ├── components/       ← admin/ · masajista/ · clienta/
│   └── services/         ← (ojo: hoy es código muerto, ver plan)
├── supabase/
│   ├── migrations/       ← esquema SQL real (la BD de verdad)
│   └── functions/        ← Edge Functions (Deno)
└── package.json
```

> Siguiente paso: abre **[`01_ESTADO_Y_PLAN.md`](01_ESTADO_Y_PLAN.md)**.
