# 🎭 Guia de Agentes Especializados

Este guia explica como acionar e usar agentes especializados com nomes específicos no Cursor.

## 🚀 Como Acionar Agentes

No Cursor, você pode ativar agentes especializados mencionando o contexto ou usando nomes específicos. Os agentes são ativados automaticamente quando você menciona o contexto ou o nome do agente.

## 📋 Agentes Disponíveis

### 1. **Datadog Specialist** / **Datadog Agent**

**Nomes para acionar:**
- "Datadog Specialist"
- "Datadog Agent"
- "Datadog Expert"
- "Como agente Datadog"
- "Seguindo as regras do datadog.md"

**Como acionar:**
```
"Datadog Specialist, crie um monitor de CPU alto para produção"
"Como Datadog Agent, analise as métricas de error rate dos últimos 7 dias"
"Datadog Expert, gere um post-mortem para o incidente de hoje"
```

**Capacidades:**
- Criar e gerenciar monitores
- Criar e gerenciar dashboards
- Análises e insights de métricas
- Gerar relatórios e post-mortems
- Gerenciar workflows e incidentes

### 2. **Kubernetes Specialist** / **K8s Agent**

**Nomes para acionar:**
- "Kubernetes Specialist"
- "K8s Agent"
- "Como agente Kubernetes"
- "Seguindo as regras do kubernetes.md"

**Como acionar:**
```
"Kubernetes Specialist, crie um Deployment seguro para a API"
"K8s Agent, valide este manifest YAML antes de aplicar"
```

### 3. **GitOps Specialist** / **ArgoCD Agent**

**Nomes para acionar:**
- "GitOps Specialist"
- "ArgoCD Agent"
- "Como agente GitOps"
- "Seguindo as regras do argocd.md"

**Como acionar:**
```
"GitOps Specialist, configure uma aplicação ArgoCD para o namespace dev"
"ArgoCD Agent, crie um AppProject com RBAC apropriado"
```

### 4. **SRE Specialist** / **SRE Agent**

**Nomes para acionar:**
- "SRE Specialist"
- "SRE Agent"
- "Como agente SRE"
- "Seguindo as regras do sre.md"

**Como acionar:**
```
"SRE Specialist, analise os SLIs e SLOs deste serviço"
"SRE Agent, gere um relatório de error budget para o último mês"
```

### 5. **DevOps Specialist** / **DevOps Agent**

**Nomes para acionar:**
- "DevOps Specialist"
- "DevOps Agent"
- "Como agente DevOps"
- "Seguindo as regras do devops.md"

**Como acionar:**
```
"DevOps Specialist, crie um pipeline CI/CD para este projeto"
"DevOps Agent, configure monitoring e alerting para este serviço"
```

## 🎯 Padrões de Ativação

### Padrão 1: Nome Direto
```
"[Nome do Agente], [tarefa]"
```
**Exemplo:**
```
"Datadog Specialist, crie um monitor de alta memória"
```

### Padrão 2: Contexto Explícito
```
"Como [Nome do Agente], [tarefa]"
```
**Exemplo:**
```
"Como Datadog Agent, analise esta métrica"
```

### Padrão 3: Referência ao System Prompt
```
"Seguindo as regras do [arquivo].md, [tarefa]"
```
**Exemplo:**
```
"Seguindo as regras do datadog.md, crie um dashboard completo"
```

### Padrão 4: Combinação com MCP
```
"Usando o MCP [servidor], [Nome do Agente], [tarefa]"
```
**Exemplo:**
```
"Usando o MCP datadog, Datadog Specialist, liste todos os monitores"
```

## 📝 Exemplos Práticos por Agente

### Datadog Specialist

#### Criar Monitor
```
"Datadog Specialist, crie um monitor que alerte quando:
- CPU usage > 80% em produção
- Memory usage > 90% em produção
- Error rate > 1% em produção
Configure notificações para @slack-alerts"
```

