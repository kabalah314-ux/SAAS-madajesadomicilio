"""
Helper compartido para los tests de la Guía Maestra de Testeo (harness/09).

- SQL vía Management API (ve todo, bypass RLS) para verificar/limpiar estado.
- Ejecutar SQL impersonando un rol con RLS (set local role authenticated + claims JWT)
  para comprobar "qué ve" cada sección (admin/masajista/clienta) de verdad.
- JWT de admin (password grant) para llamar a Edge Functions (agente, admin-actions).
- Llamar a la Edge Function `agente` (conversación multi-turno).

Uso: `from sbhelp import q, q_as, admin_jwt, agente, PROJECT, BASE`.
El token de Supabase se lee de C:\\Users\\oscar\\AppData\\Local\\massflow\\sb_token.txt
"""
import json, os, sys, urllib.request, urllib.error

PROJECT = "lzvbfmphtrhvrjjnvqtt"
BASE = f"https://{PROJECT}.supabase.co"
ANON = "sb_publishable_TAmhMRMcS57-X2pk9Te2Pg_PEljMC3n"
TOKEN_PATH = r"C:\Users\oscar\AppData\Local\massflow\sb_token.txt"
MGMT = f"https://api.supabase.com/v1/projects/{PROJECT}/database/query"

with open(TOKEN_PATH) as f:
    TOKEN = f.read().strip()


def _post(url, body, headers):
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode() or "null")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def q(sql, _tries=4):
    """SQL con la Management API (bypass RLS: ve TODO). Devuelve lista de filas.
    Reintenta ante errores transitores (503/timeout de Cloudflare/upstream)."""
    import time
    last = None
    for i in range(_tries):
        st, res = _post(MGMT, {"query": sql},
                        {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json",
                         "User-Agent": "massflow-tests/1.0"})
        if st in (200, 201):
            return res
        last = f"Management API {st}: {res}"
        if st in (502, 503, 504, 429) or "timeout" in str(res).lower():
            time.sleep(1.5 * (i + 1))
            continue
        break
    raise RuntimeError(last)


def q_as(role, sql, uid=None):
    """Ejecuta SQL como un rol autenticado RESPETANDO RLS (lo que ese usuario 've').
    role: 'authenticated' con claims. uid: auth.uid() a simular.
    Envuelve en una transacción con set local role + claims. Devuelve filas del último SELECT."""
    claims = {"role": "authenticated"}
    if uid:
        claims["sub"] = uid
    wrapped = (
        "begin;\n"
        f"select set_config('request.jwt.claims', '{json.dumps(claims)}', true);\n"
        "set local role authenticated;\n"
        f"{sql}\n"
        "commit;"
    )
    return q(wrapped)


def admin_jwt(email="admin@massflow.app", password="Test1234"):
    st, res = _post(f"{BASE}/auth/v1/token?grant_type=password",
                    {"email": email, "password": password},
                    {"apikey": ANON, "Content-Type": "application/json"})
    if isinstance(res, str) or "access_token" not in (res or {}):
        raise RuntimeError(f"login admin falló {st}: {res}")
    return res["access_token"]


def agente(mensaje, conversation_id=None, telefono="+34600000000", canal="test", jwt=None):
    """Manda un turno al agente real y devuelve {conversation_id, reply, ...}."""
    jwt = jwt or admin_jwt()
    st, res = _post(f"{BASE}/functions/v1/agente",
                    {"conversation_id": conversation_id, "canal": canal, "telefono": telefono, "mensaje": mensaje},
                    {"Authorization": f"Bearer {jwt}", "apikey": ANON, "Content-Type": "application/json"})
    if isinstance(res, str):
        raise RuntimeError(f"agente {st}: {res}")
    return res


if __name__ == "__main__":
    # Smoke test de conectividad + foto del estado.
    print("== Servicios activos ==")
    for r in q("select nombre, precio_eur, duracion_min, is_active from servicios order by orden;"):
        print(f"  {r['nombre']:<32} {r['precio_eur']}€  {r['duracion_min']}min  active={r['is_active']}")
    print("== Configuración ==")
    for r in q("select clave, valor from configuracion order by clave;"):
        print(f"  {r['clave']} = {r['valor']}")
    print("== Usuarios (profiles) ==")
    for r in q("select role, full_name, phone from profiles order by role;"):
        print(f"  {r['role']:<10} {r['full_name']}  tel={r['phone']}")
    print("== Masajistas ==")
    for r in q("select m.id, p.full_name, m.is_verified, m.is_active, m.is_suspended, m.especialidades, m.zonas_cobertura from masajistas m join profiles p on p.id=m.id;"):
        print(f"  {r['full_name']}  verif={r['is_verified']} active={r['is_active']} susp={r['is_suspended']} esp={r['especialidades']} zonas={r['zonas_cobertura']}")
    print("== Reservas ==")
    for r in q("select codigo, estado, masajista_id, cliente_id, contacto_id, servicio_id, fecha, hora_inicio, precio_total, pago_masajista from reservas order by created_at;"):
        print(f"  {r['codigo']} {r['estado']:<12} masj={str(r['masajista_id'])[:8]} cli={str(r['cliente_id'])[:8]} cont={str(r['contacto_id'])[:8]} {r['fecha']} {r['hora_inicio']} {r['precio_total']}€ pm={r['pago_masajista']}")
    print("OK conectividad.")
