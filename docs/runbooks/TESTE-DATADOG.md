# 🧪 Guia de Teste do MCP Server Datadog

## ✅ Verificações Iniciais

### 1. Verificar se o MCP server está listado

No terminal do Cursor, execute:
```bash
cursor-agent mcp list
```

Você deve ver:
- `datadog` (se estiver funcionando)
- `filesystem`
- `git`

### 2. Verificar ferramentas do Datadog

```bash
cursor-agent mcp list-tools datadog
```

Você deve ver ferramentas como:
- `datadog_get_monitors`
- `datadog_create_monitor`
- `datadog_get_dashboards`
- `datadog_query_metrics`
- etc.

## 🧪 Testes no Chat do Cursor

### Teste 1: Listar Monitores

```
Datadog Specialist, liste todos os monitores do Datadog
```

ou

```
Usando o MCP datadog, liste todos os monitores
```

**Resultado esperado**: Lista de monitores configurados no Datadog

### Teste 2: Consultar Métricas

```
Datadog Specialist, consulte a métrica de CPU dos últimos 30 minutos
```

**Resultado esperado**: Dados de métricas do Datadog

### Teste 3: Criar Monitor

```
Datadog Specialist, crie um monitor de CPU alto (>80%) para produção
```

**Resultado esperado**: Monitor criado no Datadog

### Teste 4: Análise

```
Datadog Specialist, analise as métricas de error rate dos últimos 7 dias
```

**Resultado esperado**: Análise com insights das métricas

## 🔍 Troubleshooting

### Erro: "MCP server not found"

**Solução**:
1. Verifique se reiniciou o Cursor
2. Verifique se `.cursor/mcp.json` existe
3. Verifique logs do Cursor

### Erro: "DATADOG_API_KEY não encontrada"

**Solução**:
1. Verifique se o arquivo `.env` existe
2. Verifique se as variáveis estão corretas:
   ```bash
   cat .env | grep DATADOG
   ```

### Erro: "Connection failed"

**Solução**:
1. Teste a conexão manualmente:
   ```bash
   ./scripts/load-env-and-test.sh
   ```
2. Verifique se as API keys estão corretas
3. Verifique se o site do Datadog está correto

### MCP server não aparece na lista

**Solução**:
1. Verifique o caminho do script no `.cursor/mcp.json`
2. Verifique se o wrapper script tem permissão de execução:
   ```bash
   chmod +x scripts/datadog-mcp-wrapper.sh
   ```
3. Verifique logs do Cursor

## 📝 Exemplos de Uso

### Criar Dashboard

```
Datadog Specialist, crie um dashboard completo para o serviço 'api' com:
- Request rate
- Error rate
- Response time P95
- CPU e Memory usage
```

### Gerar Relatório

```
Datadog Specialist, gere um relatório semanal de performance com:
- Tendências
- Anomalias detectadas
- Recomendações
```

### Post-Mortem

```
Datadog Specialist, gere um post-mortem para o incidente que ocorreu hoje às 14:00
```

## ✅ Checklist de Teste

- [ ] MCP server aparece em `cursor-agent mcp list`
- [ ] Ferramentas do Datadog estão disponíveis
- [ ] Consegue listar monitores
- [ ] Consegue consultar métricas
- [ ] Consegue criar monitores (se necessário)
- [ ] Análises funcionam corretamente

---

**Dica**: Se algo não funcionar, verifique os logs do Cursor e tente executar o wrapper script manualmente para ver erros.

