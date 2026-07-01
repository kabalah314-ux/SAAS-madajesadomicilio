// =========================================================
// Textos legales (RGPD) — B6
// =========================================================
// ⚠️ BORRADOR. Estos textos son una base de trabajo y DEBEN ser
// revisados/adaptados por asesoría legal antes de comercializar:
//   · Sustituye [NOMBRE DEL NEGOCIO], [CIF/NIF], [DOMICILIO] y
//     [EMAIL DE CONTACTO] por los datos reales del responsable.
//   · Si cambias el contenido legal, sube LEGAL_VERSION (la fecha)
//     para que se vuelva a pedir el consentimiento a los usuarios.
// =========================================================

export const LEGAL_VERSION = '2026-06-30';

export const EMPRESA = {
  nombre: '[NOMBRE DEL NEGOCIO]',
  cif: '[CIF/NIF]',
  domicilio: '[DOMICILIO]',
  email: '[EMAIL DE CONTACTO]',
};

export const TERMINOS_TEXT = `TÉRMINOS Y CONDICIONES DE USO (BORRADOR — pendiente de revisión legal)

Última actualización: ${LEGAL_VERSION}

1. Responsable
Este servicio de reserva de masajes a domicilio es prestado por ${EMPRESA.nombre} (${EMPRESA.cif}), con domicilio en ${EMPRESA.domicilio}. Contacto: ${EMPRESA.email}.

2. Objeto
La plataforma pone en contacto a clientas con profesionales del masaje y gestiona reservas, pagos y comunicaciones. ${EMPRESA.nombre} actúa como intermediario en los términos descritos aquí.

3. Cuenta de usuario
El usuario es responsable de la veracidad de sus datos y de la custodia de sus credenciales. Está prohibido el uso de la plataforma por menores de edad.

4. Reservas, precios y cancelaciones
Los precios se muestran antes de confirmar la reserva. La cancelación por parte de la clienta es posible hasta 24 horas antes de la sesión. Las condiciones concretas de cada servicio se indican en el momento de la reserva.

5. Profesionales
Los profesionales son responsables de la correcta prestación del servicio y de disponer de la documentación y permisos exigibles. ${EMPRESA.nombre} verifica la documentación aportada antes de activar a cada profesional.

6. Responsabilidad
El servicio se presta "tal cual". En la medida permitida por la ley, ${EMPRESA.nombre} no responde de daños derivados del uso indebido de la plataforma o del servicio prestado por terceros profesionales.

7. Legislación aplicable
Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados que correspondan conforme a la normativa de consumo.`;

export const PRIVACIDAD_TEXT = `POLÍTICA DE PRIVACIDAD (BORRADOR — pendiente de revisión legal)

Última actualización: ${LEGAL_VERSION}

1. Responsable del tratamiento
${EMPRESA.nombre} (${EMPRESA.cif}), ${EMPRESA.domicilio}. Contacto: ${EMPRESA.email}.

2. Datos que tratamos
· Datos identificativos y de contacto (nombre, email, teléfono, dirección).
· Datos de la reserva (servicio, fecha, dirección del servicio, importe).
· Datos de salud que la clienta decida facilitar voluntariamente (p. ej. alergias, lesiones, embarazo) para adaptar el servicio. Son datos de CATEGORÍA ESPECIAL (Art. 9 RGPD) y solo se tratan con su CONSENTIMIENTO EXPLÍCITO (Art. 9.2.a). Puede no facilitarlos; en tal caso el servicio se presta sin esa adaptación.

3. Finalidad y base jurídica
· Gestión de la reserva y la relación contractual (Art. 6.1.b).
· Tratamiento de datos de salud: consentimiento explícito (Art. 9.2.a), revocable en cualquier momento.
· Cumplimiento de obligaciones legales (facturación, etc.) (Art. 6.1.c).

4. Destinatarios
Los datos necesarios para prestar el servicio se comparten con el profesional asignado (nombre, teléfono y dirección del servicio). No se ceden a terceros salvo obligación legal o proveedores que nos prestan servicio (p. ej. pago, email) bajo contrato de encargo.

5. Conservación
Conservamos los datos mientras exista la relación y, después, durante los plazos legales aplicables. Los datos de salud se eliminan cuando dejan de ser necesarios para el servicio.

6. Derechos
Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, así como retirar el consentimiento, escribiendo a ${EMPRESA.email}. También puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

7. Seguridad
Aplicamos medidas técnicas y organizativas para proteger sus datos (control de acceso por roles, cifrado en tránsito y aislamiento por usuario).`;

export const CONSENTIMIENTO_SALUD_TEXTO =
  'Consiento expresamente que se traten los datos de salud que facilite (alergias, lesiones, embarazo, etc.) ' +
  'con la única finalidad de adaptar el servicio de masaje, conforme al Art. 9.2.a del RGPD. ' +
  'Es voluntario y puedo retirarlo en cualquier momento.';
