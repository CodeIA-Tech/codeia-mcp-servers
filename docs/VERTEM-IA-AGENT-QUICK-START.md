# 🚀 Quick Start - Agente Vertem IA Assessment

## ✅ O que foi criado

1. **System Prompt**: `rules/vertem-ia-assessment/vertem-ia-assessment.md`
   - Regras e diretrizes completas para desenvolvimento
   - Conhecimento do projeto e stack tecnológica
   - Padrões de código e convenções

2. **Configuração MCP**: `mcp/vertem-ia-assessment.json`
   - Filesystem: acesso ao projeto
   - Git: operações Git
   - Azure DevOps: criar PRs e gerenciar código
   - SQLite: acesso ao banco de dados

3. **Script de Setup**: `scripts/vertem-ia-assessment/setup-agent.sh`
   - Configuração automática do agente

4. **Documentação**: `docs/VERTEM-IA-ASSESSMENT-AGENT.md`
   - Guia completo de uso

## 🔧 Configurar o Agente

### Opção 1: Script Automático (Recomendado)

```bash
cd /home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers
./scripts/vertem-ia-assessment/setup-agent.sh
```

Isso irá:
- Criar/atualizar `~/.cursor/mcp.json`
- Copiar rules para `~/.cursor/rules/`
- Configurar todos os MCP servers

### Opção 2: Manual

1. Adicionar ao `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/mnt/c/vertem-ia-assessment"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "/mnt/c/vertem-ia-assessment"]
    },
    "azure-devops": {
      "command": "node",
      "args": ["/home/cianci/develop/Git/Codeia-Tech/codeia-mcp-servers/scripts/azure-devops/azure-devops-mcp-server.js"],
      "env": {
        "AZURE_DEVOPS_ORG": "${AZURE_DEVOPS_ORG}",
        "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}",
        "AZURE_DEVOPS_PROJECT": "${AZURE_DEVOPS_PROJECT}"
      }
    },
    "databases": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sqlite", "/mnt/c/vertem-ia-assessment/prisma/dev.db"]
    }
  }
}
```

2. Copiar rules:
```bash
cp -r rules/vertem-ia-assessment ~/.cursor/rules/
```

3. Reiniciar Cursor IDE

## 🎯 Como Usar o Agente

### Acionar o Agente

Use um dos seguintes nomes:
- **"Vertem IA Developer"** (recomendado)
- **"Vertem IA Assessment Developer"**
- **"Assessment Developer"**
- **"Vertem Developer"**

### Exemplos de Comandos

```
"Vertem IA Developer, crie o componente RadarChart que recebe dados de domínios e scores"
"Assessment Developer, implemente a página de dashboard principal"
"Vertem Developer, crie a API route para listar assessments"
"Vertem IA Developer, adicione validação Zod no formulário de assessment"
```

## 🛠️ Capacidades do Agente

O agente pode:

1. **Criar Componentes React**
   - Com TypeScript
   - Usando Shadcn/ui
   - Seguindo padrões do projeto

2. **Desenvolver Funcionalidades**
   - Formulários com React Hook Form + Zod
   - Gráficos com Recharts
   - Páginas Next.js
   - API Routes

3. **Gerenciar Banco de Dados**
   - Criar migrations Prisma
   - Ajustar schema
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

## 📋 MCP Servers Disponíveis

### Filesystem
- Acesso completo ao projeto
- Criar, editar, ler arquivos
- Caminho: `/mnt/c/vertem-ia-assessment`

### Git
- Operações Git completas
- Criar branches, commits, push
- Repositório: `/mnt/c/vertem-ia-assessment`

### Azure DevOps
- Criar Pull Requests
- Listar branches
- Gerenciar repositório
- Usa credenciais do `.env`

### SQLite Database
- Acesso direto ao banco
- Consultar dados
- Validar estrutura
- Banco: `/mnt/c/vertem-ia-assessment/prisma/dev.db`

## 🔄 Workflow com o Agente

1. **Solicitar Desenvolvimento**
   ```
   "Vertem IA Developer, crie o componente DashboardCard"
   ```

2. **Agente Desenvolve**
   - Cria arquivos necessários
   - Segue padrões do projeto
   - Usa tecnologias corretas

3. **Revisar Código**
   - Código bem estruturado
   - TypeScript tipado
   - Seguindo convenções

4. **Commits Automáticos**
   - Agente pode fazer commits
   - Seguindo convenções semânticas
   - Usuário: `vertem-ia <vertem-ai@vertem.digital>`

5. **Pull Requests**
   - Agente pode criar PRs
   - Com descrição adequada
   - Aguardando sua aprovação

## 📚 Documentação

- **Guia Completo**: `docs/VERTEM-IA-ASSESSMENT-AGENT.md`
- **System Prompt**: `rules/vertem-ia-assessment/vertem-ia-assessment.md`
- **Configuração MCP**: `mcp/vertem-ia-assessment.json`

## ✅ Próximos Passos

1. Execute o script de setup:
   ```bash
   ./scripts/vertem-ia-assessment/setup-agent.sh
   ```

2. Reinicie o Cursor IDE

3. Comece a usar:
   ```
   "Vertem IA Developer, analise o Excel e crie o script de importação completo"
   ```

---

**Status**: Agente configurado e pronto para uso! 🚀

