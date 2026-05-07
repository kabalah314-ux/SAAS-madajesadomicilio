-- =========================================================
-- CONFIGURACION INICIAL
-- =========================================================
insert into public.configuracion (clave, valor, descripcion) values
  ('comision_pct',         '25',                 'Porcentaje de comision de la plataforma'),
  ('precio_maximo_eur',    '200',                'Precio maximo permitido por servicio'),
  ('cancelacion_horas',    '24',                 'Horas minimas antes para cancelar sin penalizacion'),
  ('solicitud_timeout_min','60',                 'Minutos para que masajista responda solicitud'),
  ('moneda',               '"EUR"',              'Moneda principal'),
  ('iva_pct',              '21',                 'IVA aplicado'),
  ('soporte_email',        '"soporte@massflow.app"', 'Email de soporte')
on conflict (clave) do nothing;

-- =========================================================
-- SERVICIOS DEMO
-- =========================================================
insert into public.servicios (nombre, descripcion, duracion_min, precio_eur, orden) values
  ('Masaje Relajante 60 min',    'Masaje sueco enfocado en relajacion', 60,  55.00, 1),
  ('Masaje Descontracturante 60','Trabajo profundo de tensiones',       60,  65.00, 2),
  ('Masaje Deportivo 60 min',    'Pre/post entreno',                    60,  70.00, 3),
  ('Masaje Pareja 90 min',       '2 masajistas simultaneos',            90, 140.00, 4),
  ('Drenaje Linfatico 75 min',   'Tecnica suave de drenaje',            75,  80.00, 5);
