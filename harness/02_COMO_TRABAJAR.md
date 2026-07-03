# 🛠️ CÓMO TRABAJAR — Guion paso a paso

> Escrito para que **cualquiera** (incluida una IA poco capaz) pueda avanzar el proyecto
> sin romper nada. Sigue estos pasos al pie de la letra.

---

## El bucle de trabajo (repite esto)

```
1. Abre 01_ESTADO_Y_PLAN.md.
2. Busca la PRIMERA tarea con [ ] (de la fase más baja). Esa es tu tarea.
   - Si está marcada [🔒], necesita algo del usuario (ver 03_SETUP_ENTORNO.md). Salta a la siguiente NO bloqueada.
3. Lee la descripción de la tarea y los archivos que menciona.
4. Haz el cambio (lo más pequeño posible para cumplir la tarea).
5. Comprueba que compila:  npm run build
6. Si puedes, pruébalo en la app (ver "Arrancar la app" abajo).
7. Si todo bien: marca la casilla [x] y añade una línea al Diario de 01_ESTADO_Y_PLAN.md.
8. Vuelve al paso 1.
```

**Regla de oro:** una tarea cada vez. No empieces 5 cosas a la vez.

---

## Arrancar la app

```bash
cd C:/Users/oscar/Documents/SAAS-madajesadomicilio
npm install          # solo la primera vez
npm run dev          # abre http://localhost:5173
```

- Si ves el error *"Faltan variables VITE_SUPABASE_URL..."* → no hay `.env`. Ve a [`03_SETUP_ENTORNO.md`](03_SETUP_ENTORNO.md).
- Sin un Supabase real solo verás la pantalla de login (no podrás entrar). Para ver flujos por dentro hace falta la Fase 0 hecha.

---

## Cómo COMPROBAR que una tarea está bien hecha

Una tarea solo se marca `[x]` si cumple **al menos** esto:

1. **Compila:** `npm run build` termina sin errores de TypeScript. (Imprescindible, siempre.)
2. **Hace lo que dice:** si la tarea era "guardar X en la BD", abre el archivo y confirma que hay una llamada real `supabase.from('tabla').update(...)`/`.insert(...)` con los campos correctos — no un `alert` ni un `console.log`.
3. **No rompe lo de antes:** la app sigue arrancando (`npm run dev` sin pantalla en blanco / sin errores rojos en la consola del navegador).
4. **(Ideal) Visto funcionando:** si la Fase 0 está hecha, haz la acción en la app y verifica el cambio (p.ej. recarga y el dato sigue ahí → se guardó de verdad).

Si no puedes hacer el punto 4 (no hay Supabase), marca la tarea `[x]` igualmente pero escribe en el Diario *"compila; pendiente de probar en vivo"*.

---

## Señales de "esto es fachada" (lo que venimos a arreglar)

Cuando leas un componente, sospecha si ves:
- `alert('...')` o `alert('Requiere backend')` → botón que no hace nada real.
- `console.log(...)` + `setTimeout(... )` simulando que guarda → **falso guardado**.
- Un formulario cuyos valores iniciales salen de `currentUser` pero ese campo **no existe** en el mapeo de `AppContext.tsx` (líneas ~42-61) → el campo arranca vacío.
- `(currentUser as any).algo` → casi siempre es un campo que no llega y sale `undefined`.

El arreglo casi siempre es: **cargar el dato en `AppContext.tsx` y/o escribirlo con `supabase.from(...)`**.

---

## Dónde se tocan las cosas (chuleta)

| Quiero... | Toco... |
|-----------|---------|
| Cargar datos de la BD | `src/AppContext.tsx` (funciones `loadXxx`) |
| Guardar datos en la BD | `src/AppContext.tsx` (funciones `updateXxx`/`createXxx`) |
| Login / registro / sesión | `src/hooks/useAuth.tsx` |
| Cambiar el esquema de la BD | nueva migración en `supabase/migrations/` (ver referencia técnica) |
| Lógica de servidor (admin, cron, pagos) | `supabase/functions/` (Edge Functions Deno) |
| Una pantalla concreta | `src/components/{admin,masajista,clienta}/...` |
| Tipos del dominio | `src/types.ts` |

---

## Si te atascas

1. Relee la tarea en `01_ESTADO_Y_PLAN.md` y la chuleta de arriba.
2. Mira cómo está hecha una tarea **parecida ya funcionando** en `AppContext.tsx` (p.ej. para "guardar disponibilidad" copia el patrón de `updateMasajista`).
3. Consulta el esquema real en [`04_REFERENCIA_TECNICA.md`](04_REFERENCIA_TECNICA.md) para usar los nombres de columna correctos.
4. Si sigues atascado, deja la tarea como `[~]` (a medias) con una nota en el Diario explicando dónde te quedaste, y pasa a la siguiente tarea independiente.

---

## Git (cuando el usuario lo pida)

El repo remoto es `kabalah314-ux/SAAS-madajesadomicilio`. Antes de subir, sigue `directives/subir_a_github_SOP.md`. No subas el archivo `.env` (está en `.gitignore`).
