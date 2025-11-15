#!/bin/bash
# Wrapper script para o MCP server do Datadog que carrega variáveis do .env
# Este script carrega o .env e executa o servidor MCP

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# Carregar variáveis do .env se existir
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Verificar se as variáveis necessárias estão definidas
if [ -z "$DATADOG_API_KEY" ] || [ -z "$DATADOG_APP_KEY" ]; then
    echo "❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias" >&2
    echo "💡 Configure no arquivo .env ou como variáveis de ambiente" >&2
    exit 1
fi

# Definir site padrão se não estiver definido
export DATADOG_SITE="${DATADOG_SITE:-datadoghq.com}"

# Executar o servidor MCP do Datadog
exec node "${SCRIPT_DIR}/datadog-mcp-server.js"

