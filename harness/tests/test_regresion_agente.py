"""
Regresión E2E de los flujos del AGENTE que faltaban, por importancia:
FA3 reserva cliente registrado, FA5 reserva por cada masaje, FA7 recado, FA6 consultar cita,
FA8 transferir, FA1 info. Llama a la Edge Function 'agente' real. Serial + limpieza.
"""
from sbhelp import q, agente

R = []
def rec(flow, ok, note=""):
    R.append((flow, ok)); print(f"  [{'PASS' if ok else 'FAIL'}] {flow}: {note}")

ADMIN = q("select id from profiles where role='admin' limit 1;")[0]["id"]
ANA = q("select id, phone from profiles where role='cliente' limit 1;")[0]
ANA_ID, ANA_PHONE = ANA["id"], ANA["phone"]

def tools(cid):
    return [m["contenido"].replace("herramienta: ", "") for m in
            q("select contenido from agente_mensajes where conversacion_id='%s' and rol='sistema' and contenido like 'herramienta:%%';" % cid)]

def limpia(cid, borrar_contacto=True):
    conv = q("select reserva_id, contacto_id from agente_conversaciones where id='%s';" % cid)
    if conv:
        c = conv[0]
        if c["reserva_id"]:
            q("delete from notificaciones where payload->>'reserva_id'='%s';" % c["reserva_id"])
            q("delete from reservas where id='%s';" % c["reserva_id"])
        q("delete from agente_mensajes where conversacion_id='%s';" % cid)
        q("delete from agente_conversaciones where id='%s';" % cid)
        if borrar_contacto and c["contacto_id"]:
            q("delete from reservas where contacto_id='%s';" % c["contacto_id"])
            q("delete from contactos where id='%s';" % c["contacto_id"])

def reservar(phone, texto):
    r = agente(texto, telefono=phone); cid = r["conversation_id"]
    row = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
    if not row["reserva_id"]:
        r = agente("Sí, confirmo.", conversation_id=cid, telefono=phone)
    return cid, r

# ---------- FA3 · Reserva de CLIENTE REGISTRADO ----------
print("== FA3 · Reserva cliente registrado (Ana por su teléfono) ==")
r = agente("Hola, ¿me reconoces?", telefono=ANA_PHONE)
cid = r["conversation_id"]
conv = q("select cliente_id, contacto_id from agente_conversaciones where id='%s';" % cid)[0]
rec("FA3 reconoce cliente registrado", str(conv["cliente_id"]) == ANA_ID and conv["contacto_id"] is None, f"cliente_id={str(conv['cliente_id'])[:8]} saludo='{(r['reply'] or '')[:40]}'")
# reserva
r2 = agente("Quiero un relajante el 2026-09-20 a las 17:00 en mi dirección de siempre, Calle Luna 5, barrio Centro.", conversation_id=cid, telefono=ANA_PHONE)
row = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
if not row["reserva_id"]:
    agente("Sí, confirmo.", conversation_id=cid, telefono=ANA_PHONE)
conv = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
if conv["reserva_id"]:
    res = q("select cliente_id, contacto_id, precio_total from reservas where id='%s';" % conv["reserva_id"])[0]
    rec("FA3 reserva con cliente_id (no contacto)", str(res["cliente_id"]) == ANA_ID and res["contacto_id"] is None, f"cliente_id set, contacto={res['contacto_id']}")
else:
    rec("FA3 reserva con cliente_id (no contacto)", False, "no creó reserva")
limpia(cid, borrar_contacto=False)

# ---------- FA5 · Reserva por cada masaje ----------
print("== FA5 · Reserva por cada masaje ==")
casos = [("deportivo", 70.0, 60, "+34655071001"), ("descontracturante", 65.0, 60, "+34655071002"), ("drenaje", 80.0, 75, "+34655071003")]
for nombre, precio, dur, tel in casos:
    cid, _ = reservar(tel, f"Quiero un masaje {nombre} el 2026-09-21 a las 11:00. Me llamo Test {nombre}, Calle X 1, barrio Salamanca.")
    conv = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
    if conv["reserva_id"]:
        res = q("select s.nombre, r.precio_total, r.duracion_min from reservas r join servicios s on s.id=r.servicio_id where r.id='%s';" % conv["reserva_id"])[0]
        ok = float(res["precio_total"]) == precio and int(res["duracion_min"]) == dur and nombre.split()[0][:6].lower() in res["nombre"].lower()
        rec(f"FA5 {nombre}", ok, f"servicio={res['nombre']} precio={res['precio_total']} dur={res['duracion_min']}")
    else:
        rec(f"FA5 {nombre}", False, "no creó reserva")
    limpia(cid)

