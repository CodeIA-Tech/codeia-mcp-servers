#!/bin/bash
# Script para configurar MCP servers em um projeto específico

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Uso: ./setup-project.sh <project-path> [configs...]
# Exemplo: ./setup-project.sh ~/projects/my-app base kubernetes gitops

if [ $# -lt 1 ]; then
    echo "Uso: $0 <project-path> [configs...]"
    echo ""
    echo "Configs disponíveis:"
    echo "  - base (filesystem, git) - sempre incluído"
    echo "  - kubernetes"
    echo "  - gitops"
    echo "  - databases"
    echo "  - cloud"
    echo "  - datadog"
    echo ""
    echo "Exemplo:"
    echo "  $0 ~/projects/my-k8s-app base kubernetes gitops"
    exit 1
fi

PROJECT_PATH="$1"
shift
CONFIGS=("base" "$@")

if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Diretório do projeto não encontrado: $PROJECT_PATH"
    exit 1
fi

PROJECT_CURSOR_DIR="$PROJECT_PATH/.cursor"
mkdir -p "$PROJECT_CURSOR_DIR"
mkdir -p "$PROJECT_CURSOR_DIR/rules"

echo "🔧 Configurando MCP servers para: $PROJECT_PATH"
echo "📋 Configs selecionadas: ${CONFIGS[*]}"
echo ""

# Verificar se jq está instalado (necessário para merge)
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq não encontrado. Instalando via apt..."
    sudo apt-get update && sudo apt-get install -y jq
fi

# Merge das configurações MCP
TEMP_MCP=$(mktemp)
echo "{}" > "$TEMP_MCP"

for config in "${CONFIGS[@]}"; do
    CONFIG_FILE="$REPO_ROOT/mcp/${config}.json"
    if [ -f "$CONFIG_FILE" ]; then
        echo "✅ Adicionando $config..."
        jq -s '.[0] * .[1]' "$TEMP_MCP" "$CONFIG_FILE" > "${TEMP_MCP}.tmp"
        mv "${TEMP_MCP}.tmp" "$TEMP_MCP"
    else
        echo "⚠️  Config $config não encontrado: $CONFIG_FILE"
    fi
done

# Substituir PROJECT_ROOT por caminho real
PROJECT_PATH_ESCAPED=$(echo "$PROJECT_PATH" | sed 's/\//\\\//g')
sed "s/\${PROJECT_ROOT}/$PROJECT_PATH_ESCAPED/g" "$TEMP_MCP" > "$PROJECT_CURSOR_DIR/mcp.json"
rm "$TEMP_MCP"

echo "✅ mcp.json criado em $PROJECT_CURSOR_DIR/mcp.json"

# Copiar rules relevantes
echo ""
echo "📚 Copiando rules..."

# Kubernetes rules se kubernetes config foi selecionado
if [[ " ${CONFIGS[@]} " =~ " kubernetes " ]]; then
    mkdir -p "$PROJECT_CURSOR_DIR/rules/kubernetes"
    cp "$REPO_ROOT/rules/kubernetes/"*.md "$PROJECT_CURSOR_DIR/rules/kubernetes/" 2>/dev/null || true
    echo "✅ Copiado rules/kubernetes/"
fi

# ArgoCD rules se gitops config foi selecionado
if [[ " ${CONFIGS[@]} " =~ " gitops " ]]; then
    mkdir -p "$PROJECT_CURSOR_DIR/rules/argocd"
    cp "$REPO_ROOT/rules/argocd/"*.md "$PROJECT_CURSOR_DIR/rules/argocd/" 2>/dev/null || true
    echo "✅ Copiado rules/argocd/"
fi

# Datadog rules se datadog config foi selecionado
if [[ " ${CONFIGS[@]} " =~ " datadog " ]]; then
    mkdir -p "$PROJECT_CURSOR_DIR/rules/datadog"
    cp "$REPO_ROOT/rules/datadog/"*.md "$PROJECT_CURSOR_DIR/rules/datadog/" 2>/dev/null || true
    echo "✅ Copiado rules/datadog/"
    
    # Substituir caminho do script no mcp.json
    REPO_ROOT_ESCAPED=$(echo "$REPO_ROOT" | sed 's/\//\\\//g')
    sed -i "s/\/home\/cianci\/develop\/Git\/Codeia-Tech\/codeia-mcp-servers\/scripts\/datadog-mcp-server.js/${REPO_ROOT_ESCAPED}\/scripts\/datadog-mcp-server.js/g" "$PROJECT_CURSOR_DIR/mcp.json"
fi

# DevOps e SRE sempre disponíveis
mkdir -p "$PROJECT_CURSOR_DIR/rules/devops"
mkdir -p "$PROJECT_CURSOR_DIR/rules/sre"
cp "$REPO_ROOT/rules/devops/"*.md "$PROJECT_CURSOR_DIR/rules/devops/" 2>/dev/null || true
cp "$REPO_ROOT/rules/sre/"*.md "$PROJECT_CURSOR_DIR/rules/sre/" 2>/dev/null || true
echo "✅ Copiado rules/devops/ e rules/sre/"

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "   1. Revise $PROJECT_CURSOR_DIR/mcp.json"
echo "   2. Configure variáveis de ambiente necessárias"
echo "   3. Adicione .cursor/mcp.json ao .gitignore se contiver secrets"
echo "   4. Reinicie o Cursor para aplicar as mudanças"
echo ""

