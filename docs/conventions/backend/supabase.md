# Oryx demo Supabase

Canonical how-to for the **Oryx-only** self-hosted Supabase. Deploy layout and DNS: [docs/deploy/dokploy.md](../../deploy/dokploy.md). Thanks screen: [docs/features/pulse-thanks.md](../../features/pulse-thanks.md).

## Which instance

Use **this project's** Dokploy compose. Do **not** read or write Capacity (`supabase.capacity.indenbom.ru`) or YNAPB (`supabase.ynapb.indenbom.ru` / `supabase.indenbom.ru`).

| Item | Value |
|------|--------|
| Dokploy project | **Oryx** → environment **production** |
| Compose name | `supabase` |
| Docker project | `oryx-supabase-bb1dnn` |
| Public Kong URL | `https://supabase.oryx.indenbom.ru` |
| Fallback Kong URL | `https://oryx-supabase-8de6bd-72-56-83-48.sslip.io` |

Kong is the only public entry (`/rest/v1`, `/auth/v1`, Studio). Isolated deployment — containers do not share the Capacity/YNAPB stack.

## Auth model (demo)

- **No user login.** The browser uses the **anon** JWT from `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Demo tables enable RLS. Pulse Thanks keeps open anon DML. **Store** is read-only for anon/authenticated (SELECT + command RPCs only); mutations go through `store_*` security definer functions. No open-all Store policies and no public reset RPC.
- PostgREST still requires the `apikey` header (anon key). A request with no key gets `401` from Kong. That is expected.
- Do not persist Auth sessions in the client (`persistSession: false` in `src/lib/supabase/client.ts`).
- **Anon key is publishable** (it is in the client bundle). **Service role, JWT secret, Postgres password, Studio password** stay in Dokploy → compose `supabase` → **Environment**. Never commit them or paste them in chat.

## Frontend

Env (copy from `.env.example` into `.env.local`; restart `npm run dev`):

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.oryx.indenbom.ru
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

## Agent access (MCP)

Agents talk to this instance through the project MCP **`oryx-supabase`**. Do **not** use `user-supabase` (hosted supabase.com) or `capacity-supabase`.

| Piece | Where |
|-------|--------|
| MCP server | Project `.cursor/mcp.json` → `oryx-supabase` only. Do not add it to the user MCP list. |
| Command | `~/.config/oryx/mcp-venv/bin/python` + `scripts/oryx_supabase_mcp.py` |
| Tools | `list_tables`, `execute_sql`, `apply_migration`, `list_migrations`, `list_policies`, `list_extensions`, `rest`, `generate_typescript_types`, `get_project_url`, `list_auth_users` |
| Client | `scripts/oryx_supabase.py` (`sync`, `check`, `tables`, `sql`, `rest`) |
| Secrets | `~/.config/oryx/supabase.env` and `~/.config/oryx/dokploy.env` (mode `600`, never commit) |

`rest` uses the **service role**. `execute_sql` / `apply_migration` run via Dokploy exec into `oryx-supabase-bb1dnn-db-1`. `apply_migration` also writes `supabase/migrations/<timestamp>_<name>.sql`.

One-time on a machine:

```bash
python3 scripts/oryx_supabase.py sync   # copies keys from Dokploy compose Environment
python3 scripts/oryx_supabase.py check  # auth health + smoke table, no secrets
```

`sync` reads Dokploy API credentials from `~/.config/oryx/dokploy.env` (`DOKPLOY_URL`, `DOKPLOY_API_KEY`). If that file is missing, it can bootstrap from the local Dokploy env file already used for other projects — values stay on disk, never in chat.

In chat report HTTP status, row counts, and table names only. After a live probe (`TEST`, dummy, wiring-check), delete that row in the same session.

## Add a table

1. Add `supabase/migrations/<timestamp>_<name>.sql`:
   - `create table public.<name> (...)`
   - `alter table ... enable row level security`
   - For demo Pulse-style tables: open SELECT/INSERT policy may be appropriate
   - For **Store** tables: SELECT-only for anon/authenticated; mutations via security definer RPCs; revoke EXECUTE on internal helpers
   - `grant` accordingly (`service_role` keeps full access)
2. Apply the SQL on **this** instance via MCP `apply_migration` / `execute_sql` (or Studio SQL on the Oryx Kong URL). Do not apply it on Capacity/YNAPB.
3. Add a feature API module that uses `getSupabaseBrowserClient()`.
4. Seed via PostgREST. Thanks may use anon; **Store logistics** uses privileged service_role (`npm run seed:logistics`, keys from `~/.config/oryx/supabase.env`). Prefer `on_conflict=id` + `Prefer: resolution=merge-duplicates` where upserts apply.
5. Confirm without printing keys: HTTP status and `content-range` / row count only.

## Checks (no secrets in output)

```bash
# Anon read (expects 200)
# GET $NEXT_PUBLIC_SUPABASE_URL/rest/v1/thank_you_entry?select=id&limit=1
# headers: apikey + Authorization: Bearer <anon>

npm run seed:thanks    # upserts Thanks demo rows
npm run seed:logistics # upserts Logistics demo rows and posts the story
```

CORS is `*` on Kong. After a live probe (`TEST`, dummy, wiring-check), **delete that row** in the same session.

## Secrets and Studio

- Open Studio through the Oryx Kong URL (`https://supabase.oryx.indenbom.ru/`). Login: Dokploy → Oryx → `supabase` → Environment → `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
- Studio (+ `postgres-meta`) is a **separate** Dokploy compose named **`studio`**. Start/stop it from the Dokploy UI without taking REST down. Kong `/rest/v1` stays on the main `supabase` compose.
- The demo stack does **not** run Storage, Realtime, or imgproxy.
- Rotate or set secrets only in that Environment tab (or local gitignored `.env.local` for the two `NEXT_PUBLIC_*` keys). In chat say the **key name and where to open it**, never the value.
