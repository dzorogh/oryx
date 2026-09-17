#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
VENV_DIR="${HOME}/.config/oryx/mcp-venv"
PYTHON="${VENV_DIR}/bin/python"

if [ ! -x "${PYTHON}" ]; then
  mkdir -p "${HOME}/.config/oryx"
  python3 -m venv "${VENV_DIR}"
  "${VENV_DIR}/bin/pip" install -q mcp
fi

exec "${PYTHON}" "${ROOT}/scripts/oryx_supabase_mcp.py"
