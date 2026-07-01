// Edge Function: agente
// Agente conversacional de MassFlow. Recibe un turno de conversación, identifica
// al cliente por teléfono (cliente registrado / contacto interno / nuevo), habla
// con un LLM vía OpenRouter usando herramientas (info/huecos/reservar/consultar/
// recado), y GUARDA cada turno en agente_conversaciones/agente_mensajes.
//
// Canales: 'test' (panel admin) | 'whatsapp' | 'telefono'.
// Auth: header x-webhook-secret (webhooks) O JWT de admin (panel).
// Degradación: sin OPENROUTER_API_KEY responde un aviso y no rompe nada.
//
// Secrets: OPENROUTER_API_KEY, OPENROUTER_MODEL (opcional), AGENTE_WEBHOOK_SECRET,
//          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (inyectadas).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENROUTER_MODEL") ?? "openai/gpt-4o-mini";
const WEBHOOK_SECRET = Deno.env.get("AGENTE_WEBHOOK_SECRET") ?? "";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Eres el asistente telefónico de un negocio de masajes a domicilio (MassFlow), en España.
Hablas en español, con tono cercano, educado y BREVE (esto puede ser una llamada).
Puedes: dar información (servicios, precios, zonas, horarios), consultar huecos, CREAR una reserva,
consultar la próxima cita del cliente, tomar un recado o transferir a una persona.
Reglas:
- No inventes precios ni huecos: usa siempre las herramientas.
- Antes de reservar, confirma con el cliente el servicio, el día/hora y la dirección.
- Si el cliente es nuevo (no lo conoces), pide su nombre y, solo cuando haga falta para reservar,
  su dirección. Recoge los datos poco a poco, SIN AGOBIAR (no pidas todo de golpe).
- Usa 'guardar_datos_cliente' para ir guardando el nombre/dirección del cliente nuevo.
- Si no puedes resolver algo, ofrece tomar un recado o transferir.
- Cuando CREES una reserva, dile SIEMPRE al cliente el código de la reserva (el campo 'codigo'
  que devuelve la herramienta 'crear_reserva'), p.ej. "Tu reserva es la MF-001048", para que lo tenga de referencia.
- DATOS DE SALUD (lesiones, dolencias, condiciones médicas, embarazo, etc.) son datos sensibles.
  Si el cliente los menciona, NO reserves todavía: PRIMERO pídele su consentimiento explícito para
  anotarlo, con una pregunta clara del tipo "¿Me autorizas a anotar tu [dato de salud] en tu ficha
  para que la masajista lo tenga en cuenta?", y ESPERA su respuesta en el siguiente turno.
  NO incluyas ningún dato de salud en el campo 'notas' hasta que responda que SÍ. Si dice que no,
  reserva SIN esos datos. Nunca guardes un dato de salud en el mismo mensaje en que lo mencionan.
