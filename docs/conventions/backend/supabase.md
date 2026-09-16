# Oryx demo Supabase

Canonical how-to for the **Oryx-only** self-hosted Supabase. Deploy layout and DNS: [docs/deploy/dokploy.md](../../deploy/dokploy.md). Thanks screen: [docs/features/pulse-thanks.md](../../features/pulse-thanks.md).

## Which instance

Use **this project's** Dokploy compose. Do **not** read or write Capacity (`supabase.capacity.indenbom.ru`) or YNAPB (`supabase.ynapb.indenbom.ru` / `supabase.indenbom.ru`).

| Item | Value |
|------|--------|
| Dokploy project | **Oryx** → environment **production** |
| Compose name | `supabase` |
| Docker project | `oryx-supabase-bb1dnn` |
| Public Kong URL (works now) | `https://oryx-supabase-8de6bd-72-56-83-48.sslip.io` |
| Pretty host (needs Cloudflare A → `72.56.83.48`) | `https://supabase.oryx.indenbom.ru` |

Kong is the only public entry (`/rest/v1`, `/auth/v1`, Studio). Isolated deployment — containers do not share the Capacity/YNAPB stack.

## Auth model (demo)

- **No user login.** The browser uses the **anon** JWT from `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Demo tables enable RLS and allow `anon` + `authenticated` `SELECT/INSERT/UPDATE/DELETE` (`USING (true) WITH CHECK (true)`).
- PostgREST still requires the `apikey` header (anon key). A request with no key gets `401` from Kong. That is expected.
- Do not persist Auth sessions in the client (`persistSession: false` in `src/lib/supabase/client.ts`).
- **Anon key is publishable** (it is in the client bundle). **Service role, JWT secret, Postgres password, Studio password** stay in Dokploy → compose `supabase` → **Environment**. Never commit them or paste them in chat.

## Frontend

Env (copy from `.env.example` into `.env.local`; restart `npm run dev`):

```
NEXT_PUBLIC_SUPABASE_URL=https://oryx-supabase-8de6bd-72-56-83-48.sslip.io
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon JWT from Dokploy supabase Environment>
```

`NEXT_PUBLIC_*` are inlined at **build** time. After changing them on `oryx-demo`, rebuild that compose.

| File | Role |
|------|------|
| `src/lib/supabase/client.ts` | Browser client; `null` if env is missing |
| Feature `*-api.ts` (e.g. `src/features/pulse/thanks/thanks-api.ts`) | Table mapping + queries |
| `supabase/migrations/*.sql` | Schema + open RLS for this repo |

If env is unset, UI may keep local demo data. If env is set, talk to this Kong URL only.

Reference (Pulse Thanks): `listThankYouEntries` / `insertThankYouEntry` — no login, shared feed.

## Add a table

1. Add `supabase/migrations/<timestamp>_<name>.sql`:
   - `create table public.<name> (...)`
   - `alter table ... enable row level security`
   - `create policy ... for all to anon, authenticated using (true) with check (true)`
   - `grant select, insert, update, delete on table public.<name> to anon, authenticated, service_role`
2. Apply the SQL on **this** instance (Dokploy exec into `oryx-supabase-bb1dnn-db-1` as `postgres`, or Studio SQL on the Oryx Kong URL). Do not apply it on Capacity/YNAPB.
3. Add a feature API module that uses `getSupabaseBrowserClient()`.
4. Seed via PostgREST + anon key (see `scripts/seed-thanks.mjs` / `npm run seed:thanks`) or a new script. Prefer `on_conflict=id` + `Prefer: resolution=merge-duplicates`.
5. Confirm without printing keys: HTTP status and `content-range` / row count only.

## Checks (no secrets in output)

```bash
# Anon read (expects 200)
# GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/thank_you_entry?select=id&limit=1
# headers: apikey + Authorization: Bearer <anon>

npm run seed:thanks    # upserts Thanks demo rows
npm run test           # includes thanks mapping test
```

CORS is `*` on Kong. After a live probe (`TEST`, dummy, wiring-check), **delete that row** in the same session.

## Secrets and Studio

- Open Studio through the Oryx Kong URL. Login: Dokploy → Oryx → `supabase` → Environment → `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
- Rotate or set secrets only in that Environment tab (or local gitignored `.env.local` for the two `NEXT_PUBLIC_*` keys). In chat say the **key name and where to open it**, never the value.
