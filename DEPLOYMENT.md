# 🚀 MassFlow - Deployment & Production Guide

## 📋 Estado Actual
- ✅ **Frontend**: React 18 + Vite (292KB gzipped)
- ✅ **Backend**: Supabase PostgreSQL + Auth + Storage + Realtime
- ✅ **Deploy**: Vercel (automatic from GitHub)
- ✅ **Database**: 14 tablas + RLS + Triggers + Realtime
- ✅ **Edge Functions**: 2 functions (expire-reservas, admin-actions)

## 🌐 URLs Públicas

**Producción:**
- App: https://saas-madajesadomicilio.vercel.app
- GitHub: https://github.com/kabalah314-ux/SAAS-madajesadomicilio

**Desarrollo Local:**
- App: http://localhost:5173
- Supabase Dashboard: https://supabase.com/dashboard/project/nqewibtmewemlqaxriko

## 👤 Usuarios de Demo

| Email | Rol | Contraseña |
|-------|-----|-----------|
| oscarcon314@gmail.com | Admin | *(tu contraseña)* |
| two.oscar@gmail.com | Masajista | *(su contraseña)* |
| kabalah314@gmail.com | Cliente | *(su contraseña)* |

## 🔐 Variables de Entorno

### Frontend (.env.local)
```env
VITE_SUPABASE_URL=https://nqewibtmewemlqaxriko.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZXdpYnRtZXdlbWxxYXhyaWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjA4OTMsImV4cCI6MjA5MzczNjg5M30.rRqNZ3UuMxYYXCJz0Tpp81z2vTRAlpsPdQYSpJy-KYA
```

### Vercel (Project Settings → Environment Variables)
- `VITE_SUPABASE_URL=https://nqewibtmewemlqaxriko.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJ...` (mismo que arriba)

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                        │
│  React 18 + Vite + Tailwind + TypeScript (292KB gzipped)   │
│  - Login/Auth                                              │
│  - 3 Dashboards (Admin, Masajista, Cliente)               │
│  - Real-time notificaciones                               │
└─────────────┬───────────────────────────────────────────────┘
              │
              │ HTTPS
              ▼
┌─────────────────────────────────────────────────────────────┐
│               SUPABASE (Backend & Database)                 │
├─────────────────────────────────────────────────────────────┤
│  🔐 Auth (email + password)                                │
│  📊 PostgreSQL Database                                     │
│     - 14 tables with RLS policies                          │
│     - Row Level Security (cliente, masajista, admin)       │
│     - 4 triggers (ratings, notifications, etc.)            │
│  📁 Storage (documentos, avatars)                          │
│  🔔 Realtime (notificaciones, reservas)                    │
│  ⚡ Edge Functions                                          │
│     - expire-reservas (cada 15 min)                        │
│     - admin-actions (crear usuarios, cerrar ciclos)        │
└─────────────────────────────────────────────────────────────┘
              │
              │ Git Push
              ▼
┌─────────────────────────────────────────────────────────────┐
│               GITHUB (Version Control)                      │
│  kabalah314-ux/SAAS-madajesadomicilio                      │
│  - Main branch → automatic Vercel deploy                   │
│  - Supabase migrations versioned                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Deployment

1. **Local Changes:**
   ```bash
   git add .
   git commit -m "feat: description"
   git push origin main
   ```

2. **GitHub → Vercel (Automático):**
   - Vercel detecta push a `main`
   - Ejecuta: `npm run build`
   - Genera: `/dist` (Vite bundle)
   - Deploy a: saas-madajesadomicilio.vercel.app

3. **Database Changes (Supabase):**
   ```bash
   # Crear nueva migración
   supabase migration new nombre_descriptivo

   # Aplicar localmente
   supabase db push

   # Cuando esté listo, pushear a GitHub
   # (Las migraciones están en /supabase/migrations)
   ```

## 📈 Escala & Performance

- **Bundle**: 292KB gzipped (muy optimizado)
- **TTL Realtime**: 5 minutos (cache Supabase)
- **RLS**: Todas las queries filtradas por usuario
- **Concurrencia**: Vercel auto-scale, Supabase Free tier soporta ~100 usuarios

## 🛡️ Seguridad

✅ **Implementado:**
- Row Level Security (RLS) en todas las tablas
- JWT authentication via Supabase Auth
- Passwords hasheadas en PostgreSQL
- Email verified before login (configurable)
- Admin-only operations en Edge Functions

❌ **NO Implementado Yet:**
- Stripe payments (para después)
- 2FA (Google Authenticator)
- Rate limiting global
- DDoS protection (incluido en Vercel/Supabase)

## 🧹 Limpieza & Mantenimiento

**Backups Supabase:**
- Free tier: daily backups, 7 días retención
- Dashboard: Authentication → Settings → Database backups

**Logs & Monitoring:**
- Vercel: vercel.com/dashboard → logs
- Supabase: Dashboard → Logs
- Realtime debug: `supabase functions logs <function-name>`

## 📱 Mobile & PWA

- ✅ Responsive completo (mobile, tablet, desktop)
- ✅ PWA manifest: `/public/manifest.json`
- ✅ Instalable en home screen (iOS/Android)
- ✅ Offline cache: PWA cache (futuro)

## 🚦 Próximos Pasos

### Phase 1: PASOS FÁCILES (Sin costo extra)
- [ ] Configurar email templates en Supabase Auth
- [ ] Activar 2FA opcional
- [ ] Agregar Google Analytics
- [ ] Custom domain (si tienes uno)

### Phase 2: STRIPE (Cuando necesites pagos)
- [ ] Crear cuenta Stripe
- [ ] Edge Function para PaymentIntents
- [ ] Webhook handler
- [ ] Botón "Pagar" en reservas

### Phase 3: ESCALA
- [ ] Supabase Pro (si superas Free tier limits)
- [ ] Vercel Pro (si necesitas builds más rápidos)
- [ ] Redis caching (si tienes muchas queries)

## 🐛 Troubleshooting

**Login no funciona en producción:**
- Verificar URLs de Auth en Supabase dashboard
- Verificar CORS en Vercel env vars

**Notificaciones no aparecen:**
- Verificar Realtime habilitado: `ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones`
- Logs: `supabase functions logs expire-reservas`

**Build falla en Vercel:**
- Revisar output en Vercel dashboard
- Comprobar `npm run build` localmente primero

## 📞 Soporte

- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **React Query:** https://tanstack.com/query
- **Tailwind:** https://tailwindcss.com

---

**Última actualización:** 2026-05-08  
**Estado:** 🟢 En Producción - Fully Functional
