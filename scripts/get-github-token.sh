#!/bin/bash
# Script para obter GIT_TOKEN do GitHub Secrets e configurar variável de ambiente
# Uso: source scripts/get-github-token.sh

set -e

REPO="${GITHUB_REPOSITORY:-CodeIA-Tech/codeia-mcp-servers}"

echo "🔐 Obtendo GIT_TOKEN do GitHub Secrets..."

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não encontrado"
    echo "📦 Instale: https://cli.github.com/"
    return 1 2>/dev/null || exit 1
fi

# Verificar autenticação
if ! gh auth status &> /dev/null; then
    echo "🔑 Autenticando no GitHub..."
    gh auth login
fi

# Obter secret
export GIT_TOKEN=$(gh secret get GIT_TOKEN --repo "$REPO" 2>/dev/null)

if [ -z "$GIT_TOKEN" ]; then
    echo "❌ GIT_TOKEN não encontrado no repositório: $REPO"
    echo "💡 Verifique se o secret está configurado:"
    echo "   gh secret list --repo $REPO"
    return 1 2>/dev/null || exit 1
fi

echo "✅ GIT_TOKEN configurado!"
echo "🔑 Token: ${GIT_TOKEN:0:8}..."

# Também exportar como GITHUB_TOKEN para compatibilidade
export GITHUB_TOKEN="$GIT_TOKEN"

echo "✅ Variáveis configuradas: GIT_TOKEN e GITHUB_TOKEN"
echo ""
echo "📝 Agora você pode usar:"
echo "   node scripts/list-github-org-repos.js CodeIA-Tech"