#### Criar Dashboard
```
"Datadog Specialist, crie um dashboard completo para o serviço 'api' com:
- Request rate (timeseries)
- Error rate (timeseries)
- Response time P95 (timeseries)
- Top endpoints por latência (toplist)
- CPU e Memory por host (heatmap)
Use template variables para ambiente e serviço"
```

#### Análise e Relatório
```
"Datadog Specialist, analise as métricas de performance da última semana e gere um relatório com:
- Tendências identificadas
- Anomalias detectadas
- Comparação com semana anterior
- Recomendações de otimização"
```

#### Post-Mortem
```
"Datadog Specialist, gere um post-mortem completo para o incidente que ocorreu hoje às 14:00, incluindo:
- Timeline detalhada de eventos
- Métricas antes/durante/depois do incidente
- Root cause analysis
- Impacto em SLIs/SLOs
- Action items acionáveis
- Plano de prevenção"
```

### Kubernetes Specialist

```
"Kubernetes Specialist, crie um Deployment seguro com:
- Resource limits apropriados
- Health checks (liveness, readiness, startup)
- Security context com non-root user
- ServiceAccount com permissões mínimas
- PodDisruptionBudget para alta disponibilidade"
```

### GitOps Specialist

```
"GitOps Specialist, configure uma aplicação ArgoCD completa com:
- AppProject com RBAC
- Application manifest com sync policies
- Kustomize overlays para dev/stg/prod
- Health checks e sync waves"
```

### SRE Specialist

```
"SRE Specialist, analise este serviço e defina:
- SLIs apropriados
- SLOs baseados em requisitos de negócio
- Error budget e burn rate
- Alertas baseados em SLOs
- Runbook para incidentes"
```

## 🔧 Configuração Avançada

### Criar Alias Personalizado

Você pode criar aliases personalizados editando o system prompt. Por exemplo, em `rules/datadog/datadog.md`, você pode adicionar:

```markdown
## Aliases do Agente

Este agente também responde a:
- "DD Agent"
- "Monitor Specialist"
- "Observability Expert"
```

### Ativar Múltiplos Agentes

Você pode combinar múltiplos agentes em uma única tarefa:

```
"Datadog Specialist e Kubernetes Specialist, analisem este problema de performance:
1. Datadog: Identifique métricas anômalas
2. Kubernetes: Verifique configurações de recursos e scaling"
```

## 💡 Dicas de Uso

1. **Seja Específico**: Quanto mais específico, melhor o resultado
   ```
   ❌ "Crie um monitor"
   ✅ "Datadog Specialist, crie um monitor de CPU que alerte quando > 80% em produção"
   ```

2. **Use Contexto**: Mencione o contexto quando relevante
   ```
   "Datadog Specialist, seguindo as regras do datadog.md, crie um monitor..."
   ```

3. **Combine com MCP**: Use os servidores MCP quando disponíveis
   ```
   "Usando o MCP datadog, Datadog Specialist, liste monitores críticos"
   ```

4. **Solicite Explicações**: Peça ao agente para explicar suas decisões
   ```
   "Datadog Specialist, explique por que escolheu esses thresholds para o monitor"
   ```

## 🎭 Nomes Personalizados

Se você quiser criar nomes personalizados para seus agentes, edite o arquivo de system prompt correspondente. Por exemplo, em `rules/datadog/datadog.md`:

```markdown
# Regras Específicas para Datadog

## Agente: [Seu Nome Personalizado]

Você é o agente "[Seu Nome Personalizado]", especialista em Datadog...

### Identidade
- Nome: [Seu Nome Personalizado]
- Especialização: Datadog e Observability
- Estilo: [Descreva o estilo de comunicação]
```

Então você pode acionar com:
```
"[Seu Nome Personalizado], crie um monitor..."
```

## 📚 Recursos

- [Datadog Rules](rules/datadog/datadog.md)
- [Kubernetes Rules](rules/kubernetes/kubernetes.md)
- [ArgoCD Rules](rules/argocd/argocd.md)
- [SRE Rules](rules/sre/sre.md)
- [DevOps Rules](rules/devops/devops.md)

---

**Dica**: Guarde este arquivo como referência rápida para acionar os agentes!

