-- =========================================================
-- FASE 11 · A1 — Estado 'ofrecida' (reparto con consentimiento)
-- El admin OFRECE la reserva a una masajista (estado 'ofrecida');
-- la masajista acepta (→ aceptada) o rechaza (→ vuelve al pool 'pendiente').
-- Va en migración APARTE: ALTER TYPE ADD VALUE no puede usarse en la misma
-- transacción que luego lo consume (triggers/policies del _25).
-- =========================================================
alter type public.reserva_estado add value if not exists 'ofrecida';
