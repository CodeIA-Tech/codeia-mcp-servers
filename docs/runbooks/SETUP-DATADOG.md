# 🔧 Setup Completo: Integração com Datadog

Guia passo a passo para configurar o acesso ao Datadog.

## 📋 Passo 1: Obter API Keys do Datadog

### 1.1 Acessar o Datadog

1. Acesse: https://app.datadoghq.com (ou seu site específico)
2. Faça login na sua conta

### 1.2 Criar API Key

1. Vá em: **Organization Settings** → **API Keys**
   - Link direto: https://app.datadoghq.com/organization-settings/api-keys
2. Clique em **"New Key"**
3. Configure:
   - **Name**: "Codeia MCP Servers" (ou nome de sua escolha)
   - **Description**: "Integração MCP para Cursor IDE"
4. Clique em **"Create Key"**
5. **IMPORTANTE**: Copie a API Key imediatamente (você não poderá vê-la depois)
   - Formato: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 1.3 Criar Application Key (App Key)

1. Vá em: **Organization Settings** → **Application Keys**
   - Link direto: https://app.datadoghq.com/organization-settings/application-keys
2. Clique em **"New Key"**
3. Configure:
   - **Name**: "Codeia MCP Servers"
   - **Description**: "Integração MCP para Cursor IDE"
4. Clique em **"Create Key"**
5. **IMPORTANTE**: Copie a Application Key imediatamente
   - Formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxxxxx`

### 1.4 Identificar seu Site do Datadog

Verifique qual site você está usando:
- **US1**: `datadoghq.com` (padrão)
- **US3**: `us3.datadoghq.com`
- **EU**: `datadoghq.eu`
- **US5**: `us5.datadoghq.com`

Você pode verificar na URL do seu Datadog: `https://app.datadoghq.com` = US1

## 🔐 Passo 2: Configurar Credenciais

Você tem 3 opções para armazenar as credenciais:

### Opção A: GitHub Secrets (Recomendado para Times)

```bash
# Adicionar ao GitHub Secrets
gh secret set DATADOG_API_KEY --repo CodeIA-Tech/codeia-mcp-servers
gh secret set DATADOG_APP_KEY --repo CodeIA-Tech/codeia-mcp-servers
gh secret set DATADOG_SITE --repo CodeIA-Tech/codeia-mcp-servers  # opcional

# Usar o script de setup
./scripts/setup-datadog-from-github.sh CodeIA-Tech/codeia-mcp-servers
```

### Opção B: Variáveis de Ambiente Locais

```bash
# Adicionar ao ~/.bashrc ou ~/.zshrc
export DATADOG_API_KEY="sua-api-key-aqui"
export DATADOG_APP_KEY="sua-app-key-aqui"
export DATADOG_SITE="datadoghq.com"  # ou seu site específico

# Recarregar
source ~/.bashrc  # ou source ~/.zshrc
```

### Opção C: Arquivo .env (Desenvolvimento)

```bash
# Criar arquivo .env.datadog (não commitar!)
cat > .env.datadog << EOF
DATADOG_API_KEY=sua-api-key-aqui
DATADOG_APP_KEY=sua-app-key-aqui
DATADOG_SITE=datadoghq.com
EOF

# Carregar
source .env.datadog
```

## ✅ Passo 3: Testar Conexão

```bash
# Testar conexão com Datadog
node scripts/test-datadog-connection.js
```

Você deve ver:
```
🔍 Testando conexão com Datadog...
📍 Site: datadoghq.com
🔑 API Key: xxxxxxxx...
✅ Conexão com Datadog estabelecida com sucesso!
```

## 🚀 Passo 4: Configurar MCP Server no Cursor

### 4.1 Configurar Projeto Específico

```bash
# Configurar MCP Datadog no projeto
./scripts/setup-project.sh ~/seu-projeto base datadog
```

### 4.2 Configuração Manual

1. Copiar configuração MCP:
   ```bash
   cp mcp/datadog.json ~/.cursor/mcp.json
   # ou fazer merge
   ./scripts/merge-configs.sh ~/.cursor/mcp.json mcp/base.json mcp/datadog.json
   ```

2. Editar `~/.cursor/mcp.json` e ajustar:
   ```json
   {
     "mcpServers": {
       "datadog": {
         "command": "node",
         "args": [
           "/caminho/absoluto/para/codeia-mcp-servers/scripts/datadog-mcp-server.js"
         ],
         "env": {
           "DATADOG_API_KEY": "${DATADOG_API_KEY}",
           "DATADOG_APP_KEY": "${DATADOG_APP_KEY}",
           "DATADOG_SITE": "${DATADOG_SITE:-datadoghq.com}"
         }
       }
     }
   }
   ```

3. Reiniciar o Cursor

## 🎯 Passo 5: Verificar Instalação

### 5.1 Verificar MCP Server

No terminal do Cursor:
```bash
cursor-agent mcp list
```

Você deve ver o servidor `datadog` listado.

### 5.2 Testar no Cursor

No chat do Cursor, tente:
```
"Datadog Specialist, liste todos os monitores"
```

## 📚 Passo 6: Próximos Passos

Após configurar, você pode:

1. **Criar monitores**:
   ```
   "Datadog Specialist, crie um monitor de CPU alto (>80%) para produção"
   ```

2. **Criar dashboards**:
   ```
   "Datadog Specialist, crie um dashboard para o serviço 'api'"
   ```

3. **Analisar métricas**:
   ```
   "Datadog Specialist, analise error rate dos últimos 7 dias"
   ```

4. **Gerar relatórios**:
   ```
   "Datadog Specialist, gere um relatório semanal de performance"
   ```

## 🔍 Troubleshooting

### Erro: "DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias"

**Solução**: Configure as variáveis de ambiente ou GitHub Secrets

### Erro: "Connection failed: 401"

**Solução**: Verifique se as keys estão corretas e têm permissões apropriadas

### Erro: "Connection failed: 403"

**Solução**: Verifique se o App Key tem permissões administrativas

### MCP Server não aparece

**Solução**: 
1. Verifique se reiniciou o Cursor
2. Verifique se `~/.cursor/mcp.json` existe
3. Verifique logs do Cursor

## 📝 Checklist de Configuração

- [ ] API Key criada no Datadog
- [ ] App Key criada no Datadog
- [ ] Site do Datadog identificado
- [ ] Credenciais configuradas (GitHub Secrets ou variáveis de ambiente)
- [ ] Conexão testada com sucesso
- [ ] MCP server configurado no Cursor
- [ ] Cursor reiniciado
- [ ] Funcionalidade testada no Cursor

---

**Dica**: Guarde suas API keys em um lugar seguro! Você não poderá vê-las novamente no Datadog.

