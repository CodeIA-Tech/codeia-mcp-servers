#!/bin/bash
# Script para carregar .env e testar conexão com Datadog
# Uso: ./scripts/load-env-and-test.sh [caminho-do-env]

set -e

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Arquivo .env não encontrado: $ENV_FILE"
    echo "💡 Crie um arquivo .env com:"
    echo "   DATADOG_API_KEY=sua-api-key"
    echo "   DATADOG_APP_KEY=sua-app-key"
    echo "   DATADOG_SITE=datadoghq.com"
    exit 1
fi

echo "📂 Carregando variáveis de: $ENV_FILE"
echo ""

# Carregar variáveis do arquivo .env
set -a
source "$ENV_FILE"
set +a

# Verificar se as variáveis necessárias estão definidas
if [ -z "$DATADOG_API_KEY" ]; then
    echo "❌ DATADOG_API_KEY não encontrada no arquivo .env"
    exit 1
fi

if [ -z "$DATADOG_APP_KEY" ]; then
    echo "❌ DATADOG_APP_KEY não encontrada no arquivo .env"
    exit 1
fi

# Definir site padrão se não estiver definido
export DATADOG_SITE="${DATADOG_SITE:-datadoghq.com}"

echo "✅ Variáveis carregadas com sucesso!"
echo "📍 Site: $DATADOG_SITE"
echo "🔑 API Key: ${DATADOG_API_KEY:0:8}..."
echo "🔑 App Key: ${DATADOG_APP_KEY:0:8}..."
echo ""

echo "🔍 Testando conexão com Datadog..."
echo ""

node scripts/test-datadog-connection.js

