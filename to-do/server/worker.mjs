// to:do token proxy — a free Cloudflare Worker.
// It holds your Google OAuth client secret and exchanges codes/refresh tokens.
// Never commit GOOGLE_CLIENT_SECRET; set it as a Worker secret.

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || 'https://mumbo235.github.io')
      .split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || '');
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (origin && !allowed.includes(origin)) return send({ error: 'origin_not_allowed' }, 403, headers);

    const action = (new URL(request.url).pathname.split('/').filter(Boolean).pop() || '');
    if (action === 'health') return send({ ok: true, service: 'todo-token' }, 200, headers);
    if (request.method !== 'POST') return send({ error: 'method_not_allowed' }, 405, headers);

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return send({ error: 'server_not_configured', error_description: 'set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET' }, 500, headers);
    }

    let body = {};
    try { body = await request.json(); } catch {}
    if (body.client_id && body.client_id !== env.GOOGLE_CLIENT_ID) {
      return send({ error: 'client_id_mismatch', error_description: 'the app and token proxy use different google client ids' }, 400, headers);
    }

    let params;
    if (action === 'exchange') {
      if (!body.code) return send({ error: 'missing_code' }, 400, headers);
      params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code: String(body.code),
        grant_type: 'authorization_code',
        redirect_uri: String(body.redirect_uri || 'postmessage')
      });
    } else if (action === 'refresh') {
      if (!body.refresh_token) return send({ error: 'missing_refresh_token' }, 400, headers);
      params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: String(body.refresh_token)
      });
    } else {
      return send({ error: 'not_found' }, 404, headers);
    }

    let google;
    try {
      google = await fetch(GOOGLE_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });
    } catch {
      return send({ error: 'google_unreachable' }, 502, headers);
    }
    const text = await google.text();
    return new Response(text, { status: google.status, headers });
  }
};

function send(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}
