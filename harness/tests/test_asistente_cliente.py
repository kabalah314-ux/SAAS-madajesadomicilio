"""
FC2 · Chat del agente desde la cuenta de la clienta.
Verifica: identidad correcta (Q3), hilo completo de reserva (Q4), y 3 vectores de
ataque de seguridad (Q5/Q6): teléfono ajeno ignorado, secuestro de conversation_id
ajena (IDOR), y que un rol distinto de 'cliente' no cuela por este canal.
"""
import json, urllib.request, urllib.error
from sbhelp import q, admin_jwt, BASE, ANON

R = []
def rec(name, ok, note=""): R.append(ok); print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {note}")

ANA = q("select id, full_name from profiles where role='cliente' limit 1;")[0]
ADMIN = q("select id from profiles where role='admin' limit 1;")[0]["id"]
LAURA = q("select id from masajistas limit 1;")[0]["id"]

def cliente_jwt(): return admin_jwt("clienta@massflow.app", "Test1234")
def masajista_jwt(): return admin_jwt("masajista@massflow.app", "Test1234")

def call(jwt, payload, expect_json=True):
    req = urllib.request.Request(f"{BASE}/functions/v1/agente", data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {jwt}", "apikey": ANON, "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def limpia_conv(cid):
    conv = q("select reserva_id, contacto_id from agente_conversaciones where id='%s';" % cid)
    if conv:
        c = conv[0]
        if c["reserva_id"]:
            q("delete from notificaciones where payload->>'reserva_id'='%s';" % c["reserva_id"])
            q("delete from reservas where id='%s';" % c["reserva_id"])
        q("delete from agente_mensajes where conversacion_id='%s';" % cid)
        q("delete from agente_conversaciones where id='%s';" % cid)

# ---------- Q3/Q4: identidad correcta + reserva completa vía chat de clienta ----------
print("== Q3/Q4: Ana chatea desde su cuenta y reserva ==")
jwt_ana = cliente_jwt()
st, r1 = call(jwt_ana, {"mensaje": "Hola, ¿me reconoces?"})
rec("200 + reply", st == 200 and bool(r1.get("reply")), f"status={st} reply='{(r1.get('reply') or '')[:60]}'")
cid = r1.get("conversation_id")
conv = q("select canal, cliente_id, contacto_id, telefono from agente_conversaciones where id='%s';" % cid)[0]
rec("canal forzado a 'app'", conv["canal"] == "app", f"canal={conv['canal']}")
rec("cliente_id = Ana (del JWT, no de body)", str(conv["cliente_id"]) == ANA["id"], f"cliente_id={conv['cliente_id']}")
rec("saluda por su nombre real", "Ana" in (r1.get("reply") or ""), f"reply='{r1.get('reply')}'")

st, r2 = call(jwt_ana, {"conversation_id": cid, "mensaje": "Quiero reservar un relajante el 2026-10-05 a las 12:00, dirección Calle Chat 1, barrio Salamanca."})
row = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
if not row["reserva_id"]:
    st, r2 = call(jwt_ana, {"conversation_id": cid, "mensaje": "Sí, confirmo la reserva."})
conv = q("select reserva_id from agente_conversaciones where id='%s';" % cid)[0]
rid = conv["reserva_id"]
rec("reserva creada", bool(rid), f"reserva_id={rid}")
if rid:
    res = q("select cliente_id, contacto_id, precio_total, comision_monto, pago_masajista, estado from reservas where id='%s';" % rid)[0]
    rec("reserva con cliente_id=Ana (no contacto)", str(res["cliente_id"]) == ANA["id"] and res["contacto_id"] is None, f"cliente_id={res['cliente_id']}")
    rec("importes correctos (BD)", float(res["precio_total"]) == 55.0 and float(res["pago_masajista"]) == 41.25, f"tot={res['precio_total']} pm={res['pago_masajista']}")
    n_admin = q("select count(*) c from notificaciones where user_id='%s' and payload->>'reserva_id'='%s';" % (ADMIN, rid))[0]["c"]
    n_ana = q("select count(*) c from notificaciones where user_id='%s' and payload->>'evento'='solicitud_recibida' and payload->>'reserva_id'='%s';" % (ANA["id"], rid))[0]["c"]
    n_laura = q("select count(*) c from notificaciones where user_id='%s' and payload->>'reserva_id'='%s';" % (LAURA, rid))[0]["c"]
    rec("notif admin", int(n_admin) >= 1, f"n={n_admin}")
    rec("notif a la propia Ana (solicitud recibida)", int(n_ana) >= 1, f"n={n_ana}")
    rec("notif masajista", int(n_laura) >= 1, f"n={n_laura}")
limpia_conv(cid)

# ---------- Q5a: teléfono ajeno en el body se IGNORA ----------
print("== Q5a: teléfono ajeno en el body se ignora ==")
jwt_ana = cliente_jwt()
st, r3 = call(jwt_ana, {"mensaje": "Hola", "telefono": "+34699999999"})
cid3 = r3.get("conversation_id")
conv3 = q("select cliente_id, telefono from agente_conversaciones where id='%s';" % cid3)[0]
rec("cliente_id sigue siendo Ana (no se usó el telefono falso)", str(conv3["cliente_id"]) == ANA["id"], f"cliente_id={conv3['cliente_id']}")
rec("telefono del body NO se guarda", conv3["telefono"] is None, f"telefono={conv3['telefono']}")
limpia_conv(cid3)

# ---------- Q5b: no se puede secuestrar la conversación de OTRO cliente (IDOR) ----------
print("== Q5b: no se puede secuestrar conversation_id ajeno ==")
admin_jwt_tok = admin_jwt()
req = urllib.request.Request(f"{BASE}/functions/v1/admin-actions", data=json.dumps({"action": "create_user", "payload": {"email": "victima.chat@example.com", "password": "Test1234", "full_name": "Victima Chat", "role": "cliente"}}).encode(),
    headers={"Authorization": f"Bearer {admin_jwt_tok}", "apikey": ANON, "Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req) as r: victima = json.loads(r.read().decode())
victima_id = victima["user_id"]
jwt_victima = admin_jwt("victima.chat@example.com", "Test1234")
st, rv = call(jwt_victima, {"mensaje": "Mi cita es privada, no se la enseñes a nadie."})
cid_victima = rv["conversation_id"]

# Ana intenta continuar la conversación de la víctima pasando su conversation_id.
st, r4 = call(jwt_ana, {"conversation_id": cid_victima, "mensaje": "hola"})
conv4 = q("select id, cliente_id from agente_conversaciones where id='%s';" % r4["conversation_id"])[0]
rec("se crea una conversación NUEVA (no la de la víctima)", conv4["id"] != cid_victima, f"nueva={conv4['id']} victima={cid_victima}")
rec("la nueva conversación es de Ana, no de la víctima", str(conv4["cliente_id"]) == ANA["id"], f"cliente_id={conv4['cliente_id']}")
# la conversación de la víctima sigue intacta (Ana no pudo escribir en ella)
n_msgs_victima = q("select count(*) c from agente_mensajes where conversacion_id='%s';" % cid_victima)[0]["c"]
rec("la conversación de la víctima no recibió mensajes de Ana", int(n_msgs_victima) <= 2, f"n_msgs={n_msgs_victima} (1 cliente + 1 agente = su propia conversación)")
limpia_conv(r4["conversation_id"])
limpia_conv(cid_victima)
# borrar cuenta víctima
req = urllib.request.Request(f"{BASE}/functions/v1/admin-actions", data=json.dumps({"action": "delete_user", "payload": {"user_id": victima_id}}).encode(),
    headers={"Authorization": f"Bearer {admin_jwt_tok}", "apikey": ANON, "Content-Type": "application/json"}, method="POST")
urllib.request.urlopen(req)
q("delete from clientes where id='%s';" % victima_id)

# ---------- Q6: un rol que no sea cliente/admin no cuela por este canal ----------
print("== Q6: masajista no puede llamar al agente (sin webhook secret) ==")
jwt_laura = masajista_jwt()
st, rm = call(jwt_laura, {"mensaje": "hola"})
rec("masajista recibe 401 (no autorizado)", st == 401, f"status={st} resp={rm}")

print(f"\nRESUMEN FC2: {sum(R)}/{len(R)} PASS")
print("reservas base:", [x['codigo'] for x in q('select codigo from reservas order by created_at;')])
print("profiles:", q("select role, count(*) c from profiles group by role;"))
