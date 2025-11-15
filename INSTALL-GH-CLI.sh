#!/bin/bash
# Script para instalar GitHub CLI
# Execute: bash INSTALL-GH-CLI.sh

set -e

echo "🔧 Instalando GitHub CLI..."

# Verificar se já está instalado
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI já está instalado!"
    gh --version
    exit 0
fi

# Adicionar chave GPG
echo "📥 Adicionando chave GPG..."
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg

# Adicionar repositório
echo "📦 Adicionando repositório..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

# Atualizar e instalar
echo "🔄 Atualizando lista de pacotes..."
sudo apt update

echo "📥 Instalando GitHub CLI..."
sudo apt install -y gh

# Verificar instalação
echo ""
echo "✅ Instalação concluída!"
gh --version

echo ""
echo "🔑 Próximo passo: Autenticar no GitHub"
echo "   Execute: gh auth login"

