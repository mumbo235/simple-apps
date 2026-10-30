import worker from './worker.mjs';

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' ' + extra : '')); }
};
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);

const env = {
  ALLOWED_ORIGIN: 'https://mumbo235.github.io',
  GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'client-secret'
};
const ORIGIN = 'https://mumbo235.github.io';
const fake = (method, path, body = {}, origin = ORIGIN) => ({
  method,
  url: 'https://proxy.example' + path,
  headers: { get: k => k.toLowerCase() === 'origin' ? origin : null },
  json: async () => body
});

let googleCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  googleCalls.push({ url: String(url), body: String(opts.body || '') });
  return new Response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
};

const run = async () => {
  let res = await worker.fetch(fake('OPTIONS', '/exchange'), env);
  eq(res.status, 204, 'preflight accepted');
  eq(res.headers.get('access-control-allow-origin'), ORIGIN, 'preflight allows the app origin');
  ok(/Content-Type/i.test(res.headers.get('access-control-allow-headers')), 'preflight allows json');

  res = await worker.fetch(fake('GET', '/health'), env);
  eq(res.status, 200, 'health answers a browser get');
  eq(await res.json(), { ok: true, service: 'todo-token' }, 'health body');

  res = await worker.fetch(fake('GET', '/exchange'), env);
  eq(res.status, 405, 'only post is accepted for tokens');

  res = await worker.fetch(fake('POST', '/exchange', { code: 'abc', client_id: env.GOOGLE_CLIENT_ID }), env);
  eq(res.status, 200, 'code exchange succeeds');
  const exchanged = await res.json();
  eq(exchanged.access_token, 'access', 'access token passed through');
  eq(exchanged.refresh_token, 'refresh', 'refresh token passed through');
  const exchangeParams = new URLSearchParams(googleCalls[0].body);
  eq(exchangeParams.get('grant_type'), 'authorization_code', 'exchange uses the code grant');
  eq(exchangeParams.get('client_secret'), env.GOOGLE_CLIENT_SECRET, 'exchange sends the server secret');
  eq(exchangeParams.get('redirect_uri'), 'postmessage', 'exchange uses the popup redirect');

  googleCalls = [];
  res = await worker.fetch(fake('POST', '/refresh', { refresh_token: 'r1', client_id: env.GOOGLE_CLIENT_ID }), env);
  eq(res.status, 200, 'refresh succeeds');
  const refreshParams = new URLSearchParams(googleCalls[0].body);
  eq(refreshParams.get('grant_type'), 'refresh_token', 'refresh uses the refresh grant');
  eq(refreshParams.get('refresh_token'), 'r1', 'refresh forwards the token');
  eq(refreshParams.get('client_secret'), env.GOOGLE_CLIENT_SECRET, 'refresh sends the server secret');

  res = await worker.fetch(fake('POST', '/exchange', { code: 'abc', client_id: 'other.apps.googleusercontent.com' }), env);
  eq(res.status, 400, 'client id mismatch rejected');
  eq((await res.json()).error, 'client_id_mismatch', 'mismatch error is clear');

  res = await worker.fetch(fake('POST', '/exchange', { code: 'abc' }, 'https://evil.example'), env);
  eq(res.status, 403, 'unlisted origin rejected');

  res = await worker.fetch(fake('POST', '/exchange', {}), env);
  eq(res.status, 400, 'missing code rejected');

  globalThis.fetch = realFetch;
  console.log(`RESULT pass=${pass} fail=${fail}`);
  if (fail) process.exit(1);
};

run().catch(e => {
  globalThis.fetch = realFetch;
  console.error(e);
  process.exit(1);
});
