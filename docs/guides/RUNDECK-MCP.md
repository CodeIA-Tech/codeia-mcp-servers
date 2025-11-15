# MCP Rundeck

Integração com a API do Rundeck para listar projetos, jobs, execuções e acionar automações diretamente pelo Cursor IDE.

## ✅ Pré-requisitos

- Token de API válido configurado no arquivo `.env` como `RUNDECK_API_TOKEN`
- Endpoint base do Rundeck configurado como `RUNDECK_API_URL` (ex.: `https://rundeck.example.com`)
- Opcional: `RUNDECK_API_VERSION` (padrão: `28`)

Após preencher as variáveis no `.env`, reinicie o Cursor para propagar os valores.

## ⚙️ Configuração

Adicione `mcp/automation.json` à configuração do projeto ou ao arquivo global `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rundeck": {
      "command": "node",
      "args": [
        "${REPO_ROOT}/scripts/rundeck-mcp-server.js"
      ],
      "env": {
        "RUNDECK_API_URL": "${RUNDECK_API_URL}",
        "RUNDECK_API_TOKEN": "${RUNDECK_API_TOKEN}",
        "RUNDECK_API_VERSION": "${RUNDECK_API_VERSION:-28}"
      }
    }
  }
}
```

## 🧰 Ferramentas Disponíveis

| Ferramenta | Descrição | Argumentos |
|------------|-----------|------------|
| `list_projects` | Lista todos os projetos disponíveis no Rundeck | — |
| `list_jobs` | Lista jobs de um projeto específico | `project` (obrigatório), `jobFilter`, `groupPath` |
| `get_job_details` | Retorna os metadados completos de um job pelo ID | `jobId` (obrigatório) |
| `get_job_executions` | Lista execuções de um job | `jobId` (obrigatório), `max`, `status` |
| `run_job` | Dispara a execução de um job | `jobId` (obrigatório), `argString`, `asUser`, `logLevel`, `options` |

> ℹ️ O campo `status` pode ser `running`, `succeeded`, `failed`, `aborted` ou `scheduled`.

## 🚀 Exemplos de Uso

### Listar projetos

```
Usando o servidor MCP Rundeck, execute a ferramenta list_projects.
```

### Listar jobs de um projeto

```
Chame a ferramenta list_jobs do MCP Rundeck com:
{
  "project": "Porto-Operacoes",
  "jobFilter": "deploy",
  "groupPath": "prod"
}
```

### Obter execuções recentes

```
No MCP Rundeck, execute get_job_executions com:
{
  "jobId": "ed51b5e2-1234-4f66-b8f8-0c57c35f7a11",
  "max": 10,
  "status": "failed"
}
```

### Disparar um job com parâmetros

```
No servidor Rundeck, chame run_job com:
{
  "jobId": "ed51b5e2-1234-4f66-b8f8-0c57c35f7a11",
  "options": {
    "environment": "prod",
    "version": "2025.11.12"
  }
}
```

## 🔒 Boas Práticas

- Tokens nunca devem ser versionados. Utilize variáveis de ambiente no `.env` e mantenha o arquivo fora do controle de versão.
- Utilize `options` para enviar parâmetros nomeados para o job, mantendo consistência com as opções definidas no Rundeck.
- Verifique o `RUNDECK_API_VERSION` compatível com seu ambiente (ex.: 28, 44, 47). Versões diferentes podem alterar campos retornados.

## 🧪 Dicas de Teste

- Valide o acesso executando `list_projects`.
- Faça um dry-run com `get_job_details` antes de disparar um job crítico.
- Use `get_job_executions` para auditar falhas recentes após uma automação.

