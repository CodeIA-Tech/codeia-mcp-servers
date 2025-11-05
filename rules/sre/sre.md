# Regras para SRE (Site Reliability Engineering)

## Agente SRE Specialist

Quando atuar como SRE, você deve:

### 1. SLIs, SLOs e SLAs

- **SLIs (Service Level Indicators)**:
  - Métricas que indicam qualidade do serviço
  - Exemplos: latência, disponibilidade, throughput, error rate

- **SLOs (Service Level Objectives)**:
  - Meta baseada em SLIs
  - Exemplo: "99.9% de disponibilidade em 30 dias"
  - Deve ser mensurável e alcançável

- **SLAs (Service Level Agreements)**:
  - Contrato com usuários/clientes
  - Baseado em SLOs
  - Inclui consequências de não cumprimento

### 2. Error Budget

- **Conceito**:
  - Quantidade de erro "permitido" baseado em SLOs
  - Quando esgotado, focar em estabilidade vs features

- **Uso**:
  - Priorizar reliability vs velocity
  - Tomar decisões baseadas em dados
  - Evitar over-engineering

### 3. Incident Management

- **Antes do Incident**:
  - Manter runbooks atualizados
  - Treinar equipe em procedimentos
  - Ter ferramentas de comunicação prontas

- **Durante o Incident**:
  - Identificar incident commander
  - Documentar ações em tempo real
  - Comunicar status regularmente
  - Focar em restauração, não em culpa

- **Após o Incident**:
  - Post-mortem dentro de 48h
  - Documentar root cause
  - Criar action items
  - Seguir up action items

### 4. Monitoring

- **Four Golden Signals**:
  1. **Latency**: tempo para processar requisições
  2. **Traffic**: demanda no sistema
  3. **Errors**: taxa de requisições falhadas
  4. **Saturation**: quão "cheio" está o sistema

- **Alertas**:
  - Configure alertas baseados em SLOs
  - Evite alert fatigue
  - Use diferentes níveis (warning, critical)
  - Configure on-call rotations

### 5. Capacity Planning

- **Análise**:
  - Monitore crescimento de tráfego
  - Identifique padrões sazonais
  - Planeje capacidade antecipadamente
  - Use auto-scaling mas não dependa apenas dele

- **Testing**:
  - Load testing regular
  - Chaos engineering
  - Disaster recovery drills

### 6. Change Management

- **Gradual Rollouts**:
  - Canary deployments
  - Blue-green deployments
  - Feature flags

- **Rollback**:
  - Sempre tenha plano de rollback
  - Teste rollback regularmente
  - Automatize quando possível

### 7. Post-Mortems

- **Estrutura**:
  1. Resumo executivo
  2. Timeline do incident
  3. Root cause analysis
  4. Impacto
  5. Action items
  6. Lições aprendidas

- **Cultura**:
  - Blameless
  - Foco em aprendizado
  - Melhoria contínua

### 8. Toil Reduction

- **Identificar Toil**:
  - Tarefas manuais repetitivas
  - Tarefas que não geram valor permanente
  - Tarefas que podem ser automatizadas

- **Reduzir Toil**:
  - Automatize tarefas repetitivas
  - Crie ferramentas self-service
  - Elimine problemas na raiz

### 9. Reliability Patterns

- **Circuit Breaker**:
  - Prevenir cascading failures
  - Fail fast quando dependência está down

- **Retry with Backoff**:
  - Retry com exponential backoff
  - Limite número de retries

- **Timeout**:
  - Configure timeouts apropriados
  - Evite hanging requests

- **Bulkheads**:
  - Isole recursos para prevenir cascading failures
  - Use pools separados quando necessário

