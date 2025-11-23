# 🤖 Agente Desenvolvedor - Vertem IA Assessment

## 🎯 Visão Geral

Agente especializado para desenvolvimento do projeto **Vertem IA Assessment**, um sistema de avaliação de maturidade SRE/DevOps.

## 🚀 Como Usar o Agente

### Acionar o Agente

Para acionar o agente desenvolvedor, use um dos seguintes nomes:

- **"Vertem IA Developer"** (recomendado)
- **"Vertem IA Assessment Developer"**
- **"Assessment Developer"**
- **"Vertem Developer"**

### Exemplos de Uso

```
"Vertem IA Developer, crie o componente de dashboard principal"
"Assessment Developer, implemente o formulário de assessment"
"Vertem Developer, adicione validação com Zod no formulário"
```

## 🛠️ MCP Servers Configurados

O agente tem acesso aos seguintes MCP servers:

### 1. Filesystem
- **Acesso**: `/mnt/c/vertem-ia-assessment`
- **Uso**: Ler e escrever arquivos do projeto
- **Capacidades**: Criar, editar, ler arquivos do projeto

### 2. Git
- **Repositório**: `/mnt/c/vertem-ia-assessment`
- **Uso**: Operações Git (commits, branches, etc.)
- **Capacidades**: Criar branches, fazer commits, push

### 3. Azure DevOps
- **Integração**: Azure DevOps API
- **Uso**: Criar Pull Requests, gerenciar repositório
- **Capacidades**: Criar PRs, listar branches, gerenciar código

### 4. SQLite Database
- **Banco**: `/mnt/c/vertem-ia-assessment/prisma/dev.db`
- **Uso**: Acesso direto ao banco de dados
- **Capacidades**: Consultar dados, validar estrutura

## 📋 Configuração

### Arquivo de Configuração MCP

**Localização**: `mcp/vertem-ia-assessment.json`

Este arquivo contém todas as configurações dos MCP servers necessários para o desenvolvimento do projeto.

### System Prompt

**Localização**: `rules/vertem-ia-assessment/vertem-ia-assessment.md`

Este arquivo contém todas as regras, padrões e diretrizes para o desenvolvimento do projeto.

## 🔧 Setup do Agente

### Opção 1: Usar Configuração Específica

Adicione ao seu `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vertem-ia-assessment": {
      "command": "node",
      "args": [
        "/home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers/scripts/load-vertem-config.js"
      ]
    }
  }
}
```

### Opção 2: Merge com Configuração Existente

```bash
cd /home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers
./scripts/merge-configs.sh \
  ~/.cursor/mcp.json \
  mcp/base.json \
  mcp/vertem-ia-assessment.json
```

### Opção 3: Copiar Configuração

```bash
cp mcp/vertem-ia-assessment.json ~/.cursor/mcp-vertem-ia.json
```

E adicionar ao `mcp.json` principal.

## 📚 Conhecimento do Agente

O agente conhece:

### Stack Tecnológica
- ✅ Next.js 16 com App Router
- ✅ React 19 + TypeScript
- ✅ Prisma 5 + SQLite
- ✅ React Hook Form + Zod
- ✅ Recharts
- ✅ Shadcn/ui + Tailwind CSS

### Estrutura do Projeto
- ✅ Estrutura de diretórios
- ✅ Convenções de código
- ✅ Padrões de commits
- ✅ Workflow Git

### Domínios de Assessment
- ✅ 8 domínios principais
- ✅ Sistema de scoring (0-5)
- ✅ Níveis de maturidade
- ✅ Estrutura de dados

### Funcionalidades Planejadas
- ✅ Dashboard
- ✅ Formulário de assessment
- ✅ Lista e detalhes
- ✅ Gráficos e visualizações
- ✅ Roadmap

## 🎯 Capacidades do Agente

O agente pode:

1. **Criar Componentes**
   - Componentes React com TypeScript
   - Usando Shadcn/ui
   - Seguindo padrões do projeto

2. **Desenvolver Funcionalidades**
   - Formulários com validação
   - Gráficos com Recharts
   - Páginas Next.js
   - API Routes

3. **Gerenciar Banco de Dados**
   - Criar migrations
   - Ajustar schema Prisma
   - Criar seed data
   - Consultar dados

4. **Operações Git**
   - Criar branches
   - Fazer commits
   - Criar Pull Requests
   - Gerenciar código

5. **Documentação**
   - Criar documentação
   - Atualizar README
   - Comentar código

## 📝 Exemplos de Tarefas

### Criar Componente
```
"Vertem IA Developer, crie um componente RadarChart que recebe dados de domínios e scores e renderiza um gráfico radar usando Recharts"
```

### Desenvolver Funcionalidade
```
"Assessment Developer, implemente a página de dashboard que lista os últimos 5 assessments e mostra um gráfico radar de maturidade"
```

### Criar API Route
```
"Vertem Developer, crie uma API route em app/api/assessments/route.ts que lista todos os assessments com paginação"
```

### Ajustar Schema
```
"Vertem IA Developer, adicione um campo 'notes' ao model Score no schema Prisma"
```

## 🔄 Workflow com o Agente

1. **Solicitar Desenvolvimento**
   - Descreva o que precisa
   - O agente criará os arquivos necessários

2. **Revisar Código**
   - O agente seguirá padrões do projeto
   - Código será bem estruturado

3. **Commits Automáticos**
   - O agente pode fazer commits
   - Seguindo convenções semânticas

4. **Pull Requests**
   - O agente pode criar PRs
   - Com descrição adequada

## ⚠️ Importante

- O agente usa usuário Git: `vertem-ia <vertem-ai@vertem.digital>`
- PRs aparecerão em seu nome (dono do PAT)
- Commits seguem convenções semânticas
- Código segue padrões do projeto

## 📚 Documentação Relacionada

- [System Prompt](rules/vertem-ia-assessment/vertem-ia-assessment.md)
- [Configuração MCP](mcp/vertem-ia-assessment.json)
- [Guia de Desenvolvimento](../../vertem-ia-assessment/docs/DEVELOPMENT-START.md)
- [Roadmap](../../vertem-ia-assessment/docs/DEVELOPMENT-ROADMAP.md)

---

**Status**: Agente configurado e pronto para uso ✅

