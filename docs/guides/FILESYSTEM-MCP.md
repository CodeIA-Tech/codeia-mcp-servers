# Filesystem MCP Server

MCP Server para acesso a arquivos locais no notebook, com suporte a leitura de arquivos de texto e documentos do pacote Office.

## 📋 Funcionalidades

- ✅ **Listar arquivos e diretórios** - Navegação pela estrutura de arquivos
- ✅ **Ler arquivos de texto** - Suporte a múltiplos formatos (txt, md, json, yaml, xml, html, css, js, ts, py, etc)
- ✅ **Ler documentos Word** (.docx) - Extração de texto usando mammoth
- ✅ **Ler planilhas Excel** (.xlsx, .xls) - Leitura de todas as planilhas usando xlsx
- ✅ **Ler PDFs** - Extração de texto usando pdf-parse
- ✅ **Buscar arquivos** - Busca por nome ou padrão
- ✅ **Informações de arquivos** - Metadados sem ler o conteúdo

## 🚀 Instalação

### 1. Instalar dependências

```bash
cd /home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers
./scripts/install-filesystem-dependencies.sh
```

Ou instalar manualmente:

```bash
npm install @modelcontextprotocol/sdk mammoth xlsx pdf-parse
```

### 2. Configurar MCP no Cursor

Edite o arquivo de configuração do MCP (geralmente em `~/.cursor/mcp.json` ou `.cursor/mcp.json` no projeto):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": [
        "/home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers/scripts/filesystem-mcp-server.js"
      ],
      "env": {
        "FILESYSTEM_BASE_PATH": "/home/cianci"
      }
    }
  }
}
```

**Importante:** Ajuste `FILESYSTEM_BASE_PATH` para o diretório base que você deseja permitir acesso. Por segurança, o servidor só permite acesso a arquivos dentro deste diretório.

### 3. Reiniciar Cursor

Reinicie o Cursor IDE para carregar o novo MCP server.

## 🛠️ Ferramentas Disponíveis

### 1. `list_files`

Lista arquivos e diretórios em um caminho especificado.

**Parâmetros:**
- `path` (opcional): Caminho do diretório. Se não especificado, usa o diretório base.
- `recursive` (opcional): Se `true`, lista recursivamente. Padrão: `false`.
- `extensions` (opcional): Array de extensões para filtrar (ex: `[".txt", ".docx"]`).

**Exemplo:**
```
Liste os arquivos no diretório Documents
```

### 2. `read_file`

Lê o conteúdo de um arquivo.

**Parâmetros:**
- `file_path` (obrigatório): Caminho do arquivo (relativo ao diretório base ou absoluto).
- `max_length` (opcional): Número máximo de caracteres a retornar.

**Exemplo:**
```
Leia o arquivo Documents/relatorio.docx
```

### 3. `read_file_info`

Obtém informações sobre um arquivo sem ler o conteúdo.

**Parâmetros:**
- `file_path` (obrigatório): Caminho do arquivo.

**Exemplo:**
```
Obtenha informações sobre o arquivo Documents/planilha.xlsx
```

### 4. `search_files`

Busca arquivos por nome ou padrão.

**Parâmetros:**
- `pattern` (obrigatório): Padrão de busca (suporta wildcards `*` e `?`).
- `directory` (opcional): Diretório onde buscar. Padrão: diretório base.
- `recursive` (opcional): Se `true`, busca recursivamente. Padrão: `true`.

**Exemplo:**
```
Busque arquivos que contenham "relatorio" no nome
```

## 📝 Formatos Suportados

### Arquivos de Texto
- `.txt` - Texto simples
- `.md` - Markdown
- `.json` - JSON
- `.yaml`, `.yml` - YAML
- `.xml` - XML
- `.html` - HTML
- `.css` - CSS
- `.js`, `.ts` - JavaScript/TypeScript
- `.py` - Python
- `.java` - Java
- `.cpp`, `.c`, `.h` - C/C++
- `.sh`, `.bash`, `.zsh` - Shell scripts
- `.ps1` - PowerShell
- `.bat` - Batch
- `.log` - Logs

### Documentos Office
- `.docx` - Microsoft Word (requer `mammoth`)
- `.xlsx`, `.xls` - Microsoft Excel (requer `xlsx`)
- `.pptx` - Microsoft PowerPoint (informações básicas)

### Outros
- `.pdf` - PDF (requer `pdf-parse`)

## 🔒 Segurança

- O servidor só permite acesso a arquivos dentro do diretório especificado em `FILESYSTEM_BASE_PATH`
- Apenas leitura de arquivos (sem escrita ou modificação)
- Validação de caminhos para prevenir directory traversal

## 💡 Exemplos de Uso

### Listar arquivos em um diretório

```
Liste todos os arquivos .docx no diretório Documents
```

### Ler um documento Word

```
Leia o conteúdo do arquivo Documents/relatorio.docx
```

### Ler uma planilha Excel

```
Leia o conteúdo da planilha Documents/dados.xlsx
```

### Buscar arquivos

```
Busque todos os arquivos que contenham "2024" no nome
```

### Obter informações de arquivo

```
Obtenha informações sobre o arquivo Documents/apresentacao.pptx
```

## ⚠️ Notas

- Bibliotecas para arquivos Office são opcionais. Se não instaladas, o servidor ainda funcionará para arquivos de texto.
- Para arquivos muito grandes, use o parâmetro `max_length` para limitar o tamanho da resposta.
- Arquivos PowerPoint (.pptx) atualmente retornam apenas informações básicas. A leitura completa de conteúdo requer bibliotecas adicionais.

## 🐛 Troubleshooting

### Erro: "mammoth não instalado"
```bash
npm install mammoth
```

### Erro: "xlsx não instalado"
```bash
npm install xlsx
```

### Erro: "pdf-parse não instalado"
```bash
npm install pdf-parse
```

### Erro: "Caminho fora do diretório base permitido"
Verifique se o `FILESYSTEM_BASE_PATH` está configurado corretamente e se o arquivo está dentro deste diretório.

## 📚 Referências

- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [mammoth](https://github.com/mwilliamson/mammoth.js) - Para arquivos Word
- [xlsx](https://github.com/SheetJS/sheetjs) - Para arquivos Excel
- [pdf-parse](https://github.com/mozilla/pdf.js) - Para arquivos PDF

