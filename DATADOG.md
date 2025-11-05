# Guia de Uso do Datadog MCP Server

Guia completo para usar o servidor MCP do Datadog no Cursor.

## 📋 Pré-requisitos

1. **API Keys do Datadog**:
   - API Key: Acesse [Datadog API Keys](https://app.datadoghq.com/organization-settings/api-keys)
   - App Key: Acesse [Datadog Application Keys](https://app.datadoghq.com/organization-settings/application-keys)

2. **Node.js**: O servidor MCP customizado requer Node.js instalado

3. **Configuração de Credenciais**:

   **Opção A: Variáveis de Ambiente (Local)**
   ```bash
   export DATADOG_API_KEY="sua-api-key"
   export DATADOG_APP_KEY="sua-app-key"
   export DATADOG_SITE="datadoghq.com"  # ou datadoghq.eu, us3.datadoghq.com
   ```

   **Opção B: GitHub Secrets (Recomendado para CI/CD e times)**
   ```bash
   # Usar script de setup automático
   ./scripts/setup-datadog-from-github.sh seu-org/seu-repo
   ```
   
   Veja o guia completo: **[GITHUB-SECRETS.md](GITHUB-SECRETS.md)**

## 🚀 Instalação

### Opção 1: Setup Automático

```bash
cd codeia-mcp-servers
./scripts/setup-project.sh ~/seu-projeto base datadog
```

### Opção 2: Instalação Manual

1. **Copiar configuração**:
   ```bash
   cp mcp/datadog.json ~/.cursor/mcp.json
   # ou fazer merge com outras configs
   ./scripts/merge-configs.sh ~/.cursor/mcp.json mcp/base.json mcp/datadog.json
   ```

2. **Ajustar caminho do script**:
   Edite `~/.cursor/mcp.json` e ajuste o caminho do script:
   ```json
   {
     "mcpServers": {
       "datadog": {
         "command": "node",
         "args": [
           "/caminho/absoluto/para/codeia-mcp-servers/scripts/datadog-mcp-server.js"
         ]
       }
     }
   }
   ```

3. **Configurar variáveis de ambiente** (já configurado no passo 1)

4. **Reiniciar o Cursor**

## 🛠️ Funcionalidades Disponíveis

### 1. Monitores

#### Listar Monitores
```
"Usando o MCP datadog, liste todos os monitores do Datadog"
```

#### Criar Monitor
```
"Usando o MCP datadog, crie um monitor de CPU alto com threshold de 80%"
```

#### Exemplo de Configuração de Monitor
```json
{
  "type": "metric alert",
  "query": "avg(last_5m):avg:system.cpu.user{env:production} > 80",
  "name": "High CPU Usage - Production",
  "message": "CPU usage is above 80% in production. @slack-alerts",
  "tags": ["env:production", "team:backend"],
  "options": {
    "thresholds": {
      "critical": 80,
      "warning": 70
    },
    "renotify_interval": 60
  }
}
```

### 2. Dashboards

#### Listar Dashboards
```
"Usando o MCP datadog, liste todos os dashboards"
```

#### Criar Dashboard
```
"Seguindo as regras do datadog.md, crie um dashboard para monitorar a API service"
```

### 3. Consultas de Métricas

#### Consultar Métricas
```
"Usando o MCP datadog, consulte a métrica de CPU dos últimos 30 minutos"
```

#### Análise de Métricas
```
"Usando o MCP datadog, analise a métrica de error rate e forneça insights"
```

### 4. Eventos

#### Buscar Eventos
```
"Usando o MCP datadog, busque eventos críticos das últimas 2 horas"
```

### 5. Incidentes

#### Listar Incidentes
```
"Usando o MCP datadog, liste todos os incidentes ativos"
```

### 6. Workflows

#### Listar Workflows
```
"Usando o MCP datadog, liste todos os workflows de automação"
```

### 7. Análises e Relatórios

#### Gerar Análise
```
"Seguindo as regras do datadog.md, analise as métricas de disponibilidade e gere um relatório"
```

#### Post-Mortem
```
"Seguindo as regras do datadog.md, gere um post-mortem para o incidente INC-12345"
```

## 🎭 Como Acionar o Agente Datadog

### Nomes para Acionar

Você pode acionar o agente Datadog usando qualquer um destes nomes:

- **"Datadog Specialist"** (recomendado)
- **"Datadog Agent"**
- **"Datadog Expert"**
- **"DD Agent"**
- **"Monitor Specialist"**
- **"Observability Expert"**
- **"Como agente Datadog"**
- **"Seguindo as regras do datadog.md"**

### Padrões de Ativação

#### Padrão 1: Nome Direto
```
"Datadog Specialist, [tarefa]"
```

#### Padrão 2: Contexto Explícito
```
"Como Datadog Agent, [tarefa]"
```

#### Padrão 3: Com MCP
```
"Usando o MCP datadog, Datadog Specialist, [tarefa]"
```

#### Padrão 4: Referência ao System Prompt
```
"Seguindo as regras do datadog.md, [tarefa]"
```

## 📝 Exemplos Práticos

### Exemplo 1: Criar Monitor de Error Rate

```
"Datadog Specialist, crie um monitor que alerte quando a taxa de erro HTTP exceder 1% em produção"
```

ou

```
"Seguindo as regras do datadog.md, crie um monitor que alerte quando a taxa de erro HTTP exceder 1% em produção"
```

O agente irá:
1. Consultar as regras em `rules/datadog/datadog.md`
2. Criar um monitor com configuração apropriada
3. Usar o MCP datadog para criar o monitor via API

### Exemplo 2: Dashboard de Serviço

```
"Datadog Specialist, crie um dashboard completo para o serviço 'api' com:
- Request rate
- Error rate  
- Response time P95
- CPU e Memory usage"
```

### Exemplo 3: Análise e Relatório

```
"Datadog Specialist, analise as métricas de performance da última semana e gere um relatório com:
- Tendências
- Anomalias detectadas
- Recomendações"
```

### Exemplo 4: Post-Mortem Automático

```
"Datadog Specialist, gere um post-mortem para o incidente que ocorreu hoje às 14:00, incluindo:
- Timeline de eventos
- Métricas antes/durante/depois
- Root cause analysis
- Action items"
```

### Exemplo 5: Análise Completa com Múltiplas Ações

```
"Datadog Specialist, realize uma análise completa do serviço 'api':

1. Usando o MCP datadog, consulte as métricas dos últimos 7 dias
2. Analise tendências e identifique anomalias
3. Crie monitores para métricas críticas identificadas
4. Crie um dashboard para visualização
5. Gere um relatório semanal com insights e recomendações"
```

## 🔧 Troubleshooting

### Erro: "DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias"

**Solução**: Configure as variáveis de ambiente:
```bash
export DATADOG_API_KEY="sua-key"
export DATADOG_APP_KEY="sua-app-key"
```

### Erro: "Cannot find module"

**Solução**: Verifique se o caminho do script está correto no `mcp.json`:
```json
{
  "args": [
    "/caminho/absoluto/correto/scripts/datadog-mcp-server.js"
  ]
}
```

### Erro: "Permission denied"

**Solução**: Dê permissão de execução ao script:
```bash
chmod +x scripts/datadog-mcp-server.js
```

### Servidor não aparece no Cursor

**Solução**:
1. Verifique se reiniciou o Cursor após configurar
2. Verifique logs do Cursor
3. Teste o script manualmente:
   ```bash
   export DATADOG_API_KEY="sua-key"
   export DATADOG_APP_KEY="sua-app-key"
   node scripts/datadog-mcp-server.js
   ```

## 📚 Recursos Adicionais

- [Documentação Datadog API](https://docs.datadoghq.com/api/latest/)
- [Datadog Monitor API](https://docs.datadoghq.com/api/latest/monitors/)
- [Datadog Dashboard API](https://docs.datadoghq.com/api/latest/dashboards/)
- [Datadog Events API](https://docs.datadoghq.com/api/latest/events/)
- [Datadog Incident Management](https://docs.datadoghq.com/monitors/incident_management/)

## 💡 Dicas

1. **Use System Prompts**: Sempre mencione "Seguindo as regras do datadog.md" para obter melhores resultados
2. **Queries Específicas**: Seja específico nas queries de métricas
3. **Tags**: Use tags consistentes (env, service, team) para melhor organização
4. **Thresholds**: Configure thresholds apropriados baseados em SLOs
5. **Notificações**: Configure notificações apropriadas para evitar alert fatigue

---

**Precisa de ajuda?** Consulte o arquivo `rules/datadog/datadog.md` para regras detalhadas e exemplos.

