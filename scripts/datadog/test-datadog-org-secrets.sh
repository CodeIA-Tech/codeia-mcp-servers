#!/bin/bash
# Script para testar secrets do Datadog da organização GitHub
# Uso: ./scripts/test-datadog-org-secrets.sh

ORG="CodeIA-Tech"

echo "🔍 Verificando secrets do Datadog na organização GitHub..."
echo "🏢 Organização: $ORG"
echo ""

# Listar todos os secrets da organização
echo "📋 Secrets disponíveis na organização:"
gh secret list --org "$ORG" 2>&1 || {
    echo "❌ Erro ao listar secrets da organização"
    echo "💡 Verifique se você tem permissão para acessar secrets da organização"
    exit 1
}

echo ""

# Tentar obter cada secret
echo "🔐 Tentando obter secrets do Datadog..."

# API Key
echo -n "   DATADOG_API_KEY: "
API_KEY=$(gh secret get DATADOG_API_KEY --org "$ORG" 2>/dev/null)
if [ -n "$API_KEY" ]; then
    echo "✅ ${API_KEY:0:8}..."
    export DATADOG_API_KEY="$API_KEY"
else
    echo "❌ Não encontrado"
fi

# App Key
echo -n "   DATADOG_APP_KEY: "
APP_KEY=$(gh secret get DATADOG_APP_KEY --org "$ORG" 2>/dev/null)
if [ -n "$APP_KEY" ]; then
    echo "✅ ${APP_KEY:0:8}..."
    export DATADOG_APP_KEY="$APP_KEY"
else
    echo "❌ Não encontrado"
fi

# Site
echo -n "   DATADOG_SITE: "
SITE=$(gh secret get DATADOG_SITE --org "$ORG" 2>/dev/null || echo "datadoghq.com")
echo "✅ $SITE"
export DATADOG_SITE="$SITE"

echo ""

# Se ambos os secrets estiverem configurados, testar conexão
if [ -n "$DATADOG_API_KEY" ] && [ -n "$DATADOG_APP_KEY" ]; then
    echo "✅ Todos os secrets encontrados na organização!"
    echo ""
    echo "🔍 Testando conexão com Datadog..."
    echo ""
    node scripts/test-datadog-connection.js
else
    echo "❌ Secrets não encontrados na organização"
    echo ""
    echo "💡 Verifique:"
    echo "   1. Os secrets estão configurados na organização $ORG?"
    echo "   2. Você tem permissão para acessar secrets da organização?"
    echo "   3. Os nomes estão corretos? (DATADOG_API_KEY, DATADOG_APP_KEY)"
    echo ""
    echo "📝 Para listar secrets da organização:"
    echo "   gh secret list --org $ORG"
fi

