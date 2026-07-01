"""
Regresión E2E de los flujos CLÁSICOS contra el código actual (tras los fixes de hoy).
Impersona cada rol con RLS (set local role authenticated + claims). Serial + limpieza.
Orden de importancia: FB1 reserva clienta, FB2 masajista acepta (claim), FB6 completar+valorar+rating,
FB4 rechazo/cancelación, FB8 expiración.
"""
import json, urllib.request
from sbhelp import q, q_as, BASE, ANON

R = []
def rec(flow, cell, ok, note=""):
    R.append((flow, cell, ok, note)); print(f"  [{'PASS' if ok else 'FAIL'}] {flow}·{cell}: {note}")

# ids
ADMIN = q("select id from profiles where role='admin' limit 1;")[0]["id"]
LAURA = q("select id from masajistas limit 1;")[0]["id"]
ANA   = q("select id from profiles where role='cliente' limit 1;")[0]["id"]
SRV   = q("select id, precio_eur, duracion_min from servicios where nombre ilike '%relajante%' limit 1;")[0]
SRV_ID = SRV["id"]
# snapshot rating de Laura para restaurar
LAURA0 = q("select rating_promedio, total_sesiones from masajistas where id='%s';" % LAURA)[0]

def limpia_reserva(rid):
    q("delete from valoraciones where reserva_id='%s';" % rid)
    q("delete from notificaciones where payload->>'reserva_id'='%s';" % rid)
    q("delete from reservas where id='%s';" % rid)

def nueva_pendiente(fecha, hora, barrio="Salamanca"):
    # insert COMO la clienta (RLS): cliente_id debe ser ella; importes los pone el trigger
    q_as("authenticated",
         "insert into reservas (cliente_id,servicio_id,fecha,hora_inicio,duracion_min,direccion_servicio,ciudad,barrio,estado) "
         "values ('%s','%s','%s','%s',60,'Calle Test 9','Madrid','%s','pendiente');" % (ANA, SRV_ID, fecha, hora, barrio),
         uid=ANA)
    return q("select id, codigo, precio_total, comision_monto, pago_masajista, estado, masajista_id from reservas where direccion_servicio='Calle Test 9' order by created_at desc limit 1;")[0]

# ---------- FB1 · Clienta reserva desde la app ----------
print("== FB1 · Clienta reserva ==")
r = nueva_pendiente("2026-09-10", "11:00")
rid = r["id"]
rec("FB1", "importes BD", float(r["precio_total"])==55.0 and float(r["comision_monto"])==13.75 and float(r["pago_masajista"])==41.25, f"tot={r['precio_total']} com={r['comision_monto']} pm={r['pago_masajista']}")
rec("FB1", "pendiente/sin asignar", r["estado"]=="pendiente" and r["masajista_id"] is None, f"estado={r['estado']}")
na = q("select count(*) c from notificaciones where user_id='%s' and payload->>'reserva_id'='%s';" % (ADMIN, rid))[0]["c"]
nm = q("select count(*) c from notificaciones where user_id='%s' and payload->>'reserva_id'='%s';" % (LAURA, rid))[0]["c"]
rec("FB1", "notif admin", int(na)>=1, f"n={na}")
rec("FB1", "notif masajista", int(nm)>=1, f"n={nm}")
# la masajista la ve como solicitud (RLS)
vis = q_as("authenticated", "select id from reservas where id='%s';" % rid, uid=LAURA)
rec("FB1", "masajista ve solicitud", len(vis)>0, f"vis={len(vis)>0}")

# ---------- FB2 · Masajista acepta (claim atómico) ----------
print("== FB2 · Masajista acepta (claim) ==")
q_as("authenticated",
     "update reservas set estado='aceptada', masajista_id='%s', aceptada_en=now() "
     "where id='%s' and estado='pendiente' and masajista_id is null;" % (LAURA, rid), uid=LAURA)
r2 = q("select estado, masajista_id from reservas where id='%s';" % rid)[0]
rec("FB2", "queda aceptada+asignada", r2["estado"]=="aceptada" and str(r2["masajista_id"])==LAURA, f"estado={r2['estado']}")
ncli = q("select count(*) c from notificaciones where user_id='%s' and tipo='reserva_aceptada' and payload->>'reserva_id'='%s';" % (ANA, rid))[0]["c"]
rec("FB2", "clienta notificada", int(ncli)>=1, f"n={ncli}")
# claim de nuevo (ya tomada) -> 0 filas
before = q("select updated_at from reservas where id='%s';" % rid)[0]["updated_at"]
q_as("authenticated", "update reservas set estado='aceptada', masajista_id='%s' where id='%s' and estado='pendiente' and masajista_id is null;" % (LAURA, rid), uid=LAURA)
still = q("select estado from reservas where id='%s';" % rid)[0]["estado"]
rec("FB2", "2o claim no cambia nada", still=="aceptada", "guard estado=pendiente AND masajista_id null")
# la masajista ve el contacto del cliente tras aceptar (embed profiles)
cont = q_as("authenticated", "select (select full_name from profiles where id=r.cliente_id) as n from reservas r where r.id='%s';" % rid, uid=LAURA)
rec("FB2", "masajista ve nombre cliente", bool(cont) and bool(cont[0].get("n")), f"nombre={cont[0].get('n') if cont else None}")

