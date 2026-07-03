"""
Verifica: (1) el trigger crea el aviso 'solicitud_recibida' al cliente con payload
rico (servicio/fecha/hora/precio/codigo); (2) el email REAL se entrega con la
plantilla nueva (apuntando temporalmente el email de Ana a la cuenta de Resend
en modo prueba, como en el testeo Batch 2 anterior). Restaura todo al final.
"""
import json, urllib.request
from sbhelp import q, q_as, BASE, ANON, admin_jwt

ANA = q("select id, email from profiles where role='cliente' limit 1;")[0]
SRV = q("select id, precio_eur from servicios where nombre ilike '%relajante%' limit 1;")[0]
RESEND_TEST_EMAIL = "recordingmythings@gmail.com"

R = []
def rec(name, ok, note=""): R.append(ok); print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {note}")

# 1) Crear la reserva como la clienta (RLS)
q_as("authenticated",
     "insert into reservas (cliente_id,servicio_id,fecha,hora_inicio,duracion_min,direccion_servicio,ciudad,barrio,estado) "
     "values ('%s','%s','2026-09-30','17:00',60,'Calle Prueba 22','Madrid','Salamanca','pendiente');" % (ANA["id"], SRV["id"]),
     uid=ANA["id"])
res = q("select id, codigo, precio_total from reservas where direccion_servicio='Calle Prueba 22' order by created_at desc limit 1;")[0]
rid = res["id"]

# 2) Verificar el aviso al cliente en BD
notif = q("select id, titulo, mensaje, payload from notificaciones where user_id='%s' and payload->>'reserva_id'='%s' and payload->>'evento'='solicitud_recibida';" % (ANA["id"], rid))
rec("notificación 'solicitud_recibida' creada", bool(notif), f"n={len(notif)}")
if notif:
    p = notif[0]["payload"]
    rec("payload trae servicio/fecha/hora/precio/codigo", all(k in p for k in ["servicio", "fecha", "hora", "precio", "codigo"]), f"payload={p}")
    rec("titulo cercano (no cutre)", "recibido" in notif[0]["titulo"].lower(), f"titulo='{notif[0]['titulo']}'")

# 3) Entrega REAL: apuntar temporalmente el email de Ana a la cuenta de Resend y reenviar
q("update profiles set email='%s' where id='%s';" % (RESEND_TEST_EMAIL, ANA["id"]))
try:
    # Mismo secreto que usa el trigger de BD (trg_notif_send_email -> net.http_post),
    # leído de la definición viva de la función (Management API), no inventado.
    WEBHOOK_SECRET = q("select regexp_replace(pg_get_functiondef(oid), '.*x-webhook-secret'',''([a-z0-9]+)''.*', '\\1', 's') as s "
                        "from pg_proc where proname='notif_send_email';")[0]["s"]
    body = {"record": {"user_id": ANA["id"], "tipo": "reserva_nueva", "titulo": notif[0]["titulo"], "mensaje": notif[0]["mensaje"], "payload": notif[0]["payload"]}}
    req = urllib.request.Request(f"{BASE}/functions/v1/send-email", data=json.dumps(body).encode(),
                                  headers={"apikey": ANON, "Content-Type": "application/json", "x-webhook-secret": WEBHOOK_SECRET}, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read().decode())
        rec("email enviado (sent=true)", bool(resp.get("sent")), f"resp={resp}")
    except urllib.error.HTTPError as e:
        rec("email enviado (sent=true)", False, f"HTTP {e.code}: {e.read().decode()[:300]}")
finally:
    q("update profiles set email='%s' where id='%s';" % (ANA["email"], ANA["id"]))
    print("  (email de Ana restaurado)")

# limpiar
q("delete from notificaciones where payload->>'reserva_id'='%s';" % rid)
q("delete from reservas where id='%s';" % rid)

print(f"\nRESUMEN: {sum(R)}/{len(R)} PASS")
print("reservas base:", [x['codigo'] for x in q('select codigo from reservas order by created_at;')])
