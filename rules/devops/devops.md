# Regras Gerais para DevOps

## Agente DevOps Specialist

Diretrizes gerais para operações DevOps:

### 1. Infraestrutura como Código (IaC)

- **Versionamento**:
  - Todo código de infraestrutura deve estar versionado
  - Use commits semânticos: `feat:`, `fix:`, `chore:`
  - Documente mudanças em CHANGELOG

- **Validação**:
  - Sempre valide antes de aplicar
  - Use linters específicos (yaml-lint, terraform validate, etc.)
  - Teste em ambiente de desenvolvimento primeiro

### 2. CI/CD

- **Pipelines**:
  - Fail fast: detecte erros o mais cedo possível
  - Use caches para acelerar builds
  - Paralelize tarefas quando possível
  - Configure timeouts apropriados

- **Segurança**:
  - Nunca commite secrets
  - Use secrets management (Vault, AWS Secrets Manager, etc.)
  - Rotacione credenciais regularmente
  - Use least privilege principle

### 3. Monitoring e Observability

- **Métricas**:
  - Configure métricas de negócio e técnicas
  - Use SLIs, SLOs e SLAs
  - Configure alertas baseados em SLOs

- **Logging**:
  - Use structured logging (JSON)
  - Configure log aggregation (ELK, Loki, etc.)
  - Retenha logs conforme compliance

- **Tracing**:
  - Use distributed tracing para sistemas complexos
  - Configure sampling apropriado
  - Monitore latência e erros

### 4. Backup e Disaster Recovery

- **Backups**:
  - Automatize backups regulares
  - Teste restauração periodicamente
  - Armazene backups em locais diferentes
  - Documente procedimentos de restore

- **DR Plan**:
  - Documente RTO (Recovery Time Objective)
  - Documente RPO (Recovery Point Objective)
  - Teste planos de DR regularmente
  - Mantenha runbooks atualizados

### 5. Segurança

- **Princípios**:
  - Defense in depth
  - Least privilege
  - Zero trust
  - Security by design

- **Práticas**:
  - Scan de vulnerabilidades em imagens
  - Use image signing
  - Configure network policies
  - Use secrets management
  - Rotacione credenciais regularmente

### 6. Documentação

- **Runbooks**:
  - Documente procedimentos operacionais
  - Inclua troubleshooting steps
  - Mantenha atualizado

- **Arquitetura**:
  - Documente decisões arquiteturais (ADRs)
  - Mantenha diagramas atualizados
  - Documente dependências

### 7. Performance

- **Otimização**:
  - Profile antes de otimizar
  - Use caching estrategicamente
  - Configure auto-scaling apropriado
  - Monitore resource usage

- **Capacity Planning**:
  - Monitore crescimento
  - Planeje capacidade antecipadamente
  - Use load testing regularmente

