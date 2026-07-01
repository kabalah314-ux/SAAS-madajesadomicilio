-- =========================================================
-- MASSFLOW · barrio en reservas (para filtro de zona)
-- =========================================================
-- NuevaReserva ya pide el barrio (obligatorio) pero no se guardaba.
-- Lo persistimos para poder filtrar las solicitudes por la zona de
-- cobertura de cada masajista.
alter table public.reservas add column if not exists barrio text;
