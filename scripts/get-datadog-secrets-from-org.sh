#!/bin/bash
# Script para obter secrets do Datadog da organização GitHub
# Nota: Secrets de organização podem não ser acessíveis via CLI
# Este script tenta obter, mas se não funcionar, você precisará configurar localmente

ORG="CodeIA-Tech"

echo "🔍 Obtendo secrets do Datadog da organização GitHub..."
echo "🏢 Organização: $ORG"
echo ""

# Listar secrets disponíveis
echo "📋 Secrets disponíveis na organização:"
gh secret list --org "$ORG" 2>&1 | grep DATADOG || echo "   Nenhum secret DATADOG encontrado"

echo ""

# Tentar obter (pode não funcionar para secrets de organização)
echo "🔐 Tentando obter valores dos secrets..."

# API Key
API_KEY=$(gh secret get DATADOG_API_KEY --org "$ORG" 2>/dev/null)
if [ -n "$API_KEY" ]; then
    export DATADOG_API_KEY="$API_KEY"
    echo "✅ DATADOG_API_KEY obtida"
else
    echo "⚠️  DATADOG_API_KEY não pode ser obtida via CLI"
    echo "   Secrets de organização podem não ser acessíveis via 'gh secret get'"
fi

# App Key
APP_KEY=$(gh secret get DATADOG_APP_KEY --org "$ORG" 2>/dev/null)
if [ -n "$APP_KEY" ]; then
    export DATADOG_APP_KEY="$APP_KEY"
    echo "✅ DATADOG_APP_KEY obtida"
else
    echo "⚠️  DATADOG_APP_KEY não pode ser obtida via CLI"
fi

# Site
SITE=$(gh secret get DATADOG_SITE --org "$ORG" 2>/dev/null || echo "datadoghq.com")
export DATADOG_SITE="$SITE"
echo "✅ DATADOG_SITE: $SITE"

echo ""

# Verificar se ambos foram obtidos
if [ -n "$DATADOG_API_KEY" ] && [ -n "$DATADOG_APP_KEY" ]; then
    echo "✅ Secrets obtidos com sucesso!"
    echo ""
    echo "🔍 Testando conexão com Datadog..."
    node scripts/test-datadog-connection.js
else
    echo "⚠️  Não foi possível obter os valores dos secrets via CLI"
    echo ""
    echo "💡 SOLUÇÕES:"
    echo ""
    echo "Opção 1: Configurar localmente (para desenvolvimento)"
    echo "   export DATADOG_API_KEY=\"sua-api-key\""
    echo "   export DATADOG_APP_KEY=\"sua-app-key\""
    echo "   export DATADOG_SITE=\"datadoghq.com\""
    echo ""
    echo "Opção 2: Usar GitHub Actions (para CI/CD)"
    echo "   Os secrets de organização estarão disponíveis automaticamente"
    echo "   em workflows do GitHub Actions"
    echo ""
    echo "Opção 3: Copiar secrets para o repositório (se necessário)"
    echo "   gh secret set DATADOG_API_KEY --repo CodeIA-Tech/codeia-mcp-servers"
    echo "   gh secret set DATADOG_APP_KEY --repo CodeIA-Tech/codeia-mcp-servers"
    echo ""
    echo "📝 Para usar os secrets de organização em GitHub Actions,"
    echo "   eles já estarão disponíveis automaticamente como:"
    echo "   \${{ secrets.DATADOG_API_KEY }}"
    echo "   \${{ secrets.DATADOG_APP_KEY }}"
fi