- Responde solo con lo necesario; nada de listas largas salvo que las pidan.`;

const TOOLS = [
  { type: "function", "function": { name: "info_negocio", description: "Info del negocio: servicios y precios, zonas de cobertura, horarios o política de cancelación.", parameters: { type: "object", properties: { tema: { type: "string", enum: ["servicios", "zonas", "horarios", "cancelacion"] } }, required: ["tema"] } } },
  { type: "function", "function": { name: "consultar_huecos", description: "Huecos disponibles para una fecha (YYYY-MM-DD).", parameters: { type: "object", properties: { fecha: { type: "string" } }, required: ["fecha"] } } },
  { type: "function", "function": { name: "guardar_datos_cliente", description: "Guarda/actualiza los datos del cliente nuevo (contacto interno). Llama a esto en cuanto sepas el nombre y luego la dirección.", parameters: { type: "object", properties: { nombre: { type: "string" }, direccion: { type: "string" }, barrio: { type: "string" }, ciudad: { type: "string" }, codigo_postal: { type: "string" } } } } },
  { type: "function", "function": { name: "crear_reserva", description: "Crea una reserva para el cliente/contacto de esta conversación.", parameters: { type: "object", properties: { servicio: { type: "string", description: "Nombre del servicio, p.ej. 'relajante'" }, fecha: { type: "string", description: "YYYY-MM-DD" }, hora: { type: "string", description: "HH:MM" }, direccion: { type: "string" }, barrio: { type: "string" }, ciudad: { type: "string" }, notas: { type: "string" } }, required: ["servicio", "fecha", "hora"] } } },
  { type: "function", "function": { name: "consultar_mi_reserva", description: "Devuelve la próxima reserva del cliente/contacto de esta conversación.", parameters: { type: "object", properties: {} } } },
  { type: "function", "function": { name: "tomar_recado", description: "Guarda un recado para el equipo (crea aviso al admin).", parameters: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] } } },
  { type: "function", "function": { name: "transferir", description: "Indica que hay que transferir la llamada a una persona.", parameters: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] } } },
];

// -------- Herramientas (ejecución real contra Supabase) --------
async function runTool(name: string, args: any, conv: any): Promise<any> {
  if (name === "info_negocio") {
    if (args.tema === "servicios") {
      const { data } = await sb.from("servicios").select("nombre, precio_eur, duracion_min").eq("is_active", true).order("precio_eur");
      return { servicios: (data ?? []).map((s: any) => ({ nombre: s.nombre, precio: Number(s.precio_eur), minutos: s.duracion_min })) };
    }
    const { data } = await sb.from("configuracion").select("clave, valor");
    const cfg: Record<string, any> = {}; for (const r of data ?? []) cfg[r.clave] = r.valor;
    if (args.tema === "cancelacion") return { cancelacion_horas: cfg["cancelacion_horas"] ?? 24 };
    if (args.tema === "horarios") return { horario: "Sesiones de 10:00 a 20:00, todos los días." };
    return { zonas: "Servicio a domicilio en la ciudad y alrededores. Indícame tu barrio y lo confirmo." };
  }

  if (name === "consultar_huecos") {
    // A1: huecos reales — franja estándar 10-20 cruzada con la ocupación real. Un hueco está
    // libre si AL MENOS UNA masajista verificada/activa no tiene reserva activa que solape.
    const horas = ["10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00"];
    const { data: masajistas } = await sb.from("masajistas").select("id").eq("is_verified", true).eq("is_suspended", false);
    const activas = (masajistas ?? []).map((m: any) => m.id);
    if (!activas.length) return { fecha: args.fecha, huecos: horas };
    const { data: ocupadas } = await sb.from("reservas")
      .select("masajista_id, hora_inicio, duracion_min")
      .eq("fecha", args.fecha).in("estado", ["aceptada", "completada"]).not("masajista_id", "is", null);
    const ocup = ocupadas ?? [];
    const toMin = (hhmm: string) => { const p = String(hhmm).slice(0, 5).split(":"); return (+p[0]) * 60 + (+p[1]); };
    const libre = horas.filter((h) => {
      const ini = toMin(h), fin = ini + 60; // asumimos 60 min si no se sabe el servicio aquí
      return activas.some((mid: string) =>
        !ocup.some((r: any) => r.masajista_id === mid && ini < (toMin(r.hora_inicio) + (r.duracion_min ?? 60)) && toMin(r.hora_inicio) < fin));
    });
    return { fecha: args.fecha, huecos: libre };
  }

  if (name === "guardar_datos_cliente") {
    if (conv.cliente_id) return { ok: true, nota: "Cliente registrado; no se modifican sus datos." };
    const payload: any = { origen: conv.canal, telefono: conv.telefono };
    for (const k of ["nombre", "direccion", "barrio", "ciudad", "codigo_postal"]) if (args[k]) payload[k] = args[k];
    let contactoId = conv.contacto_id;
    if (contactoId) {
      await sb.from("contactos").update(payload).eq("id", contactoId);
    } else {
      if (!payload.nombre) payload.nombre = "Cliente";
      const { data, error } = await sb.from("contactos").insert(payload).select("id").single();
      if (error) return { error: error.message };
      contactoId = data.id;
      await sb.from("agente_conversaciones").update({ contacto_id: contactoId }).eq("id", conv.id);
      conv.contacto_id = contactoId;
    }
    return { ok: true, contacto_id: contactoId };
  }

  if (name === "crear_reserva") {
    const { data: srv } = await sb.from("servicios").select("id, nombre, duracion_min, precio_eur").ilike("nombre", `%${args.servicio}%`).eq("is_active", true).limit(1).maybeSingle();
    if (!srv) return { error: `No encuentro el servicio "${args.servicio}".` };
    // Identidad: cliente registrado o contacto. Si no hay ninguno, crear contacto mínimo.
    let cliente_id = conv.cliente_id ?? null;
    let contacto_id = conv.contacto_id ?? null;
    if (!cliente_id && !contacto_id) {
      const { data, error } = await sb.from("contactos").insert({ nombre: "Cliente", telefono: conv.telefono, origen: conv.canal, direccion: args.direccion, barrio: args.barrio, ciudad: args.ciudad }).select("id").single();
      if (error) return { error: error.message };
      contacto_id = data.id;
      await sb.from("agente_conversaciones").update({ contacto_id }).eq("id", conv.id);
      conv.contacto_id = contacto_id;
    }
    const ins: any = {
      cliente_id, contacto_id, servicio_id: srv.id, fecha: args.fecha, hora_inicio: args.hora,
      duracion_min: srv.duracion_min, direccion_servicio: args.direccion ?? "", ciudad: args.ciudad ?? "Madrid",
      barrio: args.barrio ?? null, notas_cliente: args.notas ?? null,
      precio_total: srv.precio_eur, comision_pct: 25, comision_monto: 0, pago_masajista: 0, estado: "pendiente",
    };
    const { data: r, error } = await sb.from("reservas").insert(ins).select("codigo, precio_total").single();
    if (error) return { error: error.message };
    await sb.from("agente_conversaciones").update({ reserva_id: (await sb.from("reservas").select("id").eq("codigo", r.codigo).single()).data?.id, resultado: "reserva" }).eq("id", conv.id);
    return { ok: true, codigo: r.codigo, precio: Number(r.precio_total), servicio: srv.nombre, fecha: args.fecha, hora: args.hora };
  }

  if (name === "consultar_mi_reserva") {
    let query = sb.from("reservas").select("codigo, fecha, hora_inicio, estado, servicios(nombre)").order("fecha", { ascending: true }).gte("fecha", new Date().toISOString().slice(0, 10));
    if (conv.cliente_id) query = query.eq("cliente_id", conv.cliente_id);
    else if (conv.contacto_id) query = query.eq("contacto_id", conv.contacto_id);
    else return { reservas: [] };
    const { data } = await query.limit(3);
    return { reservas: (data ?? []).map((r: any) => ({ codigo: r.codigo, fecha: r.fecha, hora: r.hora_inicio, estado: r.estado, servicio: r.servicios?.nombre })) };
  }

  if (name === "tomar_recado") {
    const { data: admins } = await sb.from("profiles").select("id").eq("role", "admin");
    for (const a of admins ?? []) {
      await sb.from("notificaciones").insert({ user_id: a.id, tipo: "sistema", titulo: "Recado del agente", mensaje: `${args.motivo} (tel: ${conv.telefono ?? "?"})`, payload: { conversacion_id: conv.id } });
    }
    await sb.from("agente_conversaciones").update({ resultado: "recado" }).eq("id", conv.id);
    return { ok: true };
  }

  if (name === "transferir") {
    await sb.from("agente_conversaciones").update({ resultado: "transferida" }).eq("id", conv.id);
    return { ok: true, nota: "Se transferirá a una persona del equipo." };
  }
  return { error: "herramienta desconocida" };
}

async function log(convId: string, rol: string, contenido: string, metadata: any = {}) {
  await sb.from("agente_mensajes").insert({ conversacion_id: convId, rol, contenido, metadata });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // --- Auth: webhook secret O admin JWT O clienta autenticada (canal 'app', su propia cuenta) ---
  let authorized = false;
  let authCliente: { id: string } | null = null; // identidad de CONFIANZA (del JWT), nunca del body
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") === WEBHOOK_SECRET) authorized = true;
  else {
    const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
    if (bearer) {
      const { data: { user } } = await sb.auth.getUser(bearer);
      if (user) {
        const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single();
        if (p?.role === "admin") authorized = true;
        else if (p?.role === "cliente") { authorized = true; authCliente = { id: user.id }; }
      }
    }
  }
  if (!authorized) return json({ error: "no autorizado" }, 401);

  const body = await req.json().catch(() => ({}));
  let { conversation_id, canal = "test", telefono: telefonoRaw = null } = body;
  const { mensaje = "" } = body;
  // Clienta autenticada: canal fijo 'app' y el teléfono del body se IGNORA por completo —
  // la identidad viene SIEMPRE del JWT verificado, nunca de datos que mande quien llama
  // (si no, una clienta podría intentar hacerse pasar por otra).
  if (authCliente) { canal = "app"; telefonoRaw = null; }
  // A2: normalizar el teléfono (caller ID) para una identidad estable — sin espacios,
  // guiones, paréntesis ni puntos. Evita contactos duplicados por variaciones de formato.
  const telefono = telefonoRaw ? String(telefonoRaw).replace(/[\s\-().]/g, "") : null;

  if (!OPENROUTER_API_KEY) return json({ error: "El agente no está configurado (falta OPENROUTER_API_KEY)." }, 200);

  // --- Cargar o crear conversación (con identidad por teléfono, o por sesión si es clienta) ---
  let conv: any;
  if (conversation_id) {
    const { data } = await sb.from("agente_conversaciones").select("*").eq("id", conversation_id).single();
    conv = data;
    // Anti-IDOR: si es una clienta autenticada, la conversación cargada TIENE que ser suya.
    // Si no (ajena, inventada, o de un contacto), se descarta y se abre una nueva — nunca se
    // continúa/lee una conversación de otra persona.
    if (authCliente && conv?.cliente_id !== authCliente.id) conv = null;
  }
  if (!conv) {
    let cliente_id: string | null = null, contacto_id: string | null = null, nombreConocido: string | null = null;
    if (authCliente) {
      // Identidad de CONFIANZA: la clienta ya está autenticada, no hace falta (ni se admite)
      // identificarla por teléfono.
      cliente_id = authCliente.id;
      const { data: prof } = await sb.from("profiles").select("full_name").eq("id", authCliente.id).maybeSingle();
      nombreConocido = prof?.full_name ?? null;
    } else if (telefono) {
      const { data: prof } = await sb.from("profiles").select("id, full_name, role").eq("phone", telefono).eq("role", "cliente").maybeSingle();
      if (prof) { cliente_id = prof.id; nombreConocido = prof.full_name; }
      else {
        const { data: cont } = await sb.from("contactos").select("id, nombre").eq("telefono", telefono).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (cont) { contacto_id = cont.id; nombreConocido = cont.nombre; }
      }
    }
    const { data } = await sb.from("agente_conversaciones").insert({ canal, telefono, cliente_id, contacto_id, llm_messages: [] }).select("*").single();
    conv = data;
    conv._nombreConocido = nombreConocido;
  }

  // --- Construir contexto para el LLM ---
  const messages: any[] = Array.isArray(conv.llm_messages) && conv.llm_messages.length
    ? conv.llm_messages
    : [{ role: "system", content: SYSTEM + (conv._nombreConocido ? `\nEl cliente que llama es ${conv._nombreConocido} (ya registrado, salúdalo por su nombre).` : "\nEl número no está en la base de datos: es un cliente nuevo.") }];
  messages.push({ role: "user", content: mensaje });
  await log(conv.id, "cliente", mensaje);

  // --- Bucle de herramientas ---
  let reply = "";
  for (let i = 0; i < 6; i++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://saas-madajesadomicilio.vercel.app", "X-Title": "MassFlow Agente" },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.4 }),
    });
    if (!res.ok) { const t = await res.text(); await log(conv.id, "sistema", "error LLM", { error: t.slice(0, 300) }); return json({ error: "Error del modelo: " + t.slice(0, 200) }, 200); }
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) break;
    messages.push(msg);
    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = await runTool(tc.function.name, args, conv);
        await log(conv.id, "sistema", `herramienta: ${tc.function.name}`, { args, result });
        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue; // volver a pedir al modelo con los resultados
    }
    reply = msg.content ?? "";
    break;
  }

  await log(conv.id, "agente", reply);
  await sb.from("agente_conversaciones").update({ llm_messages: messages, resumen: reply.slice(0, 140) }).eq("id", conv.id);

  return json({ conversation_id: conv.id, reply, cliente_id: conv.cliente_id, contacto_id: conv.contacto_id });
});
