# Azure DevOps MCP Server

Integração MCP para acessar recursos do Azure DevOps (Repos, Pipelines e Boards) diretamente pelo Cursor.

## ✨ Recursos Disponíveis

- Listar projetos da organização (`list_projects`)
- Listar repositórios Git de um projeto (`list_repositories`)
- Listar pipelines (`list_pipelines`)
- Consultar execuções de um pipeline (`get_pipeline_runs`)
- Obter detalhes de um Work Item (`get_work_item`)
- Executar consultas WIQL e retornar Work Items detalhados (`search_work_items`)

## 🔧 Configuração

Adicione o servidor no arquivo `mcp/gitops.json` (já incluído neste repositório) ou no seu `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "azure-devops": {
      "command": "node",
      "args": [
        "${PROJECT_ROOT}/scripts/azure-devops-mcp-server.js"
      ],
      "env": {
        "AZURE_DEVOPS_ORG": "${AZURE_DEVOPS_ORG}",
        "AZURE_DEVOPS_PROJECT": "${AZURE_DEVOPS_PROJECT}",
        "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}",
        "AZURE_DEVOPS_API_VERSION": "${AZURE_DEVOPS_API_VERSION:-7.0}"
      },
      "description": "Integração com Azure DevOps (Repos, Pipelines, Boards)"
    }
  }
}
```

## 🔐 Variáveis de Ambiente

Configure as variáveis abaixo (exemplo: `~/.bashrc`, `~/.zshrc` ou `.env` do projeto):

```bash
export AZURE_DEVOPS_ORG="sua-organizacao"
export AZURE_DEVOPS_PROJECT="ProjetoPadrao"   # opcional, usado como default
export AZURE_DEVOPS_PAT="seu-personal-access-token"
export AZURE_DEVOPS_API_VERSION="7.0"         # opcional
```

> ⚠️ **Importante**: O Personal Access Token (PAT) deve ter escopos de leitura para **Code**, **Pipelines** e **Work Items**. Nunca commite o PAT no repositório.

## 🛠️ Ferramentas e Exemplos

No Cursor, após ativar o servidor, use as ferramentas conforme exemplos:

```text
MCP azure-devops list_projects
MCP azure-devops list_repositories {"project": "ProjetoAPI"}
MCP azure-devops list_pipelines {"project": "ProjetoAPI"}
MCP azure-devops get_pipeline_runs {"pipelineId": 42}
MCP azure-devops get_work_item {"workItemId": 12345}
MCP azure-devops search_work_items {
  "project": "ProjetoAPI",
  "wiql": "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.TeamProject] = 'ProjetoAPI' AND [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed'",
  "fields": ["System.Id", "System.Title", "System.State", "System.AssignedTo"],
  "top": 10
}
```

## 🧪 Validação

1. Gere um token em **Azure DevOps > User Settings > Personal access tokens**.
2. Exporte as variáveis de ambiente conforme acima.
3. No Cursor, execute `cursor-agent mcp list-tools azure-devops` para confirmar as ferramentas disponíveis.
4. Faça chamadas de teste (ex.: `list_projects`) e valide o resultado.

## 🧯 Troubleshooting

| Sintoma | Possível causa | Ação sugerida |
| --- | --- | --- |
| `Variável AZURE_DEVOPS_ORG não configurada` | Variáveis de ambiente não exportadas | Verifique export no shell / `.env` |
| `Azure DevOps retornou erro: Access denied` | PAT sem escopo ou expirado | Gere novo PAT com escopos adequados |
| `Projeto Azure DevOps não informado` | Nenhum projeto default definido e parâmetro ausente | Configure `AZURE_DEVOPS_PROJECT` ou informe `{"project": "nome"}` |
| `Erro ao parsear resposta` | API retornou HTML ou texto simples | Verifique conectividade e URL da organização |

---

**Manutenção**: atualize `AZURE_DEVOPS_API_VERSION` quando novas versões estáveis forem lançadas. Testado com API `7.0`.


