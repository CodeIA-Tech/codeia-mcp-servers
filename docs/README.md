# 📚 Documentação - Codeia MCP Servers

Este diretório concentra toda a documentação do projeto, organizada por contexto e propósito.

## 📁 Estrutura

```
docs/
├── guides/          # Guias passo a passo e tutoriais
├── reference/       # Materiais de consulta e referência
├── runbooks/        # Procedimentos operacionais
└── assets/          # Arquivos auxiliares (planilhas, imagens, etc.)
```

---

## 🚀 Guias (Guides)

Guias passo a passo para configurar integrações, usar ferramentas e operar sistemas.

### Integrações MCP

- **[AZURE-DEVOPS-MCP.md](guides/AZURE-DEVOPS-MCP.md)** - Integração com Azure DevOps (Repos, Pipelines, Boards)
- **[DATADOG-MCP.md](guides/DATADOG-MCP.md)** - Integração com Datadog (monitores, dashboards, análises)
- **[FILESYSTEM-MCP.md](guides/FILESYSTEM-MCP.md)** - Acesso ao sistema de arquivos local
- **[RUNDECK-MCP.md](guides/RUNDECK-MCP.md)** - Integração com Rundeck (automações e orquestração)

### Autenticação e Configuração

- **[GH-AUTH-GUIDE.md](guides/GH-AUTH-GUIDE.md)** - Guia de autenticação no GitHub
- **[GITHUB-TOKEN-SETUP.md](guides/GITHUB-TOKEN-SETUP.md)** - Configuração de tokens do GitHub
- **[QUICKSTART.md](guides/QUICKSTART.md)** - Guia rápido de início
- **[QUICKSTART-AGENTES.md](guides/QUICKSTART-AGENTES.md)** - Guia rápido para usar agentes especializados

### Ferramentas e Relatórios

- **[DIAGRAMS.md](guides/DIAGRAMS.md)** - Gerador de diagramas de arquitetura
- **[REPORT-GENERATOR.md](guides/REPORT-GENERATOR.md)** - Sistema de geração de relatórios HTML

---

## 📖 Referência (Reference)

Materiais de consulta rápida, templates, glossários e documentação técnica.

### Agentes e Especialistas

- **[AGENTES.md](reference/AGENTES.md)** - Guia completo de agentes especializados e como acioná-los

### Templates e Padrões

- **[TEMPLATES.md](reference/TEMPLATES.md)** - Guia de templates de relatórios disponíveis
- **[TEMPLATES-OVERVIEW.md](reference/TEMPLATES-OVERVIEW.md)** - Visão geral do sistema de templates

### Conceitos e Glossários

- **[GOLDEN-SIGNALS.md](reference/GOLDEN-SIGNALS.md)** - Documentação sobre Golden Signals (Latency, Traffic, Errors, Saturation)
- **[DRAWIO-ICONS.md](reference/DRAWIO-ICONS.md)** - Ícones disponíveis para diagramas draw.io

### Configuração

- **[GITHUB-SECRETS.md](reference/GITHUB-SECRETS.md)** - Referência sobre GitHub Secrets

---

## 🔧 Runbooks

Procedimentos operacionais, planos de resposta e processos padronizados.

- **[PRIORIZACAO-ALERTAS.md](runbooks/PRIORIZACAO-ALERTAS.md)** - Matriz de priorização de alertas (P1-P5)
- **[INSTRUMENTACAO-DATADOG.md](runbooks/INSTRUMENTACAO-DATADOG.md)** - Procedimento de instrumentação com Datadog APM
- **[SETUP-DATADOG.md](runbooks/SETUP-DATADOG.md)** - Setup inicial do Datadog
- **[TESTE-DATADOG.md](runbooks/TESTE-DATADOG.md)** - Procedimentos de teste do Datadog
- **[VERIFICAR-MCP.md](runbooks/VERIFICAR-MCP.md)** - Verificação e troubleshooting de servidores MCP
- **[RUNBOOK-API-GATEWAY.md](runbooks/RUNBOOK-API-GATEWAY.md)** - Runbook para API Gateway
- **[SOP-DEPLOY-PRODUCAO.md](runbooks/SOP-DEPLOY-PRODUCAO.md)** - Procedimento padrão de deploy em produção

---

## 🎯 Como Usar Esta Documentação

### Para Começar

1. **Novo no projeto?** → Comece com [QUICKSTART.md](guides/QUICKSTART.md)
2. **Quer usar agentes?** → Leia [QUICKSTART-AGENTES.md](guides/QUICKSTART-AGENTES.md) e [AGENTES.md](reference/AGENTES.md)
3. **Precisa configurar uma integração?** → Consulte os guias em `guides/`

### Para Operações

1. **Procedimento operacional?** → Consulte `runbooks/`
2. **Precisa de uma referência rápida?** → Veja `reference/`
3. **Troubleshooting?** → Comece com [VERIFICAR-MCP.md](runbooks/VERIFICAR-MCP.md)

### Para Desenvolvimento

1. **Criar um relatório?** → Veja [REPORT-GENERATOR.md](guides/REPORT-GENERATOR.md)
2. **Gerar diagramas?** → Consulte [DIAGRAMS.md](guides/DIAGRAMS.md)
3. **Usar templates?** → Leia [TEMPLATES.md](reference/TEMPLATES.md)

---

## 📝 Convenções

- **Variáveis de ambiente**: Todos os guias referenciam variáveis do arquivo `.env` na raiz do projeto
- **Scripts**: Scripts estão organizados em `scripts/` por funcionalidade (datadog, azure-devops, rundeck, etc.)
- **Exemplos**: Exemplos práticos estão incluídos em cada guia
- **Links**: Links internos usam caminhos relativos; links externos são claramente marcados

---

## 🔄 Manutenção

Esta documentação é mantida junto com o código. Ao adicionar novas funcionalidades:

1. **Novo MCP Server?** → Crie um guia em `guides/`
2. **Novo procedimento?** → Adicione em `runbooks/`
3. **Nova referência?** → Inclua em `reference/`
4. **Atualize este índice** quando adicionar novos documentos

---

## 📚 Documentação Externa

- [Cursor IDE Documentation](https://cursor.sh/docs)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [Datadog API Documentation](https://docs.datadoghq.com/api/)
- [Azure DevOps REST API](https://learn.microsoft.com/en-us/rest/api/azure/devops)
