#!/bin/bash
# Script para fazer merge de múltiplas configurações MCP

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Uso: ./merge-configs.sh output.json config1.json config2.json ...
if [ $# -lt 2 ]; then
    echo "Uso: $0 <output.json> <config1.json> [config2.json] ..."
    echo ""
    echo "Exemplo:"
    echo "  $0 merged.json mcp/base.json mcp/kubernetes.json mcp/gitops.json"
    exit 1
fi

OUTPUT_FILE="$1"
shift

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ jq não encontrado. Instale com: sudo apt-get install jq"
    exit 1
fi

# Iniciar com objeto vazio
echo "{}" > "$OUTPUT_FILE"

# Merge de cada arquivo
for config_file in "$@"; do
    if [ -f "$config_file" ]; then
        echo "✅ Merging: $config_file"
        jq -s '.[0] * .[1]' "$OUTPUT_FILE" "$config_file" > "${OUTPUT_FILE}.tmp"
        mv "${OUTPUT_FILE}.tmp" "$OUTPUT_FILE"
    else
        echo "⚠️  Arquivo não encontrado: $config_file"
    fi
done

echo ""
echo "✅ Merge concluído: $OUTPUT_FILE"
echo ""

