# Contexto e Configurações do Projeto

## 🎯 Informações Importantes

Este documento mantém o contexto sobre configurações e workflows do projeto para garantir consistência. **SEMPRE consulte este documento quando trabalhar como Vertem IA Developer.**

## 📋 Configurações do .env

**IMPORTANTE**: Todas as credenciais e configurações estão SEMPRE no arquivo `.env` na raiz do projeto. Todos os scripts e MCP servers leem automaticamente do `.env`.

### Azure DevOps (PRs Automatizados)

```env
# Azure DevOps - Para PRs automatizados
AZURE_DEVOPS_ORG=grupoltm
AZURE_DEVOPS_PAT=seu-personal-access-token
AZURE_DEVOPS_PROJECT=DevSecOps - Kanban
AZURE_DEVOPS_API_VERSION=7.0
```

**Uso**: 
- MCP Server `azure-devops` lê automaticamente do `.env`
- Script `scripts/sre-assessment/create-pull-request.js` também lê do `.env`
- **SEMPRE use o MCP server ou o script, nunca hardcode credenciais**

### Datadog

```env
# Datadog - Para análises e monitores
DATADOG_API_KEY=sua-api-key
DATADOG_APP_KEY=sua-app-key
DATADOG_SITE=datadoghq.com
```

**Uso**: 
- MCP Server `datadog` lê automaticamente do `.env`
- Todos os scripts Datadog leem do `.env` automaticamente
- **SEMPRE use o MCP server para análises, nunca hardcode credenciais**

### WhatsApp (WAHA)

```env
# WhatsApp Cloud API - Para notificações
WHATSAPP_ACCESS_TOKEN=seu-access-token
WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-business-account-id
WHATSAPP_API_VERSION=v19.0
WHATSAPP_API_BASE_URL=https://graph.facebook.com
```

**Uso**: 
- MCP Server `whatsapp` lê automaticamente do `.env`
- **SEMPRE use o MCP server para envio de mensagens**

### Rundeck (Automações)

```env
# Rundeck - Para orquestração e automações
RUNDECK_API_URL=https://rundeck.example.com
RUNDECK_API_TOKEN=seu-token
RUNDECK_API_VERSION=28
```

**Uso**: 
- MCP Server `rundeck` lê automaticamente do `.env`

## 🤖 MCP Servers Disponíveis

### Como Usar MCP Servers

**SEMPRE use os MCP servers quando disponíveis**. Eles já estão configurados e leem automaticamente do `.env`.

### 1. Azure DevOps MCP Server

**Configuração**: `mcp/vertem-ia-assessment.json` ou `mcp/gitops.json`

**Ferramentas disponíveis**:
- `list_projects` - Lista projetos
- `list_repositories` - Lista repositórios
- `list_pipelines` - Lista pipelines
- `get_pipeline_runs` - Consulta execuções de pipeline
- `get_work_item` - Obtém detalhes de Work Item
- `search_work_items` - Busca Work Items via WIQL
- **`create_pull_request`** - **Cria PRs automaticamente** ⭐

**Exemplo de uso via MCP**:
```
Criar um PR do branch feature/add-waha-integration para main no repositório vertem-ia-assessment
```

### 2. Datadog MCP Server

**Configuração**: `mcp/datadog.json`

**Ferramentas disponíveis**:
- Análises de hosts
- Consulta de monitores
- Criação de dashboards
- Análises de métricas
- E muito mais...

**Uso**: Sempre use este MCP server para análises Datadog. Ele lê automaticamente do `.env`.

### 3. WhatsApp MCP Server

**Configuração**: `mcp/messaging.json`

**Ferramentas disponíveis**:
- `whatsapp_send_text` - Envia mensagem de texto
- `whatsapp_send_template` - Envia template aprovado
- `whatsapp_send_interactive` - Envia mensagem interativa
- `whatsapp_list_templates` - Lista templates disponíveis
- `whatsapp_build_incident_message` - Gera mensagem de incidente

**Uso**: Para notificações operacionais e alertas P1.

### 4. Rundeck MCP Server

**Configuração**: `mcp/automation.json`

**Uso**: Para orquestração e automações.

### 5. Outros MCP Servers

- **Filesystem**: Acesso ao sistema de arquivos
- **Git**: Operações Git
- **SQLite**: Acesso ao banco de dados (para Vertem IA Assessment)

## 🔄 Workflow de PR Automatizado

### Via MCP Server (Recomendado)

**Use o MCP server `azure-devops` com a ferramenta `create_pull_request`**:

```
Criar PR do branch feature/add-waha-integration para main no repositório vertem-ia-assessment com título "Add WAHA integration for P1 alerts"
```

O MCP server:
1. Lê configurações do `.env` automaticamente
2. Cria o PR no Azure DevOps
3. Adiciona nota de automação
4. Retorna URL do PR

### Via Script (Alternativa)

