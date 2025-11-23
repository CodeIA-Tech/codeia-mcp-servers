#!/bin/bash

# Script para configurar o agente desenvolvedor Vertem IA Assessment
# Uso: ./setup-agent.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CURSOR_MCP_DIR="$HOME/.cursor"
CURSOR_MCP_FILE="$CURSOR_MCP_DIR/mcp.json"

echo "🤖 Configurando Agente Desenvolvedor - Vertem IA Assessment"
echo ""

# Criar diretório .cursor se não existir
if [ ! -d "$CURSOR_MCP_DIR" ]; then
    echo "📁 Criando diretório $CURSOR_MCP_DIR"
    mkdir -p "$CURSOR_MCP_DIR"
fi

# Verificar se mcp.json existe
if [ -f "$CURSOR_MCP_FILE" ]; then
    echo "⚠️  Arquivo $CURSOR_MCP_FILE já existe"
    echo "   Fazendo backup..."
    cp "$CURSOR_MCP_FILE" "$CURSOR_MCP_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Verificar se já tem configuração do vertem-ia-assessment
    if grep -q "vertem-ia-assessment" "$CURSOR_MCP_FILE"; then
        echo "✅ Configuração do Vertem IA Assessment já existe"
        echo "   Atualizando..."
    fi
fi

# Criar configuração
echo "📝 Criando configuração MCP..."

# Ler configuração base se existir
if [ -f "$CURSOR_MCP_FILE" ]; then
    # Fazer merge com configuração existente
    echo "   Fazendo merge com configuração existente..."
    
    # Usar jq se disponível, senão criar manualmente
    if command -v jq &> /dev/null; then
        jq -s '.[0] * .[1]' "$CURSOR_MCP_FILE" "$REPO_DIR/mcp/vertem-ia-assessment.json" > "$CURSOR_MCP_FILE.tmp"
        mv "$CURSOR_MCP_FILE.tmp" "$CURSOR_MCP_FILE"
    else
        echo "⚠️  jq não encontrado. Criando configuração manual..."
        cat > "$CURSOR_MCP_FILE" << 'EOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/mnt/c/vertem-ia-assessment"
      ],
      "description": "Acesso ao sistema de arquivos do projeto Vertem IA Assessment"
    },
    "git": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-git",
        "--repository",
        "/mnt/c/vertem-ia-assessment"
      ],
      "description": "Operações Git no repositório Vertem IA Assessment"
    },
    "azure-devops": {
      "command": "node",
      "args": [
        "/home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers/scripts/azure-devops/azure-devops-mcp-server.js"
      ],
      "env": {
        "AZURE_DEVOPS_ORG": "${AZURE_DEVOPS_ORG}",
        "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}",
        "AZURE_DEVOPS_PROJECT": "${AZURE_DEVOPS_PROJECT}",
        "AZURE_DEVOPS_API_VERSION": "${AZURE_DEVOPS_API_VERSION:-7.0}"
      },
      "description": "Integração com Azure DevOps para criar PRs e gerenciar repositório"
    },
    "databases": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sqlite",
        "/mnt/c/vertem-ia-assessment/prisma/dev.db"
      ],
      "description": "Acesso ao banco de dados SQLite do projeto"
    }
  }
}
EOF
    fi
else
    # Criar nova configuração
    cp "$REPO_DIR/mcp/vertem-ia-assessment.json" "$CURSOR_MCP_FILE"
fi

echo "✅ Configuração criada/atualizada em $CURSOR_MCP_FILE"
echo ""

# Verificar se rules directory existe
RULES_DIR="$CURSOR_MCP_DIR/rules"
if [ ! -d "$RULES_DIR" ]; then
    echo "📁 Criando diretório de rules..."
    mkdir -p "$RULES_DIR"
fi

# Copiar rule do vertem-ia-assessment
RULES_SOURCE="$REPO_DIR/rules/vertem-ia-assessment"
RULES_TARGET="$RULES_DIR/vertem-ia-assessment"

if [ -d "$RULES_SOURCE" ]; then
    echo "📋 Copiando rules do Vertem IA Assessment..."
    cp -r "$RULES_SOURCE" "$RULES_TARGET"
    echo "✅ Rules copiadas para $RULES_TARGET"
else
    echo "⚠️  Diretório de rules não encontrado: $RULES_SOURCE"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Reinicie o Cursor IDE"
echo "   2. Use o agente mencionando: 'Vertem IA Developer'"
echo "   3. O agente terá acesso completo ao projeto"
echo ""
echo "📚 Documentação:"
echo "   docs/VERTEM-IA-ASSESSMENT-AGENT.md"

