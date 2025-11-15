#!/bin/bash
# Script para instalar dependências do Filesystem MCP Server

echo "📦 Instalando dependências do Filesystem MCP Server..."

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Por favor, instale o Node.js e npm primeiro."
    exit 1
fi

# Instalar dependências principais
echo "📥 Instalando @modelcontextprotocol/sdk..."
npm install @modelcontextprotocol/sdk

# Instalar bibliotecas para arquivos Office (opcionais)
echo "📥 Instalando bibliotecas para arquivos Office..."

# Para Word (.docx)
echo "  - mammoth (para arquivos .docx)"
npm install mammoth 2>/dev/null || echo "    ⚠️  Falha ao instalar mammoth (opcional)"

# Para Excel (.xlsx, .xls)
echo "  - xlsx (para arquivos .xlsx/.xls)"
npm install xlsx 2>/dev/null || echo "    ⚠️  Falha ao instalar xlsx (opcional)"

# Para PDF
echo "  - pdf-parse (para arquivos .pdf)"
npm install pdf-parse 2>/dev/null || echo "    ⚠️  Falha ao instalar pdf-parse (opcional)"

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📝 Nota: As bibliotecas para arquivos Office são opcionais."
echo "   Se não instaladas, o servidor ainda funcionará para arquivos de texto."
echo ""
echo "🔧 Para configurar o diretório base, edite o arquivo:"
echo "   mcp/filesystem.json"
echo "   e ajuste a variável FILESYSTEM_BASE_PATH"

