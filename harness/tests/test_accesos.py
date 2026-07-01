"""
Prueba backend de la feature de cuentas:
 - invite_masajista: crea el usuario invitado (rol masajista) + genera enlace + intenta email.
 - update_role (promoteToAdmin): promociona una cuenta existente a admin.
Limpia lo que crea.
"""
import json, urllib.request
from sbhelp import q, admin_jwt, BASE, ANON

def call(action, payload):
    jwt = admin_jwt()
    req = urllib.request.Request(f"{BASE}/functions/v1/admin-actions",
        data=json.dumps({"action": action, "payload": payload}).encode(),
        headers={"Authorization": f"Bearer {jwt}", "apikey": ANON, "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read().decode() or "null")

R=[]
def rec(name, ok, note=""): R.append(ok); print(f"  [{'PASS' if ok else 'FAIL'}] {name}: {note}")

INV_EMAIL = "invite.masajista.test@example.com"
# limpiar por si quedó de una corrida anterior
old = q("select id from profiles where email='%s';" % INV_EMAIL)
for o in old:
    call("delete_user", {"user_id": o["id"]})

print("== invite_masajista ==")
st, res = call("invite_masajista", {"email": INV_EMAIL, "full_name": "Masajista Invitada"})
rec("respuesta ok", st == 200 and res.get("success"), f"status={st} email_sent={res.get('email_sent')} err={res.get('email_error')}")
rec("devuelve action_link", bool(res.get("action_link")), f"link={(res.get('action_link') or '')[:60]}…")
# el trigger debe haber creado profiles(role=masajista) + masajistas
prof = q("select id, role from profiles where email='%s';" % INV_EMAIL)
rec("usuario creado con rol masajista", bool(prof) and prof[0]["role"] == "masajista", f"prof={prof}")
if prof:
    uid = prof[0]["id"]
    masj = q("select count(*) c from masajistas where id='%s';" % uid)[0]["c"]
    rec("fila en masajistas", int(masj) == 1, f"c={masj}")
    # ¿está sin confirmar (invitado, sin login aún)?
    conf = q("select (email_confirmed_at is null) as sin_confirmar from auth.users where id='%s';" % uid)
    rec("invitado sin confirmar todavía", bool(conf) and conf[0]["sin_confirmar"], f"{conf}")
    # limpiar
    call("delete_user", {"user_id": uid})
    q("delete from masajistas where id='%s';" % uid)
    print("  (usuario invitado limpiado)")

print("== update_role (promover a admin) ==")
# crear un cliente temporal, promoverlo, verificar, borrar
st, cu = call("create_user", {"email": "promote.test@example.com", "password": "Test1234", "full_name": "Promo Test", "role": "cliente"})
uid = cu.get("user_id")
rec("cliente temporal creado", bool(uid), f"uid={str(uid)[:8]}")
if uid:
    rol0 = q("select role from profiles where id='%s';" % uid)[0]["role"]
    st, pr = call("update_role", {"user_id": uid, "new_role": "admin"})
    rol1 = q("select role from profiles where id='%s';" % uid)[0]["role"]
    rec("promoción a admin", rol0 == "cliente" and rol1 == "admin", f"{rol0} -> {rol1}")
    # limpiar
    call("delete_user", {"user_id": uid})
    q("delete from clientes where id='%s';" % uid)
    print("  (cliente temporal limpiado)")

print(f"\nRESUMEN accesos: {sum(R)}/{len(R)} PASS")
print("profiles por rol:", q("select role, count(*) c from profiles group by role;"))
