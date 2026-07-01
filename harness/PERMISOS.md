# 🔐 Política de permisos (qué pido y qué no)

> Modelo definido por el usuario (2026-07-01). **Regla base: `defaultMode: acceptEdits`
> + `allow` amplio → SOLO se pide permiso para lo que está en la lista `ask`.** Todo lo
> demás se ejecuta sin molestar. **Las claves/secretos NUNCA van en settings ni en el repo.**

## Dónde viven los permisos
- **Sesión activa (worktree):** `…/.claude/worktrees/<nombre>/.claude/settings.local.json`
  ← es el que **vale ahora mismo** (mi cwd es el worktree, no la carpeta MassFlow).
- **Proyecto MassFlow:** `SAAS-madajesadomicilio/.claude/settings.local.json` (misma config).
- **Global del usuario:** `C:\Users\oscar\.claude\settings.json` → tiene un **`deny`** que
  **manda sobre todo** (ver abajo).

## ✅ Permitido sin preguntar (todo lo que NO esté en `ask`)
- **Ficheros:** Read/Write/Edit/MultiEdit (edits auto-aceptados por `acceptEdits`).
- **Bash** en general (tests `python *`, `npm run/install`, `git` local, build, etc.).
- **Migraciones SQL / consultas** (van dentro de los scripts python vía Management API).
- **Herramientas de preview** `mcp__Claude_Preview__*` (arrancar/inspeccionar/capturar la app).
- **Desplegar Edge Functions** (`npx supabase functions deploy …`) → **NO** está en `ask`,
  así que se ejecuta sin preguntar (se usa para redeploys del agente/expire-reservas).

## 🟠 SIEMPRE pido permiso antes (lista `ask`)
- **Borrados peligrosos:** `rm -rf`, `rm -r`.
- **Git destructivo:** `git push --force`/`-f`, `git reset --hard`, `git clean -fd`.
- **BD destructiva:** `DROP TABLE/DATABASE`, `psql/mysql …DROP…`, `supabase db reset/push`
  (y sus variantes con `npx`).
- **Deploy a PRODUCCIÓN:** `vercel --prod` / `vercel deploy --prod` (y `npx …`).
- **Dinero / publicación:** `stripe …`, `npm publish`.
- **Cloud destructivo:** `gcloud …delete…`, `aws …delete…`.
- **Sistema:** `sudo`, `chmod 777`, `chown`.
- **Secretos:** leer/escribir `.env` / `.env.*`, `~/.ssh`, `~/.aws`, `~/.gnupg`.

## 🔴 BLOQUEADO del todo (deny global — más estricto que `ask`)
El `settings.json` global tiene un `deny` que **gana** al `ask`: `sudo`, `curl|bash`/`wget|sh`,
`git push --force`, `git reset --hard`, `git clean -fd`, `npm publish`, `iex`. Estos NO se
piden, se **rechazan**. Si se quisieran solo "avisar", habría que quitarlos del deny global.

## 🔑 Claves/secretos
NO se guardan en settings ni en el repo. El **token de Supabase** (acceso total a la BD) se lee
de `C:\Users\oscar\AppData\Local\massflow\sb_token.txt` (fuera del repo); OpenRouter/Resend/etc.
viven como **secrets de Supabase**. Si el token da 401, se pide uno nuevo y se sobrescribe ese archivo.