# ---------- FA7 · Recado ----------
print("== FA7 · Recado ==")
r = agente("¿Podéis avisar a la dueña de que la clienta María quiere hablar sobre una factura? Es un recado.", telefono="+34655073000")
cid = r["conversation_id"]
if not any("tomar_recado" in t for t in tools(cid)):
    r = agente("Sí, por favor deja el recado.", conversation_id=cid, telefono="+34655073000")
conv = q("select resultado from agente_conversaciones where id='%s';" % cid)[0]
usó = any("tomar_recado" in t for t in tools(cid))
nadmin = q("select count(*) c from notificaciones where user_id='%s' and titulo ilike '%%recado%%';" % ADMIN)[0]["c"]
rec("FA7 recado -> notif admin", usó and conv["resultado"] == "recado" and int(nadmin) >= 1, f"tool={usó} resultado={conv['resultado']} notifs_admin={nadmin}")
# limpiar notif de recado
q("delete from notificaciones where user_id='%s' and titulo ilike '%%recado%%';" % ADMIN)
limpia(cid)

# ---------- FA6 · Consultar mi cita ----------
print("== FA6 · Consultar mi cita ==")
tel6 = "+34655072000"
cid, _ = reservar(tel6, "Quiero un relajante el 2026-09-25 a las 12:00. Soy Test Cita, Calle Y 2, barrio Centro.")
cod = None
conv = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
if conv["reserva_id"]:
    cod = q("select codigo from reservas where id='%s';" % conv["reserva_id"])[0]["codigo"]
r = agente("¿Cuándo es mi próxima cita?", conversation_id=cid, telefono=tel6)
usó = any("consultar_mi_reserva" in t for t in tools(cid))
menciona = cod and (cod in (r["reply"] or "") or "25" in (r["reply"] or ""))
rec("FA6 consultar mi cita", usó and bool(menciona), f"tool={usó} reply='{(r['reply'] or '')[:70]}'")
limpia(cid)

# ---------- FA8 · Transferir ----------
print("== FA8 · Transferir ==")
r = agente("Prefiero hablar con una persona de verdad, ¿me pasas con alguien?", telefono="+34655074000")
cid = r["conversation_id"]
if not any("transferir" in t for t in tools(cid)):
    r = agente("Sí, pásame con una persona por favor.", conversation_id=cid, telefono="+34655074000")
conv = q("select resultado from agente_conversaciones where id='%s';" % cid)[0]
rec("FA8 transferir", any("transferir" in t for t in tools(cid)) and conv["resultado"] == "transferida", f"resultado={conv['resultado']}")
limpia(cid)

# ---------- FA1 · Info sin reserva ----------
print("== FA1 · Info sin reserva ==")
r = agente("¿Qué servicios y precios tenéis?", telefono="+34655075000")
cid = r["conversation_id"]
usó = any("info_negocio" in t for t in tools(cid))
conv = q("select resultado from agente_conversaciones where id='%s';" % cid)[0]
rec("FA1 info (no inventa, no reserva)", usó and conv["resultado"] != "reserva" and "55" in (r["reply"] or ""), f"tool={usó} resultado={conv['resultado']} reply='{(r['reply'] or '')[:60]}'")
limpia(cid)

print("\nRESUMEN agente: %d/%d PASS" % (sum(1 for _,ok in R if ok), len(R)))
for f, ok in R:
    if not ok: print("  FALLO:", f)
print("reservas base:", [x['codigo'] for x in q('select codigo from reservas order by created_at;')])
print("contactos:", [c['nombre'] for c in q('select nombre from contactos;')])
