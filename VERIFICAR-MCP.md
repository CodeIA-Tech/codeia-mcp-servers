# 🔍 Como Verificar se o MCP Server está Funcionando

## ⚠️ Sobre o comando `cursor-agent`

O comando `cursor-agent` pode não estar disponível no terminal do sistema. Ele geralmente funciona:

1. **No terminal integrado do Cursor** (dentro do editor)
2. **Via interface do Cursor** (painel de configurações)
3. **Ou pode não estar instalado/atualizado**

## ✅ Formas de Verificar

### Método 1: Interface do Cursor

1. Abra o Cursor
2. Vá em **Settings** → **Features** → **Model Context Protocol**
3. Verifique se os servidores aparecem listados

### Método 2: Testar Diretamente no Chat

No chat do Cursor, tente:

```
Datadog Specialist, liste todos os monitores do Datadog
```

Se o MCP server estiver funcionando, você verá:
- O agente tentando usar o MCP server
- Resposta com dados do Datadog
- Ou mensagem indicando que está usando o MCP

### Método 3: Verificar Arquivo de Configuração

```bash
# Verificar se o arquivo existe
cat .cursor/mcp.json

# Verificar se o wrapper script existe
ls -lh scripts/datadog-mcp-wrapper.sh

# Testar o wrapper script manualmente
bash scripts/datadog-mcp-wrapper.sh <<< '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

### Método 4: Verificar Logs do Cursor

O Cursor geralmente mantém logs em:
- **Linux**: `~/.config/Cursor/logs/`
- **macOS**: `~/Library/Application Support/Cursor/logs/`
- **Windows**: `%APPDATA%\Cursor\logs\`

Procure por mensagens relacionadas a MCP ou datadog.

## 🧪 Teste Rápido

### Teste 1: Verificar se o servidor responde

```bash
# No terminal do projeto
cd /home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers
source .env
bash scripts/datadog-mcp-wrapper.sh <<< '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```

**Resultado esperado**: JSON com informações do servidor MCP

### Teste 2: Testar no Chat do Cursor

Abra o chat no Cursor e digite:

```
Datadog Specialist, liste todos os monitores
```

Se funcionar, você verá os monitores do Datadog listados.

## 🔧 Troubleshooting

### Se o MCP não aparecer

1. **Verifique se reiniciou o Cursor completamente**
   - Feche todas as janelas
   - Reabra o Cursor

2. **Verifique o caminho do arquivo**
   - O arquivo deve estar em `.cursor/mcp.json` na raiz do workspace
   - O caminho no arquivo deve ser absoluto

3. **Verifique permissões**
   ```bash
   chmod +x scripts/datadog-mcp-wrapper.sh
   chmod +x scripts/datadog-mcp-server.js
   ```

4. **Teste o wrapper manualmente**
   ```bash
   bash scripts/datadog-mcp-wrapper.sh
   ```

### Se aparecer erro de conexão

1. Verifique se o `.env` está configurado:
   ```bash
   cat .env | grep DATADOG
   ```

2. Teste a conexão:
   ```bash
   ./scripts/load-env-and-test.sh
   ```

## 📝 Próximos Passos

1. **Teste no chat do Cursor** (mais confiável):
   - Abra o chat
   - Digite: `Datadog Specialist, liste todos os monitores`

2. **Se funcionar**: Continue testando outras funcionalidades

3. **Se não funcionar**: 
   - Verifique os logs do Cursor
   - Tente reiniciar o Cursor novamente
   - Verifique se a versão do Cursor suporta MCP servers customizados

---

**Dica**: A forma mais confiável de testar é usar o chat do Cursor diretamente!

