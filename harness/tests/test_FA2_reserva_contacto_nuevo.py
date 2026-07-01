"""
FA2 · Reserva de CONTACTO NUEVO por el agente (el ejemplo del usuario).
DETECCIÓN: recorre el hilo completo cruzando las 3 secciones y verifica cada
casilla de la matriz de impacto (harness/09 · FA2). NO arregla nada; solo reporta.
Limpia todo lo que crea.
"""
import sys
from sbhelp import q, q_as, agente

PHONE = "+34655111222"      # número desconocido (contacto nuevo)
NOMBRE = "Test FA2"
FECHA = "2026-07-20"
HORA = "18:00"
BARRIO = "Salamanca"        # encaja con las zonas de Laura

checks = []
def chk(cell, ok, note=""):
    checks.append((cell, ok, note))
    print(f"  [{'PASS' if ok else 'FAIL'}] {cell}: {note}")

def cleanup(conv_id=None, reserva_id=None, contacto_id=None):
    if reserva_id:
        q(f"delete from notificaciones where payload->>'reserva_id' = '{reserva_id}';")
        q(f"delete from reservas where id = '{reserva_id}';")
    if conv_id:
        q(f"delete from agente_mensajes where conversacion_id = '{conv_id}';")
        q(f"delete from agente_conversaciones where id = '{conv_id}';")
    if contacto_id:
        q(f"delete from contactos where id = '{contacto_id}';")

def main():
    # ids de referencia
    admin_id = q("select id from profiles where role='admin' limit 1;")[0]["id"]
    laura_id = q("select id from masajistas limit 1;")[0]["id"]

    # --- Recorrer el hilo (conversación) ---
    print("== Conversación con el agente ==")
    r = agente("Hola, quería un masaje relajante. ¿Cuánto cuesta?", telefono=PHONE)
    conv_id = r["conversation_id"]
    print("  cliente> precio relajante\n  agente>", r["reply"][:200])
    reply1 = r["reply"]

    r = agente(f"Perfecto. Quiero reservarlo para el {FECHA} a las {HORA}. Me llamo {NOMBRE}, "
               f"la dirección es Calle Prueba 10, barrio {BARRIO}.", conversation_id=conv_id, telefono=PHONE)
    print("  cliente> reservar + datos\n  agente>", r["reply"][:200])

    # empujar la confirmación si aún no reservó
    row = q(f"select reserva_id from agente_conversaciones where id='{conv_id}';")[0]
    if not row["reserva_id"]:
        r = agente("Sí, confirmo la reserva.", conversation_id=conv_id, telefono=PHONE)
        print("  cliente> confirmo\n  agente>", r["reply"][:200])
    reply_final = r["reply"]

    conv = q(f"select * from agente_conversaciones where id='{conv_id}';")[0]
    reserva_id = conv["reserva_id"]
    contacto_id = conv["contacto_id"]

    # herramientas usadas
    tools = [m["metadata"].get("herramienta") if isinstance(m["metadata"], dict) else None
             for m in q(f"select metadata from agente_mensajes where conversacion_id='{conv_id}' and rol='sistema';")]
    tools = [m["contenido"].replace("herramienta: ", "") for m in
             q(f"select contenido from agente_mensajes where conversacion_id='{conv_id}' and rol='sistema' and contenido like 'herramienta:%';")]
    print("  herramientas usadas:", tools)

    print("== Verificación de la matriz de impacto ==")
    # E1 · precio real sin inventar
    chk("E1 precio real", "55" in reply1 or "info_negocio" in tools, f"reply1 menciona precio / usó info_negocio ({'info_negocio' in tools})")
    # E2 · pidió datos / confirmó (usó guardar_datos_cliente)
    chk("E2 datos+confirmar", "guardar_datos_cliente" in tools or bool(contacto_id), "recogió datos del cliente nuevo")

    if not reserva_id:
        chk("S2 reserva creada", False, "el agente NO llegó a crear la reserva")
        print("\nRESUMEN:", sum(1 for _,ok,_ in checks if ok), "/", len(checks), "PASS")
        cleanup(conv_id, reserva_id, contacto_id)
        return

    res = q(f"select r.*, s.nombre as servicio from reservas r join servicios s on s.id=r.servicio_id where r.id='{reserva_id}';")[0]

    # S1 · contacto creado
    cont = q(f"select * from contactos where id='{contacto_id}';") if contacto_id else []
    chk("S1 contacto", bool(cont) and bool(cont[0]["nombre"]), f"contacto={cont[0]['nombre'] if cont else None} tel={cont[0]['telefono'] if cont else None}")
    # S2 · reserva con contacto y servicio correcto
    chk("S2 reserva", res["contacto_id"] == contacto_id and res["cliente_id"] is None and "Relajante" in res["servicio"],
        f"servicio={res['servicio']} contacto_id set, cliente_id={res['cliente_id']}")
    # S3 · importes desde BD
    chk("S3 importes", float(res["precio_total"]) == 55.0 and float(res["comision_monto"]) == 13.75 and float(res["pago_masajista"]) == 41.25,
        f"tot={res['precio_total']} com={res['comision_monto']} pm={res['pago_masajista']}")
    # S4 · pendiente + sin asignar
    chk("S4 pendiente/sin asignar", res["estado"] == "pendiente" and res["masajista_id"] is None,
        f"estado={res['estado']} masajista_id={res['masajista_id']}")
    # S5 · notificación al ADMIN
    n_admin = q(f"select count(*) c from notificaciones where user_id='{admin_id}' and payload->>'reserva_id'='{reserva_id}';")[0]["c"]
    chk("S5 notif admin", int(n_admin) > 0, f"notificaciones admin para esta reserva = {n_admin}")
    # S6 · notificación a masajistas verificadas
    n_masj = q(f"select count(*) c from notificaciones where user_id='{laura_id}' and payload->>'reserva_id'='{reserva_id}';")[0]["c"]
    chk("S6 notif masajista", int(n_masj) > 0, f"notificaciones Laura para esta reserva = {n_masj}")
    # S7 · conversación guardada
    chk("S7 conv guardada", conv["resultado"] == "reserva" and conv["reserva_id"] == reserva_id and "crear_reserva" in tools,
        f"resultado={conv['resultado']} reserva_id set, crear_reserva usado")
    # M1 · la masajista la ve como solicitud abierta (RLS)
    visM = q_as("authenticated", f"select id from reservas where id='{reserva_id}';", uid=laura_id)
    chk("M1 masajista ve solicitud", len(visM) > 0, f"Laura (RLS) ve la reserva abierta: {len(visM)>0}")
    # A1 · el admin la ve (RLS)
    visA = q_as("authenticated", f"select id from reservas where id='{reserva_id}';", uid=admin_id)
    chk("A1 admin ve reserva", len(visA) > 0, f"Admin (RLS) ve la reserva: {len(visA)>0}")
    # C1 · código real COMUNICADO al cliente (estricto: debe aparecer en la respuesta)
    chk("C1 código al cliente", bool(res["codigo"]) and (res["codigo"] in (reply_final or "")),
        f"codigo={res['codigo']} (en respuesta del agente: {res['codigo'] in (reply_final or '')})")

    print("\nRESUMEN:", sum(1 for _,ok,_ in checks if ok), "/", len(checks), "PASS")
    fails = [(c, n) for c, ok, n in checks if not ok]
    if fails:
        print("FALLOS:")
        for c, n in fails:
            print("  -", c, "::", n)

    cleanup(conv_id, reserva_id, contacto_id)
    print("(limpieza hecha)")

if __name__ == "__main__":
    main()
