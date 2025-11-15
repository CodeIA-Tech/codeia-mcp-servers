#!/bin/bash
# Script para testar e obter secrets do Datadog do GitHub
# Uso: ./scripts/test-datadog-secrets.sh

REPO="CodeIA-Tech/codeia-mcp-servers"

echo "🔍 Verificando secrets do Datadog no GitHub..."
echo "📦 Repositório: $REPO"
echo ""

# Listar todos os secrets
echo "📋 Secrets disponíveis no repositório:"
gh secret list --repo "$REPO" 2>&1 || exit 1

echo ""

# Tentar obter cada secret
echo "🔐 Tentando obter secrets do Datadog..."

# API Key
echo -n "   DATADOG_API_KEY: "
API_KEY=$(gh secret get DATADOG_API_KEY --repo "$REPO" 2>/dev/null)
if [ -n "$API_KEY" ]; then
    echo "✅ ${API_KEY:0:8}..."
    export DATADOG_API_KEY="$API_KEY"
else
    echo "❌ Não encontrado"
fi

# App Key
echo -n "   DATADOG_APP_KEY: "
APP_KEY=$(gh secret get DATADOG_APP_KEY --repo "$REPO" 2>/dev/null)
if [ -n "$APP_KEY" ]; then
    echo "✅ ${APP_KEY:0:8}..."
    export DATADOG_APP_KEY="$APP_KEY"
else
    echo "❌ Não encontrado"
fi

# Site
echo -n "   DATADOG_SITE: "
SITE=$(gh secret get DATADOG_SITE --repo "$REPO" 2>/dev/null || echo "datadoghq.com")
echo "✅ $SITE"
export DATADOG_SITE="$SITE"

echo ""

# Se ambos os secrets estiverem configurados, testar conexão
if [ -n "$DATADOG_API_KEY" ] && [ -n "$DATADOG_APP_KEY" ]; then
    echo "✅ Todos os secrets encontrados!"
    echo ""
    echo "🔍 Testando conexão com Datadog..."
    echo ""
    node scripts/test-datadog-connection.js
else
    echo "❌ Secrets não configurados completamente"
    echo ""
    echo "📝 Para configurar, execute:"
    echo "   ./scripts/setup-datadog-secrets.sh"
    echo ""
    echo "   Ou manualmente:"
    echo "   gh secret set DATADOG_API_KEY --repo $REPO"
    echo "   gh secret set DATADOG_APP_KEY --repo $REPO"
    echo "   gh secret set DATADOG_SITE --repo $REPO"
fi

