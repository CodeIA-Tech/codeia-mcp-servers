#!/bin/bash
# Script para instalar configurações MCP globalmente em ~/.cursor/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CURSOR_DIR="$HOME/.cursor"

echo "📦 Instalando configurações MCP do codeia-mcp-servers..."

# Criar diretório .cursor se não existir
mkdir -p "$CURSOR_DIR"
mkdir -p "$CURSOR_DIR/rules"

# Copiar configuração base MCP
if [ -f "$REPO_ROOT/mcp/base.json" ]; then
    cp "$REPO_ROOT/mcp/base.json" "$CURSOR_DIR/mcp.json"
    echo "✅ Copiado mcp/base.json -> ~/.cursor/mcp.json"
else
    echo "⚠️  Arquivo mcp/base.json não encontrado"
fi

# Copiar rules
if [ -d "$REPO_ROOT/rules" ]; then
    # Copiar estrutura de rules
    for rule_dir in "$REPO_ROOT/rules"/*/; do
        if [ -d "$rule_dir" ]; then
            rule_name=$(basename "$rule_dir")
            mkdir -p "$CURSOR_DIR/rules/$rule_name"
            cp "$rule_dir"/*.md "$CURSOR_DIR/rules/$rule_name/" 2>/dev/null || true
            echo "✅ Copiado rules/$rule_name/"
        fi
    done
fi

echo ""
echo "🎉 Instalação concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Edite ~/.cursor/mcp.json para adicionar variáveis de ambiente"
echo "   2. Configure as variáveis necessárias (GITHUB_TOKEN, etc.)"
echo "   3. Reinicie o Cursor para aplicar as mudanças"
echo ""

