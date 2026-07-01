"""
Validación en vivo de los fixes del agente A1 (huecos reales), A2 (normalización
de teléfono / reconocer contacto) y A3 (consentimiento RGPD datos de salud).
Limpia lo que crea. NO toca a Marta ni las reservas base.
"""
from sbhelp import q, agente

checks = []
def chk(c, ok, note=""):
    checks.append(ok); print(f"  [{'PASS' if ok else 'FAIL'}] {c}: {note}")

def herramientas(conv_id):
    rows = q("select contenido, metadata from agente_mensajes where conversacion_id='%s' and rol='sistema' and contenido like 'herramienta:%%';" % conv_id)
    return rows

def limpia_conv(conv_id):
    q("delete from agente_mensajes where conversacion_id='%s';" % conv_id)
    q("delete from agente_conversaciones where id='%s';" % conv_id)

print("== A2 · reconocer contacto con teléfono en OTRO formato ==")
marta = q("select id, nombre, telefono from contactos where telefono='+34600999888';")
if not marta:
    print("  (no está Marta; salto A2)")
else:
    marta_id = marta[0]['id']
    r = agente("Hola, ¿me puedes ayudar?", telefono="+34 600 999 888")  # mismo número, con espacios
    conv_id = r["conversation_id"]
    conv = q("select contacto_id from agente_conversaciones where id='%s';" % conv_id)[0]
    chk("A2 reconoce contacto (no duplica)", conv["contacto_id"] == marta_id, f"contacto_id={str(conv['contacto_id'])[:8]} == Marta {str(marta_id)[:8]}")
    dups = q("select count(*) c from contactos where telefono='+34600999888';")[0]["c"]
    chk("A2 sin duplicado", int(dups) == 1, f"contactos con ese tel = {dups}")
    chk("A2 saluda por nombre", "Marta" in (r["reply"] or ""), f"reply='{(r['reply'] or '')[:60]}'")
    limpia_conv(conv_id)

print("== A1 · huecos reales (excluye hora ocupada por la única masajista) ==")
laura = q("select id from masajistas limit 1;")[0]["id"]
ana = q("select id from profiles where role='cliente' limit 1;")[0]["id"]
srv = q("select id, duracion_min from servicios where nombre ilike '%relajante%' limit 1;")[0]["id"]
FECHA = "2026-08-25"
ins = q("insert into reservas (cliente_id,servicio_id,masajista_id,fecha,hora_inicio,duracion_min,direccion_servicio,ciudad,estado) values ('%s','%s','%s','%s','12:00',60,'C Test','Madrid','aceptada') returning id,codigo;" % (ana, srv, laura, FECHA))[0]
rid = ins["id"]
try:
    r = agente(f"¿Qué horas libres tienes el {FECHA}? dime los huecos de ese día", telefono="+34655000111")
    conv_id = r["conversation_id"]
    hs = herramientas(conv_id)
    hueco_result = None
    for h in hs:
        md = h["metadata"] if isinstance(h["metadata"], dict) else {}
        if "consultar_huecos" in (h["contenido"] or "") and isinstance(md.get("result"), dict):
            hueco_result = md["result"]
    if hueco_result and "huecos" in hueco_result:
        huecos = hueco_result["huecos"]
        chk("A1 excluye 12:00 (ocupada)", "12:00" not in huecos, f"huecos={huecos}")
        chk("A1 mantiene 11:00 (libre)", "11:00" in huecos, f"huecos={huecos}")
    else:
        chk("A1 el agente llamó consultar_huecos", False, f"herramientas={[h['contenido'] for h in hs]}")
    # limpiar posible contacto nuevo + conversación
    conv = q("select contacto_id from agente_conversaciones where id='%s';" % conv_id)[0]
    limpia_conv(conv_id)
    if conv["contacto_id"]:
        q("delete from contactos where id='%s';" % conv["contacto_id"])
finally:
    q("delete from notificaciones where payload->>'reserva_id'='%s';" % rid)
    q("delete from reservas where id='%s';" % rid)

print("== A3 · consentimiento de datos de salud (criterio duro: no guardar sin consentir) ==")
# Se da TODO de golpe (nombre+dirección+fecha/hora+dato de salud). El agente NO debe reservar
# ni guardar el dato de salud en 'notas' en el mismo turno: debe pedir consentimiento primero.
r = agente("Me llamo Test A3, direccion Calle Prueba 5, barrio Salamanca. Quiero un relajante el 2026-08-27 a las 16:00. Tengo una hernia lumbar, tenlo en cuenta.", telefono="+34655000222")
conv_id = r["conversation_id"]
conv = q("select reserva_id, contacto_id from agente_conversaciones where id='%s';" % conv_id)[0]
salud_guardada = False
if conv["reserva_id"]:
    notas = (q("select notas_cliente from reservas where id='%s';" % conv["reserva_id"])[0]["notas_cliente"] or "").lower()
    salud_guardada = ("hernia" in notas or "lumbar" in notas)
    q("delete from notificaciones where payload->>'reserva_id'='%s';" % conv["reserva_id"])
    q("delete from reservas where id='%s';" % conv["reserva_id"])
chk("A3 no guarda dato de salud sin consentimiento", not salud_guardada, f"reply='{(r['reply'] or '')[:110]}'")
limpia_conv(conv_id)
if conv["contacto_id"]:
    q("delete from contactos where id='%s';" % conv["contacto_id"])

print(f"\nRESUMEN: {sum(checks)}/{len(checks)} PASS")
print("reservas base:", [x['codigo'] for x in q('select codigo from reservas order by created_at;')])
print("contactos:", [c['nombre'] for c in q('select nombre from contactos order by created_at;')])
