/*
 * Antiviotic site Worker.
 * Static files are served by Cloudflare's asset layer first; only requests that match no file reach this code.
 *   POST /api/waitlist  { email }                 -> saves to KV as  waitlist:<email>
 *   POST /api/contact   { name, email, message }  -> saves to KV as  contact:<time>:<id>
 * See every entry in the Cloudflare dashboard: Storage & Databases > KV > antiviotic-website-waitlist.
 */
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const ORIGINS = ["https://antiviotic.com", "https://www.antiviotic.com"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function readBody(request) {
  if (Number(request.headers.get("content-length") || 0) > 8192) return null;
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) return await request.json();
    if (type.includes("form")) return Object.fromEntries(await request.formData());
  } catch {}
  return null;
}

// Up to 5 saves per connection per minute: enough for families or a mobile network sharing one IP, stops spam loops
async function tooFast(env, request, bucket) {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const key = `rate:${bucket}:${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = Number(await env.WAITLIST.get(key)) || 0;
  if (n >= 5) return true;
  await env.WAITLIST.put(key, String(n + 1), { expirationTtl: 120 });
  return false;
}

const meta = (request) => ({
  at: new Date().toISOString(),
  country: request.cf?.country || "",
  ua: (request.headers.get("user-agent") || "").slice(0, 200),
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).host !== url.host && !ORIGINS.includes(origin)) return json({ ok: false, error: "Forbidden" }, 403);
      if (!env.WAITLIST) return json({ ok: false, error: "Storage is not set up yet" }, 503);

      const body = await readBody(request);
      if (!body) return json({ ok: false, error: "Bad request" }, 400);
      if (body.company) return json({ ok: true }); // honeypot field: bots fill it, people never see it

      const email = String(body.email || "").trim().toLowerCase();
      if (!EMAIL.test(email)) return json({ ok: false, error: "Please enter a valid email address." }, 422);

      if (url.pathname === "/api/waitlist") {
        const key = `waitlist:${email}`;
        if (await env.WAITLIST.get(key)) return json({ ok: true, already: true });
        if (await tooFast(env, request, "w")) return json({ ok: false, error: "Please wait a moment and try again." }, 429);
        await env.WAITLIST.put(key, JSON.stringify({ email, ...meta(request) }), { metadata: { at: Date.now() } });
        return json({ ok: true });
      }

      if (url.pathname === "/api/contact") {
        const name = String(body.name || "").trim().slice(0, 120);
        const message = String(body.message || "").trim().slice(0, 4000);
        if (message.length < 5) return json({ ok: false, error: "Please write a short message." }, 422);
        if (await tooFast(env, request, "c")) return json({ ok: false, error: "Please wait a moment and try again." }, 429);
        const key = `contact:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`;
        await env.WAITLIST.put(key, JSON.stringify({ name, email, message, ...meta(request) }), { metadata: { email } });
        return json({ ok: true });
      }

      return json({ ok: false, error: "Not found" }, 404);
    }

    // Anything else that is not a file: the asset layer answers with 404.html (not_found_handling in wrangler.toml)
    return env.ASSETS.fetch(request);
  },
};
