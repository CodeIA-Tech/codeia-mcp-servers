#!/bin/bash
# Script interativo para configurar secrets do Datadog no GitHub
# Uso: ./scripts/setup-datadog-secrets.sh

set -e

REPO="CodeIA-Tech/codeia-mcp-servers"

echo "🔐 Configurando Secrets do Datadog no GitHub"
echo "📦 Repositório: $REPO"
echo ""

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não encontrado"
    echo "📦 Instale: https://cli.github.com/"
    exit 1
fi

# Verificar autenticação
if ! gh auth status &> /dev/null; then
    echo "🔑 Autenticando no GitHub..."
    gh auth login
fi

echo "📝 Por favor, tenha suas API Keys do Datadog prontas:"
echo "   - API Key (de: https://app.datadoghq.com/organization-settings/api-keys)"
echo "   - App Key (de: https://app.datadoghq.com/organization-settings/application-keys)"
echo ""

# API Key
read -p "🔑 Cole sua DATADOG_API_KEY e pressione Enter: " api_key
if [ -n "$api_key" ]; then
    echo "$api_key" | gh secret set DATADOG_API_KEY --repo "$REPO"
    echo "✅ DATADOG_API_KEY configurada!"
else
    echo "⚠️  API Key vazia, pulando..."
fi

echo ""

# App Key
read -p "🔑 Cole sua DATADOG_APP_KEY e pressione Enter: " app_key
if [ -n "$app_key" ]; then
    echo "$app_key" | gh secret set DATADOG_APP_KEY --repo "$REPO"
    echo "✅ DATADOG_APP_KEY configurada!"
else
    echo "⚠️  App Key vazia, pulando..."
fi

echo ""

# Site (opcional)
read -p "🌐 Site do Datadog [datadoghq.com]: " site
site=${site:-datadoghq.com}
if [ -n "$site" ]; then
    echo "$site" | gh secret set DATADOG_SITE --repo "$REPO"
    echo "✅ DATADOG_SITE configurada: $site"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Secrets configurados:"
gh secret list --repo "$REPO" | grep DATADOG || echo "   (nenhum secret DATADOG encontrado)"
echo ""
echo "✅ Próximo passo: Testar conexão"
echo "   node scripts/test-datadog-connection.js"

