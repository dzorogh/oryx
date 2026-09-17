#!/usr/bin/env python3
"""Oryx self-hosted Supabase helper for agents. Never print secrets."""

from __future__ import annotations

import argparse
import base64
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = REPO_ROOT / "supabase" / "migrations"
STATE_DIR = Path.home() / ".config" / "oryx"
DOKPLOY_ENV_FILE = STATE_DIR / "dokploy.env"
SUPABASE_ENV_FILE = STATE_DIR / "supabase.env"
STATE_FILE = STATE_DIR / "dokploy-state.json"
DOKPLOY_CREDS_FALLBACK = Path("/Users/dzorogh/Develop/workevent/frontend/.env.local")

API_HOST = "oryx-supabase-8de6bd-72-56-83-48.sslip.io"
API_URL = f"https://{API_HOST}"
PROJECT_NAME = "Oryx"
COMPOSE_NAME = "supabase"
DOCKER_PROJECT = "oryx-supabase-bb1dnn"
SMOKE_TABLES = ("thank_you_entry",)


class OryxSupabaseError(RuntimeError):
    pass


def parse_env(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        out[key.strip()] = value.strip().strip("\"'")
    return out


def load_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    return parse_env(path.read_text())


def dump_env(values: dict[str, str]) -> str:
    return "".join(f"{key}={value}\n" for key, value in values.items())


def upsert_env_file(path: Path, updates: dict[str, str]) -> None:
    current = load_env_file(path)
    current.update(updates)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump_env(current))
    path.chmod(0o600)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    path.chmod(0o600)


def dokploy_base_and_key() -> tuple[str, str]:
    merged = load_env_file(DOKPLOY_ENV_FILE)
    if DOKPLOY_CREDS_FALLBACK.exists():
        fallback = load_env_file(DOKPLOY_CREDS_FALLBACK)
        for dest, sources in (
            ("DOKPLOY_URL", ("DOKPLOY_URL", "DOCKPLOY_URL")),
            ("DOKPLOY_API_KEY", ("DOKPLOY_API_KEY", "DOCKPLOY_API_KEY")),
        ):
            if not merged.get(dest):
                for source in sources:
                    if fallback.get(source):
                        merged[dest] = fallback[source]
                        break
        if merged.get("DOKPLOY_URL") and merged.get("DOKPLOY_API_KEY"):
            upsert_env_file(
                DOKPLOY_ENV_FILE,
                {
                    "DOKPLOY_URL": merged["DOKPLOY_URL"],
                    "DOKPLOY_API_KEY": merged["DOKPLOY_API_KEY"],
                },
            )
    base = (merged.get("DOKPLOY_URL") or "").rstrip("/")
    key = merged.get("DOKPLOY_API_KEY") or ""
    if not base or not key:
        raise OryxSupabaseError(
            f"Dokploy credentials missing. Put DOKPLOY_URL and DOKPLOY_API_KEY in {DOKPLOY_ENV_FILE}"
        )
    return base, key


