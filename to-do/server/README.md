# to:do token proxy (free Cloudflare Worker)

This small worker keeps your Google **OAuth client secret** off your phone/browser.
It exchanges the one-time authorization code and refreshes access tokens. The app
stores the resulting access/refresh tokens locally, so it can keep syncing without
a reconnect click.

```
to:do  ── code / refresh token ──>  worker  ── client secret ──>  Google token endpoint
  ^                                    |
  └──────── access / refresh ──────────┘
```

Cloudflare Workers free plan: no card, 100,000 requests/day. This worker uses one
request per hourly refresh, so it is effectively free forever.

## 1. Get the Google client ID and secret

Use the same OAuth **Web application** client whose ID is in to:do:

1. Open [Google Cloud credentials](https://console.cloud.google.com/apis/credentials).
2. Under **OAuth 2.0 Client IDs**, open the client matching the ID in to:do
   (the default ends in `...sct2.apps.googleusercontent.com`).
3. Copy the **Client ID** and **Client secret**.
4. If the client's consent screen is in **Testing**, publish it or refresh tokens
   will expire after 7 days: **OAuth consent screen → Publish app**.

If you do not own that client, create a new **Web application** client, add
`https://mumbo235.github.io` under **Authorized JavaScript origins**, and use the
new client ID and secret in both the worker and to:do.

## 2. Deploy the worker

### Option A — Cloudflare dashboard (no tools)

1. Sign in or create a free account at [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create → Worker**.
3. Name it `todo-token`, then **Deploy**.
4. Click **Edit code**, replace the default code with `worker.mjs`, then **Deploy**.
5. Open **Settings → Variables and Secrets** and add:
   - `GOOGLE_CLIENT_ID` — your OAuth client ID (encrypt it)
   - `GOOGLE_CLIENT_SECRET` — your OAuth client secret (encrypt it)
   - `ALLOWED_ORIGIN` — `https://mumbo235.github.io` (plain text)
6. Copy the worker URL, e.g. `https://todo-token.your-name.workers.dev`.
7. Open `https://todo-token.your-name.workers.dev/health`; it should return
   `{"ok":true,"service":"todo-token"}`.

If you also test on localhost, use:
`ALLOWED_ORIGIN=https://mumbo235.github.io,http://localhost:8123`

### Option B — Wrangler CLI

```bash
cd server
npx wrangler login
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler deploy
```

`ALLOWED_ORIGIN` is already set in `wrangler.toml`. Edit it there if you use a
custom domain.

## 3. Connect to:do to the worker

1. Open to:do → menu → **sync** → **stay connected automatically**.
2. In **advanced → token proxy url**, paste the worker URL.
3. Leave the **google oauth client secret** field empty; the worker holds it.
4. Tap **enable automatic reconnect**, choose the Google account, and approve
   offline access once.
5. The sync status should show **connected · auto-renew**. From then on the app
   silently refreshes tokens when they expire.

The app's Google client ID must match `GOOGLE_CLIENT_ID` in the worker. If they
differ, the worker returns `client_id_mismatch`.

## Security notes

- The worker URL is public. Treat it like a private endpoint and do not publish it
  in the repo. It only exchanges valid Google codes/refresh tokens for this client.
- `GOOGLE_CLIENT_SECRET` lives only in Cloudflare's encrypted secrets, never in
  the browser or the repo.
- This version still stores the refresh token in the browser's localStorage. If
  you want that server-side too, use Cloudflare KV and an HttpOnly session cookie.
- Revoke access any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
  or with to:do → menu → sync → disconnect.
