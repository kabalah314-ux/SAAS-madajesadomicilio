// CORS compartido por las Edge Functions que llama el navegador directamente
// (admin-actions, agente, create-checkout). Antes devolvían "*" a cualquier
// origen; esto restringe a los dominios reales de la app.
const ALLOWED_ORIGINS = [
  "https://saas-madajesadomicilio.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:5199",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    // Cualquier puerto de desarrollo local (seguro: el navegador de una víctima
    // nunca envía origin localhost; solo ocurre en la máquina del desarrollador).
    if (host === "localhost" || host === "127.0.0.1") return true;
    // Vercel Preview Deployments de este proyecto: https://saas-madajesadomicilio-<hash>.vercel.app
    return host.endsWith(".vercel.app") && host.startsWith("saas-madajesadomicilio");
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request, extraAllowHeaders?: string): HeadersInit {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": extraAllowHeaders ?? "authorization, content-type",
    "Vary": "Origin",
  };
}
