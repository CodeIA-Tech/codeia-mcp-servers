#!/bin/bash
# Script para configurar Datadog usando GitHub Secrets
# Uso: ./scripts/setup-datadog-from-github.sh [repo]

set -e

REPO="${1:-${GITHUB_REPOSITORY}}"
ENV_FILE="${ENV_FILE:-.env.datadog}"

if [ -z "$REPO" ]; then
    echo "❌ Repositório não especificado"
    echo "Uso: $0 <org/repo>"
    echo "   ou configure GITHUB_REPOSITORY"
    exit 1
fi

echo "🔐 Configurando Datadog usando GitHub Secrets..."
echo "📦 Repositório: $REPO"

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não encontrado"
    echo "📦 Instale: https://cli.github.com/"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo "  echo 'deb [arch=\$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null"
    echo "  sudo apt update && sudo apt install gh"
    exit 1
fi

# Verificar autenticação
if ! gh auth status &> /dev/null; then
    echo "🔑 Autenticando no GitHub..."
    gh auth login
fi

# Verificar acesso ao repositório
if ! gh repo view "$REPO" &> /dev/null; then
    echo "❌ Não foi possível acessar o repositório: $REPO"
    echo "💡 Verifique se você tem acesso e se o repositório existe"
    exit 1
fi

# Obter secrets
echo "📥 Obtendo secrets do GitHub..."
DATADOG_API_KEY=$(gh secret get DATADOG_API_KEY --repo "$REPO" 2>/dev/null || echo "")
DATADOG_APP_KEY=$(gh secret get DATADOG_APP_KEY --repo "$REPO" 2>/dev/null || echo "")
DATADOG_SITE=$(gh secret get DATADOG_SITE --repo "$REPO" 2>/dev/null || echo "datadoghq.com")

if [ -z "$DATADOG_API_KEY" ] || [ -z "$DATADOG_APP_KEY" ]; then
    echo "❌ Erro ao obter secrets do GitHub"
    echo "💡 Verifique se os seguintes secrets estão configurados:"
    echo "   - DATADOG_API_KEY"
    echo "   - DATADOG_APP_KEY"
    echo "   - DATADOG_SITE (opcional)"
    echo ""
    echo "📋 Para adicionar secrets:"
    echo "   gh secret set DATADOG_API_KEY --repo $REPO"
    echo "   gh secret set DATADOG_APP_KEY --repo $REPO"
    exit 1
fi

# Exportar variáveis de ambiente
export DATADOG_API_KEY
export DATADOG_APP_KEY
export DATADOG_SITE

echo "✅ Secrets obtidos com sucesso!"
echo "📍 Site: $DATADOG_SITE"
echo "🔑 API Key: ${DATADOG_API_KEY:0:8}..."
echo ""

# Perguntar se deseja criar arquivo .env
read -p "💾 Criar arquivo $ENV_FILE? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    cat > "$ENV_FILE" <<EOF
# Datadog Configuration
# Gerado automaticamente via GitHub Secrets - NÃO COMMITAR
# Repositório: $REPO
# Data: $(date -Iseconds)

DATADOG_API_KEY=$DATADOG_API_KEY
DATADOG_APP_KEY=$DATADOG_APP_KEY
DATADOG_SITE=$DATADOG_SITE
EOF
    echo "✅ Arquivo $ENV_FILE criado"
    echo "⚠️  Adicione ao .gitignore se ainda não estiver"
fi

# Testar conexão
read -p "🔍 Testar conexão com Datadog? (S/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🔍 Testando conexão..."
    if node scripts/test-datadog-connection.js 2>/dev/null; then
        echo "✅ Conexão estabelecida com sucesso!"
    else
        echo "❌ Erro ao testar conexão"
        echo "💡 Verifique se as keys estão corretas e têm permissões apropriadas"
    fi
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📝 Para usar as variáveis de ambiente:"
echo "   export DATADOG_API_KEY=\"$DATADOG_API_KEY\""
echo "   export DATADOG_APP_KEY=\"$DATADOG_APP_KEY\""
echo "   export DATADOG_SITE=\"$DATADOG_SITE\""
echo ""
echo "   # Ou carregar do arquivo .env"
if [ -f "$ENV_FILE" ]; then
    echo "   source $ENV_FILE"
fi