# ---------- FB6 · Completar -> valorar -> rating ----------
print("== FB6 · Completar + valorar + rating ==")
q_as("authenticated", "update reservas set estado='completada', completada_en=now() where id='%s';" % rid, uid=LAURA)
est = q("select estado from reservas where id='%s';" % rid)[0]["estado"]
rec("FB6", "marca completada", est=="completada", f"estado={est}")
# la clienta valora (5 estrellas)
q_as("authenticated",
     "insert into valoraciones (reserva_id, cliente_id, masajista_id, puntuacion, comentario) values ('%s','%s','%s',5,'Genial');" % (rid, ANA, LAURA),
     uid=ANA)
lr = q("select rating_promedio, total_sesiones from masajistas where id='%s';" % LAURA)[0]
rec("FB6", "rating recalcula (freeze B1 no bloquea)", float(lr["rating_promedio"])==5.0 and int(lr["total_sesiones"])>=1, f"rating={lr['rating_promedio']} ses={lr['total_sesiones']}")
limpia_reserva(rid)

# ---------- FB4 · Masajista rechaza / cancela ----------
print("== FB4 · Rechazo/cancelación ==")
r = nueva_pendiente("2026-09-11", "12:00"); rid = r["id"]
q_as("authenticated", "update reservas set estado='aceptada', masajista_id='%s', aceptada_en=now() where id='%s' and estado='pendiente' and masajista_id is null;" % (LAURA, rid), uid=LAURA)
# masajista cancela una aceptada
q_as("authenticated", "update reservas set estado='cancelada', cancelado_por='%s', cancelacion_motivo='no puedo' where id='%s';" % (LAURA, rid), uid=LAURA)
est = q("select estado from reservas where id='%s';" % rid)[0]["estado"]
rec("FB4", "cancelación aplica", est=="cancelada", f"estado={est}")
# notifica al CLIENTE (cancelado_por = masajista -> destinatario cliente)
ncan = q("select count(*) c from notificaciones where user_id='%s' and tipo='reserva_cancelada' and payload->>'reserva_id'='%s';" % (ANA, rid))[0]["c"]
rec("FB4", "clienta notificada de cancelación", int(ncan)>=1, f"n={ncan}")
limpia_reserva(rid)

# ---------- FB8 · Expiración automática ----------
print("== FB8 · Expiración (edge function) ==")
r = nueva_pendiente("2026-09-12", "13:00"); rid = r["id"]
# la función expira pendientes con created_at más viejo que el timeout (60 min) -> lo envejecemos
q("update reservas set created_at=now()-interval '2 hours' where id='%s';" % rid)
# además: un CONTACTO pendiente y viejo en el mismo lote (cliente_id NULL) para probar que
# no rompe las notificaciones del cliente registrado (bug arreglado).
cont = q("insert into contactos (nombre, telefono, origen) values ('Expira Test','+34655099099','test') returning id;")[0]["id"]
q("insert into reservas (contacto_id,servicio_id,fecha,hora_inicio,duracion_min,direccion_servicio,ciudad,estado,created_at) "
  "values ('%s','%s','2026-09-12','14:00',60,'Calle Test 9','Madrid','pendiente', now()-interval '2 hours');" % (cont, SRV_ID))
rid_cont = q("select id from reservas where contacto_id='%s' order by created_at desc limit 1;" % cont)[0]["id"]
req = urllib.request.Request(f"{BASE}/functions/v1/expire-reservas", data=b"{}", method="POST",
                             headers={"apikey": ANON, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as resp: body = resp.read().decode()
    est = q("select estado from reservas where id='%s';" % rid)[0]["estado"]
    est_c = q("select estado from reservas where id='%s';" % rid_cont)[0]["estado"]
    rec("FB8", "expira la pendiente vencida (registrada)", est=="expirada", f"estado={est} resp={body[:70]}")
    rec("FB8", "expira también la del contacto", est_c=="expirada", f"estado_contacto={est_c}")
    ncli = q("select count(*) c from notificaciones where user_id='%s' and payload->>'reserva_id'='%s';" % (ANA, rid))[0]["c"]
    rec("FB8", "notifica al cliente registrado (no rompe por el contacto)", int(ncli)>=1, f"n={ncli}")
except Exception as e:
    rec("FB8", "invocar función", False, str(e)[:120])
limpia_reserva(rid); limpia_reserva(rid_cont)
q("delete from contactos where id='%s';" % cont)

# ---------- restaurar estado base ----------
q("update masajistas set rating_promedio=%s, total_sesiones=%s where id='%s';" % (LAURA0["rating_promedio"], LAURA0["total_sesiones"], LAURA))
print("\nRESUMEN clásicos: %d/%d PASS" % (sum(1 for _,_,ok,_ in R if ok), len(R)))
fails = [(f,c,n) for f,c,ok,n in R if not ok]
if fails:
    print("FALLOS:")
    for f,c,n in fails: print("  -", f, c, "::", n)
print("reservas base:", [x['codigo'] for x in q('select codigo from reservas order by created_at;')])
print("laura rating restaurado:", q("select rating_promedio, total_sesiones from masajistas where id='%s';" % LAURA)[0])
