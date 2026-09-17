#!/usr/bin/env python3
"""stdio MCP for Oryx self-hosted Supabase. Logs go to stderr only."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from mcp.server.mcpserver import MCPServer
from oryx_supabase import (
    API_URL,
    OryxSupabaseError,
    apply_migration,
    describe_tables,
    execute_sql,
    generate_typescript_types,
    list_auth_users,
    list_extensions,
    list_migrations,
    list_policies,
    rest,
)

server = MCPServer(
    "oryx-supabase",
    version="1.0.0",
    instructions=(
        "Oryx demo Supabase only: Dokploy compose supabase, docker project "
        "oryx-supabase-bb1dnn, Kong https://oryx-supabase-8de6bd-72-56-83-48.sslip.io. "
        "Never use Capacity, YNAPB, or the cloud user-supabase MCP. "
        "Never print keys, JWTs, Studio, or database passwords. "
        "Browser stays on the anon key; these tools use service_role / Dokploy db exec. "
        "After a live probe named TEST or dummy, delete that row in the same session."
    ),
)


def _dump(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=False)


def _call(fn, *args, **kwargs) -> str:
    try:
        return _dump(fn(*args, **kwargs))
    except OryxSupabaseError as error:
        return _dump({"ok": False, "error": str(error)})
    except Exception as error:  # pragma: no cover - unexpected MCP failure
        return _dump({"ok": False, "error": type(error).__name__})


@server.tool(name="list_tables", structured_output=False)
def list_tables_tool(schemas: list[str] | None = None, verbose: bool = False) -> str:
    """List Oryx tables. Set verbose for columns, primary keys, foreign keys, and RLS."""
    return _call(describe_tables, schemas or ["public"], verbose)


@server.tool(name="execute_sql", structured_output=False)
def execute_sql_tool(query: str) -> str:
    """Run SQL on Oryx Postgres via Dokploy db exec. Prefer SELECT with LIMIT."""
    return _call(execute_sql, query)


@server.tool(name="apply_migration", structured_output=False)
def apply_migration_tool(name: str, query: str) -> str:
    """Apply DDL to the live Oryx database and add supabase/migrations/<name>.sql."""
    return _call(apply_migration, name, query)


@server.tool(name="list_migrations", structured_output=False)
def list_migrations_tool() -> str:
    """List SQL files in supabase/migrations."""
    return _call(lambda: {"migrations": list_migrations()})


@server.tool(name="list_extensions", structured_output=False)
def list_extensions_tool() -> str:
    """List installed Postgres extensions on Oryx."""
    return _call(lambda: {"extensions": list_extensions()})


@server.tool(name="list_policies", structured_output=False)
def list_policies_tool(schema: str = "public") -> str:
    """List RLS policies for a schema on Oryx."""
    return _call(lambda: {"policies": list_policies(schema)})


@server.tool(name="generate_typescript_types", structured_output=False)
def generate_typescript_types_tool(schema: str = "public") -> str:
    """Generate TypeScript row types from the live Oryx schema."""
    try:
        return generate_typescript_types(schema)
    except OryxSupabaseError as error:
        return _dump({"ok": False, "error": str(error)})


@server.tool(name="get_project_url", structured_output=False)
def get_project_url_tool() -> str:
    """Return the Oryx Kong API URL. Does not return keys."""
    return _dump({"url": API_URL})


@server.tool(name="rest", structured_output=False)
def rest_tool(method: str, path: str, json_body: str | None = None) -> str:
    """Call Oryx PostgREST or Auth with the service role. Path like /rest/v1/thank_you_entry?select=id."""

    def _rest() -> dict:
        payload = json.loads(json_body) if json_body else None
        status, body = rest(method, path, payload=payload)
        return {"status": status, "body": body}

    return _call(_rest)


@server.tool(name="list_auth_users", structured_output=False)
def list_auth_users_tool() -> str:
    """List Auth users (id, email, created_at). Never returns passwords or tokens."""
    return _call(lambda: {"users": list_auth_users()})


if __name__ == "__main__":
    server.run()