**Localização**: `scripts/sre-assessment/create-pull-request.js`

**Como funciona**:
1. Lê configurações do `.env` automaticamente
2. Usa Azure DevOps API
3. Cria PR com nota de automação
4. Commits são feitos com `vertem-ia <vertem-ai@vertem.digital>`

**Uso**:
```bash
node scripts/sre-assessment/create-pull-request.js [source-branch] [target-branch] [title]
```

**Exemplo**:
```bash
node scripts/sre-assessment/create-pull-request.js feature/add-waha-integration main "Add WAHA integration for P1 alerts"
```

### Configuração Git para Commits

Os commits automáticos usam:
- **Usuário**: `vertem-ia`
- **Email**: `vertem-ai@vertem.digital`

Isso é configurado automaticamente pelos scripts.

## 🤖 Agente Vertem IA Developer

### Como Acionar

Mencione um dos nomes:
- "Vertem IA Developer" (recomendado)
- "Vertem IA Assessment Developer"
- "Assessment Developer"
- "Vertem Developer"

### System Prompt

**Localização**: `rules/vertem-ia-assessment/vertem-ia-assessment.md`

Contém todas as regras e padrões do projeto Vertem IA Assessment.

### MCP Servers Configurados para Vertem IA

1. **Filesystem**: Acesso ao projeto Vertem IA Assessment (`/mnt/c/vertem-ia-assessment`)
2. **Git**: Operações Git no repositório
3. **Azure DevOps**: Criar PRs, gerenciar código
4. **SQLite**: Acesso ao banco de dados (`/mnt/c/vertem-ia-assessment/prisma/dev.db`)

**Configuração**: `mcp/vertem-ia-assessment.json`

## 📝 Padrões de Desenvolvimento

### Commits

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `refactor:` - Refatoração
- `style:` - Formatação
- `test:` - Testes
- `chore:` - Configuração/build

### Branching

- **Trunk Based Development**
- Branch `main` protegida (requer PR)
- Branches `feature/*` para desenvolvimento
- Branches `hotfix/*` para correções urgentes

## 🔧 Scripts Importantes

### PR Automatizado
- **MCP Server**: `azure-devops` → `create_pull_request` (RECOMENDADO)
- **Script**: `scripts/sre-assessment/create-pull-request.js` (alternativa)
- Ambos leem `.env` automaticamente

### Datadog
- **MCP Server**: `datadog` (RECOMENDADO)
- Scripts em `scripts/datadog/` também leem `.env` automaticamente
- Usam `DATADOG_API_KEY` e `DATADOG_APP_KEY`

### WhatsApp
- **MCP Server**: `whatsapp` (RECOMENDADO)
- Scripts em `scripts/whatsapp/` também leem `.env` automaticamente

### Utilitários
- `scripts/utils/env-loader.js` - Carrega `.env` automaticamente
- `scripts/utils/datadog-client.js` - Cliente Datadog que lê `.env`

## ✅ Checklist para Manter Contexto

Quando trabalhar neste projeto, **SEMPRE**:

- [ ] **Verificar se `.env` existe e tem as configurações necessárias**
- [ ] **Usar MCP servers quando disponíveis** (eles leem `.env` automaticamente)
- [ ] **Usar scripts que leem `.env` automaticamente** quando MCP não disponível
- [ ] **NUNCA hardcode credenciais** - sempre usar `.env`
- [ ] **Seguir padrões de commits semânticos**
- [ ] **Usar "Vertem IA Developer" quando trabalhar no projeto Vertem**
- [ ] **Criar PRs usando o MCP server `azure-devops`** ou o script automatizado
- [ ] **Manter commits com autor `vertem-ia`**
- [ ] **Usar MCP server `datadog` para análises Datadog**
- [ ] **Usar MCP server `whatsapp` para notificações**

## 🔗 Links Importantes

- **Azure DevOps**: `https://dev.azure.com/grupoltm/DevSecOps%20-%20Kanban`
- **Repositório Vertem IA**: `vertem-ia-assessment`
- **Projeto**: `DevSecOps - Kanban`

## 📚 Documentação Relacionada

- `docs/VERTEM-IA-ASSESSMENT-AGENT.md` - Guia do agente
- `docs/PR-AUTOMATION-SUMMARY.md` - Sobre PRs automáticos
- `rules/vertem-ia-assessment/vertem-ia-assessment.md` - System prompt
- `README.md` - Visão geral do repositório

## 🎯 Princípios Fundamentais

1. **SEMPRE use `.env`** - Nunca hardcode credenciais
2. **SEMPRE use MCP servers quando disponíveis** - Eles já estão configurados
3. **SEMPRE crie PRs via MCP ou script** - Nunca manualmente
4. **SEMPRE mantenha este contexto** - Consulte este documento regularmente

---

**Última atualização**: 2024-12-19
**Mantido por**: Assistente de desenvolvimento (Vertem IA Developer)
