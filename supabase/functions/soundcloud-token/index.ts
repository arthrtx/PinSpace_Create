// Supabase Edge Function: troca o "code" do SoundCloud por tokens.
// O client_secret fica aqui (variável de ambiente), nunca no browser.
//
// Publicar:
//   supabase secrets set SOUNDCLOUD_CLIENT_ID=... SOUNDCLOUD_CLIENT_SECRET=...
//   supabase functions deploy soundcloud-token --no-verify-jwt
//
// Pedido (POST JSON):
//   { grant_type: "authorization_code", code, code_verifier, redirect_uri }
//   { grant_type: "refresh_token", refresh_token }

// Só o site do PinSpace pode usar esta função (antes era "*": qualquer site podia).
// Para juntar outro domínio: supabase secrets set ALLOWED_ORIGINS="https://a.com,https://b.com"
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://glittery-gaufre-d6756f.netlify.app,http://localhost:8080,http://127.0.0.1:8080")
  .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);

const corsFor = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

// O redirect tem de voltar para um dos nossos domínios.
const redirectAllowed = (uri: string) => {
  try { return ALLOWED_ORIGINS.includes(new URL(uri).origin); } catch { return false; }
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const CORS = corsFor(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: "origin_not_allowed" }, 403);
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const clientId = Deno.env.get("SOUNDCLOUD_CLIENT_ID");
  const clientSecret = Deno.env.get("SOUNDCLOUD_CLIENT_SECRET");
  if (!clientId || !clientSecret) return json({ error: "server_not_configured" }, 500);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "invalid_json" }, 400);
  for (const k of ["code", "code_verifier", "redirect_uri", "refresh_token"]) {
    if (body[k] != null && (typeof body[k] !== "string" || body[k].length > 2048)) return json({ error: "invalid_params" }, 400);
  }

  const form = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  if (body.grant_type === "authorization_code") {
    if (!body.code || !body.code_verifier || !body.redirect_uri) return json({ error: "missing_params" }, 400);
    if (!redirectAllowed(body.redirect_uri)) return json({ error: "redirect_not_allowed" }, 400);
    form.set("grant_type", "authorization_code");
    form.set("code", body.code);
    form.set("code_verifier", body.code_verifier);
    form.set("redirect_uri", body.redirect_uri);
  } else if (body.grant_type === "refresh_token") {
    if (!body.refresh_token) return json({ error: "missing_params" }, 400);
    form.set("grant_type", "refresh_token");
    form.set("refresh_token", body.refresh_token);
  } else {
    return json({ error: "unsupported_grant_type" }, 400);
  }

  const res = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json; charset=utf-8" },
    body: form,
  });
  const data = await res.json().catch(() => ({ error: "bad_response" }));
  // Só devolvemos o necessário ao browser.
  if (!res.ok) return json({ error: data.error || "token_error", error_description: data.error_description }, res.status);
  return json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    scope: data.scope,
  });
});