def dokploy(method: str, path: str, payload: dict | None = None, params: dict | None = None) -> Any:
    base, api_key = dokploy_base_and_key()
    url = f"{base}/api/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = None
    headers = {"x-api-key": api_key, "accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["content-type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                raw = response.read()
                if not raw:
                    return {"ok": True, "status": response.status}
                return json.loads(raw.decode())
        except urllib.error.HTTPError as error:
            raise OryxSupabaseError(f"Dokploy {method} {path} failed: HTTP {error.code}") from error
        except (urllib.error.URLError, TimeoutError, ConnectionError, BrokenPipeError) as error:
            last_error = error
            time.sleep(min(2**attempt, 12))
    raise OryxSupabaseError(f"Dokploy {method} {path} disconnected: {last_error}") from last_error


def load_state() -> dict[str, Any]:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {}


def find_project() -> dict[str, Any]:
    projects = dokploy("GET", "project.all")
    if not isinstance(projects, list):
        raise OryxSupabaseError("Dokploy project.all returned no list")
    for project in projects:
        if str(project.get("name") or "").lower() == PROJECT_NAME.lower():
            project_id = project.get("projectId") or project.get("id")
            return dokploy("GET", "project.one", params={"projectId": project_id})
    names = [str(item.get("name") or "") for item in projects]
    raise OryxSupabaseError(f"Dokploy project {PROJECT_NAME!r} not found. Seen: {names}")


def find_compose(detail: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    environments = detail.get("environments") or []
    preferred = None
    for environment in environments:
        name = str(environment.get("name") or "").lower()
        if name == "production":
            preferred = environment
            break
    if preferred is None and environments:
        preferred = environments[0]
    if not preferred:
        raise OryxSupabaseError("Oryx project has no environment")

    matches: list[dict[str, Any]] = []
    for compose in preferred.get("compose") or []:
        name = str(compose.get("name") or "").lower()
        app_name = str(compose.get("appName") or "")
        if name == COMPOSE_NAME or app_name == DOCKER_PROJECT or "supabase" in name:
            matches.append(compose)
    if not matches:
        raise OryxSupabaseError("Oryx compose `supabase` not found")
    done = [item for item in matches if item.get("composeStatus") == "done"]
    return preferred, (done or matches)[0]


def sync_supabase_env() -> dict[str, str]:
    detail = find_project()
    environment, compose_ref = find_compose(detail)
    compose_id = compose_ref.get("composeId") or compose_ref.get("id")
    if not compose_id:
        raise OryxSupabaseError("composeId missing")
    compose = dokploy("GET", "compose.one", params={"composeId": compose_id})
    values = parse_env(compose.get("env") or "")
    anon = values.get("ANON_KEY") or values.get("SUPABASE_ANON_KEY")
    service = values.get("SERVICE_ROLE_KEY") or values.get("SUPABASE_SERVICE_ROLE_KEY")
    if not anon or not service:
        raise OryxSupabaseError("ANON_KEY or SERVICE_ROLE_KEY missing from Oryx compose Environment")
    upsert_env_file(
        SUPABASE_ENV_FILE,
        {
            "SUPABASE_URL": API_URL,
            "SUPABASE_ANON_KEY": anon,
            "SUPABASE_SERVICE_ROLE_KEY": service,
        },
    )
    write_json(
        STATE_FILE,
        {
            "projectId": detail.get("projectId") or detail.get("id"),
            "environmentId": environment.get("environmentId") or environment.get("id"),
            "composeId": compose_id,
            "appName": compose.get("appName") or compose_ref.get("appName") or DOCKER_PROJECT,
            "url": API_URL,
        },
    )
    return {"url": API_URL, "env_file": str(SUPABASE_ENV_FILE)}


def supabase_env() -> dict[str, str]:
    merged = load_env_file(SUPABASE_ENV_FILE)
    for key in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
        if os.environ.get(key):
            merged[key] = os.environ[key]
    if not merged.get("SUPABASE_URL"):
        merged["SUPABASE_URL"] = API_URL
    return merged


def require_service_key() -> tuple[str, str]:
    env = supabase_env()
    url = (env.get("SUPABASE_URL") or "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        raise OryxSupabaseError(f"Run `python3 scripts/oryx_supabase.py sync` first ({SUPABASE_ENV_FILE})")
    return url, key


def rest(
    method: str,
    path: str,
    payload: Any | None = None,
    params: dict[str, str] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, Any]:
    url, key = require_service_key()
    if not path.startswith("/"):
        path = "/" + path
    target = url + path
    if params:
        target += "?" + urllib.parse.urlencode(params)
    body = None
    headers = {
        "apikey": key,
        "authorization": f"Bearer {key}",
        "accept": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    if payload is not None:
        body = json.dumps(payload).encode()
        headers["content-type"] = "application/json"
    request = urllib.request.Request(target, data=body, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            parsed: Any = json.loads(raw.decode()) if raw else None
            return response.status, parsed
    except urllib.error.HTTPError as error:
        raw = error.read().decode(errors="replace")
        try:
            parsed = json.loads(raw) if raw else {"error": error.reason}
        except json.JSONDecodeError:
            parsed = {"error": raw[:500] or error.reason}
        return error.code, parsed


def list_tables(schemas: list[str] | None = None) -> list[str]:
    wanted = set(schemas or ["public"])
    status, body = rest("GET", "/rest/v1/", extra_headers={"accept": "application/openapi+json"})
    if status != 200 or not isinstance(body, dict):
        raise OryxSupabaseError(f"OpenAPI failed HTTP {status}")
    names: set[str] = set()
    definitions = body.get("definitions") or {}
    if isinstance(definitions, dict):
        names.update(str(name) for name in definitions)
    paths = body.get("paths") or {}
    if isinstance(paths, dict):
        for path in paths:
            if not isinstance(path, str) or not path.startswith("/"):
                continue
            name = path.strip("/").split("/", 1)[0]
            if name:
                names.add(name)
    if wanted != {"public"}:
        return sorted(names)
    return sorted(names)


def _decode_container_file(body: Any) -> str:
    raw = body.get("content") if isinstance(body, dict) else ""
    if not raw:
        return ""
    try:
        return base64.b64decode(raw).decode("utf-8", "replace")
    except (ValueError, TypeError):
        return str(raw)


def db_container_id() -> tuple[str, str]:
    state = load_state()
    compose_id = state.get("composeId")
    if not compose_id:
        sync_supabase_env()
        state = load_state()
        compose_id = state.get("composeId")
    if not compose_id:
        raise OryxSupabaseError("composeId missing; run sync")
    compose = dokploy("GET", "compose.one", params={"composeId": compose_id})
    app_name = compose.get("appName") or state.get("appName") or DOCKER_PROJECT
    containers = dokploy(
        "GET",
        "docker.getContainersByAppNameMatch",
        params={"appName": app_name, "appType": "docker-compose"},
    )
    if not isinstance(containers, list):
        raise OryxSupabaseError("containers unavailable")
    db = next((item for item in containers if str(item.get("name") or "").endswith("-db-1")), None)
    container_id = (db or {}).get("containerId") or (db or {}).get("id")
    if not container_id:
        raise OryxSupabaseError("db container missing")
    return str(compose_id), str(container_id)


def execute_sql(sql: str) -> dict[str, Any]:
    query = sql.strip().rstrip(";")
    if not query:
        raise OryxSupabaseError("empty SQL")
    compose_id, container_id = db_container_id()
    dokploy(
        "POST",
        "docker.writeContainerFile",
        {
            "containerId": container_id,
            "path": "/tmp/oryx_agent.sql",
            "content": query + "\n",
        },
    )
    command = (
        'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --csv '
        "-f /tmp/oryx_agent.sql "
        "> /tmp/oryx_agent.out 2> /tmp/oryx_agent.err "
        "; echo $? > /tmp/oryx_agent.status"
    )
    created = dokploy(
        "POST",
        "schedule.create",
        {
            "name": "oryx-agent-sql",
            "cronExpression": "0 0 1 1 *",
            "command": command,
            "scheduleType": "compose",
            "composeId": compose_id,
            "serviceName": "db",
            "shellType": "sh",
            "enabled": False,
        },
    )
    schedule_id = created.get("scheduleId") or created.get("id")
    if not schedule_id:
        raise OryxSupabaseError("schedule_create failed")
    try:
        dokploy("POST", "schedule.runManually", {"scheduleId": schedule_id})
        status_text = ""
        for _attempt in range(16):
            time.sleep(1.5)
            try:
                body = dokploy(
                    "GET",
                    "docker.readContainerFile",
                    params={"containerId": container_id, "path": "/tmp/oryx_agent.status"},
                )
            except OryxSupabaseError:
                continue
            status_text = _decode_container_file(body).strip()
            if status_text:
                break
        out = ""
        err = ""
        try:
            out = _decode_container_file(
                dokploy(
                    "GET",
                    "docker.readContainerFile",
                    params={"containerId": container_id, "path": "/tmp/oryx_agent.out"},
                )
            )
        except OryxSupabaseError:
            out = ""
        try:
            err = _decode_container_file(
                dokploy(
                    "GET",
                    "docker.readContainerFile",
                    params={"containerId": container_id, "path": "/tmp/oryx_agent.err"},
                )
            )
        except OryxSupabaseError:
            err = ""
    finally:
        dokploy("POST", "schedule.delete", {"scheduleId": schedule_id})

    ok = status_text == "0"
    if len(out) > 80_000:
        out = out[:80_000] + "\n…truncated"
    return {
        "ok": ok,
        "exit_code": status_text or "missing",
        "csv": out.strip(),
        "stderr": err.strip()[:2000],
    }


def sql_rows(sql: str) -> list[dict[str, str]]:
    result = execute_sql(sql)
    if not result["ok"]:
        raise OryxSupabaseError(result.get("stderr") or f"sql failed: {result.get('exit_code')}")
    text = result.get("csv") or ""
    if not text:
        return []
    return list(csv.DictReader(StringIO(text)))


def list_extensions() -> list[dict[str, str]]:
    return sql_rows("select extname, extversion from pg_extension order by 1")


def list_policies(schema: str = "public") -> list[dict[str, str]]:
    safe = schema.replace("'", "")
    return sql_rows(
        "select schemaname, tablename, policyname, cmd, roles, permissive "
        "from pg_policies "
        f"where schemaname = '{safe}' "
        "order by tablename, policyname"
    )


def list_migrations() -> list[dict[str, str]]:
    files = []
    if MIGRATIONS_DIR.exists():
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            files.append({"name": path.name, "bytes": str(path.stat().st_size)})
    return files


def _migration_path(name: str) -> Path:
    stem = re.sub(r"[^a-z0-9_]+", "_", name.strip().lower()).strip("_")
    if not stem:
        raise OryxSupabaseError("migration name is empty")
    if re.match(r"^\d{8,14}_", stem):
        filename = f"{stem}.sql"
    else:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        filename = f"{stamp}_{stem}.sql"
    return MIGRATIONS_DIR / filename


def apply_migration(name: str, query: str) -> dict[str, Any]:
    MIGRATIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = _migration_path(name)
    written = False
    if not path.exists():
        path.write_text(query.strip() + "\n")
        written = True
    result = execute_sql(query)
    result["name"] = name
    result["file"] = str(path.relative_to(REPO_ROOT))
    result["wrote_file"] = written
    return result


def describe_tables(schemas: list[str] | None = None, verbose: bool = False) -> list[dict[str, Any]]:
    schemas = schemas or ["public"]
    names = list_tables(schemas) if schemas == ["public"] else []
    if not verbose:
        if names:
            return [{"name": f"public.{table}", "schema": "public"} for table in names]
        quoted = ",".join("'" + item.replace("'", "") + "'" for item in schemas)
        rows = sql_rows(
            "select n.nspname as table_schema, c.relname as table_name "
            "from pg_class c join pg_namespace n on n.oid = c.relnamespace "
            f"where c.relkind = 'r' and n.nspname in ({quoted}) "
            "order by 1,2"
        )
        return [{"name": f"{row['table_schema']}.{row['table_name']}", "schema": row["table_schema"]} for row in rows]

    quoted = ",".join("'" + item.replace("'", "") + "'" for item in schemas)
    columns = sql_rows(
        "select n.nspname as table_schema, c.relname as table_name, a.attname as column_name, "
        "pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type, "
        "not a.attnotnull as is_nullable, c.relrowsecurity as rls_enabled, "
        "c.relforcerowsecurity as rls_forced, "
        "exists (select 1 from pg_index i where i.indrelid = c.oid and i.indisprimary "
        "and a.attnum = any(i.indkey)) as is_pk "
        "from pg_class c "
        "join pg_namespace n on n.oid = c.relnamespace "
        "join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped "
        f"where c.relkind = 'r' and n.nspname in ({quoted}) "
        "order by 1,2,a.attnum"
    )
    fks = sql_rows(
        "select n.nspname as table_schema, c.relname as table_name, a.attname as column_name, "
        "fn.nspname as foreign_schema, fc.relname as foreign_table, fa.attname as foreign_column "
        "from pg_constraint con "
        "join pg_class c on c.oid = con.conrelid "
        "join pg_namespace n on n.oid = c.relnamespace "
        "join pg_class fc on fc.oid = con.confrelid "
        "join pg_namespace fn on fn.oid = fc.relnamespace "
        "join unnest(con.conkey) with ordinality as src(attnum, ord) on true "
        "join unnest(con.confkey) with ordinality as dst(attnum, ord) on src.ord = dst.ord "
        "join pg_attribute a on a.attrelid = c.oid and a.attnum = src.attnum "
        "join pg_attribute fa on fa.attrelid = fc.oid and fa.attnum = dst.attnum "
        f"where con.contype = 'f' and n.nspname in ({quoted})"
    )
    tables: dict[str, dict[str, Any]] = {}
    for row in columns:
        key = f"{row['table_schema']}.{row['table_name']}"
        item = tables.setdefault(
            key,
            {
                "name": key,
                "rls_enabled": row.get("rls_enabled") == "t",
                "rls_forced": row.get("rls_forced") == "t",
                "columns": [],
                "primary_keys": [],
                "foreign_keys": [],
            },
        )
        item["columns"].append(
            {
                "name": row["column_name"],
                "data_type": row["data_type"],
                "nullable": row.get("is_nullable") == "t",
            }
        )
        if row.get("is_pk") == "t":
            item["primary_keys"].append(row["column_name"])
    for row in fks:
        key = f"{row['table_schema']}.{row['table_name']}"
        if key in tables:
            tables[key]["foreign_keys"].append(
                {
                    "column": row["column_name"],
                    "references": f"{row['foreign_schema']}.{row['foreign_table']}.{row['foreign_column']}",
                }
            )
    return list(tables.values())


_PG_TO_TS = {
    "uuid": "string",
    "text": "string",
    "character varying": "string",
    "varchar": "string",
    "boolean": "boolean",
    "bool": "boolean",
    "integer": "number",
    "int4": "number",
    "int8": "number",
    "bigint": "number",
    "smallint": "number",
    "numeric": "number",
    "json": "Json",
    "jsonb": "Json",
    "timestamp with time zone": "string",
    "timestamp without time zone": "string",
    "date": "string",
}


def generate_typescript_types(schema: str = "public") -> str:
    tables = describe_tables([schema], verbose=True)
    chunks = [
        "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]",
        "",
    ]
    for table in tables:
        raw = table["name"].split(".", 1)[-1]
        ident = "".join(part[:1].upper() + part[1:] for part in raw.replace('"', "").split("_"))
        chunks.append(f"export type {ident}Row = {{")
        for column in table["columns"]:
            pg_type = column["data_type"].split("(")[0]
            ts_type = _PG_TO_TS.get(pg_type, "string")
            optional = "?" if column["nullable"] else ""
            chunks.append(f"  {column['name']}{optional}: {ts_type}")
        chunks.append("}")
        chunks.append("")
    return "\n".join(chunks).rstrip() + "\n"


def list_auth_users() -> list[dict[str, Any]]:
    status, body = rest("GET", "/auth/v1/admin/users")
    if status != 200:
        raise OryxSupabaseError(f"auth users HTTP {status}")
    users = body.get("users") if isinstance(body, dict) else body
    if not isinstance(users, list):
        return []
    out = []
    for user in users:
        if not isinstance(user, dict):
            continue
        out.append(
            {
                "id": user.get("id"),
                "email": user.get("email"),
                "created_at": user.get("created_at"),
                "email_confirmed": bool(user.get("email_confirmed_at")),
            }
        )
    return out


def cmd_sync(_args: argparse.Namespace) -> None:
    result = sync_supabase_env()
    env = supabase_env()
    print(
        json.dumps(
            {
                "ok": True,
                "url": result["url"],
                "env_file": result["env_file"],
                "keys_present": sorted(key for key in env if env[key]),
            }
        )
    )


def cmd_check(_args: argparse.Namespace) -> None:
    url, _key = require_service_key()
    status, _body = rest("GET", "/auth/v1/health")
    tables = list_tables()
    print(
        json.dumps(
            {
                "ok": status == 200 and any(name in tables for name in SMOKE_TABLES),
                "url": url,
                "auth_health": status,
                "table_count": len(tables),
                "smoke_tables_present": [name for name in SMOKE_TABLES if name in tables],
            }
        )
    )


def cmd_tables(_args: argparse.Namespace) -> None:
    print(json.dumps({"tables": list_tables()}))


def cmd_sql(args: argparse.Namespace) -> None:
    print(json.dumps(execute_sql(args.query)))


def cmd_rest(args: argparse.Namespace) -> None:
    payload = json.loads(args.json) if args.json else None
    status, body = rest(args.method, args.path, payload=payload)
    print(json.dumps({"status": status, "body": body}))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Oryx self-hosted Supabase agent client")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("sync").set_defaults(func=cmd_sync)
    sub.add_parser("check").set_defaults(func=cmd_check)
    sub.add_parser("tables").set_defaults(func=cmd_tables)
    sql = sub.add_parser("sql")
    sql.add_argument("query")
    sql.set_defaults(func=cmd_sql)
    rest_cmd = sub.add_parser("rest")
    rest_cmd.add_argument("method")
    rest_cmd.add_argument("path")
    rest_cmd.add_argument("--json")
    rest_cmd.set_defaults(func=cmd_rest)
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    try:
        main()
    except OryxSupabaseError as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        raise SystemExit(1) from error
