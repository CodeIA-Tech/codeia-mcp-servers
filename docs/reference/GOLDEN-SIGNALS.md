# 🎯 4 Golden Signals - Guia de Monitoramento

**Versão:** 1.0.0  
**Data:** Novembro 2025  
**Autor:** Equipe SRE - Vertem  
**Baseado em:** Google SRE Book

---

## 📋 Índice

- [1. O que são os 4 Golden Signals](#1-o-que-são-os-4-golden-signals)
- [2. Latency (Latência)](#2-latency-latência)
- [3. Traffic (Tráfego)](#3-traffic-tráfego)
- [4. Errors (Erros)](#4-errors-erros)
- [5. Saturation (Saturação)](#5-saturation-saturação)
- [6. Implementação no Datadog](#6-implementação-no-datadog)
- [7. Planilha de Monitores](#7-planilha-de-monitores)

---

## 1. O que são os 4 Golden Signals

Os **4 Golden Signals** são as métricas fundamentais que você deve monitorar para qualquer sistema, segundo o [Google SRE Book](https://sre.google/sre-book/monitoring-distributed-systems/).

### Por que são importantes?

✅ **Cobertura completa** - Juntos, capturam a saúde do sistema  
✅ **Foco no usuário** - Mostram o que o usuário experimenta  
✅ **Actionable** - Cada alerta indica ação clara  
✅ **Universais** - Aplicam-se a qualquer serviço

---

## 2. Latency (Latência)

### 📊 Definição

**Tempo que leva para servir uma requisição**

Importante distinguir:
- ✅ **Latência de requisições bem-sucedidas**
- ❌ **Latência de requisições com erro** (geralmente rápidas, mas irrelevantes)

### Métricas no Datadog

```
# Latência P95 de API
p95:trace.web.request.duration{env:prod,service:api-gateway}

# Latência P99
p99:trace.web.request.duration{env:prod,service:api-gateway}

# Latência de queries SQL
avg:trace.sql.query.duration{env:prod}

# Response time de endpoints específicos
avg:trace.web.request.duration{env:prod,resource_name:/api/users}
```

### Thresholds Recomendados

| Métrica | Warning | Critical | Prioridade |
|---------|---------|----------|------------|
| **P95 API** | > 1s | > 2s | P2 |
| **P95 API** | > 2s | > 5s | P1 |
| **P99 API** | > 2s | > 10s | P1 |
| **Query SQL** | > 2s | > 5s | P2 |

### Por que monitorar?

- 🎯 **Experiência do usuário** - Latência alta = usuários frustrados
- 💰 **Impacto financeiro** - Timeouts levam a perda de transações
- 🔄 **Indicador antecipado** - Latência aumenta antes de erros aparecerem

---

## 3. Traffic (Tráfego)

### 📊 Definição

**Demanda sendo colocada no sistema**

Mede:
- Requisições por segundo
- Throughput
- Transações por minuto

### Métricas no Datadog

```
# Requisições por minuto
per_minute(sum:trace.web.request.hits{env:prod,service:api-gateway})

# Throughput total
sum:trace.web.request.hits{env:prod} by {service}

# Requests por endpoint
sum:trace.web.request.hits{env:prod} by {resource_name}

# Banda de rede
avg:system.net.bytes_rcvd{env:prod} by {host}
```

### Thresholds Recomendados

| Cenário | Warning | Critical | Prioridade |
|---------|---------|----------|------------|
| **Queda de tráfego** | -50% | -90% | P1 |
| **Pico anormal** | +200% | +500% | P3 |
| **Tráfego zero** | 0 req/min | 0 req/min | P1 |

### Por que monitorar?

- 🚨 **Queda abrupta** - Serviço pode estar down
- 📈 **Pico repentino** - Ataque DDoS ou campanha não planejada
- 📊 **Baseline** - Entender padrões normais de uso

---

## 4. Errors (Erros)

### 📊 Definição

**Taxa de requisições que falham**

Tipos de erros:
- **5xx** - Erros do servidor (críticos)
- **4xx** - Erros do cliente (investigar)
- **Exceções** - Erros de aplicação
- **Timeouts** - Requisições que expiraram

### Métricas no Datadog

```
# Error rate geral
(sum:trace.web.request.errors{env:prod} / sum:trace.web.request.hits{env:prod}) * 100

# Erros 5xx
sum:trace.web.request.errors{env:prod,http.status_code:5*}

# Erros 4xx
sum:trace.web.request.errors{env:prod,http.status_code:4*}

# Exceções Java
sum:jvm.exception.thrown{env:prod,service:tomcat}

# Database errors
sum:postgresql.deadlocks{env:prod}
```

### Thresholds Recomendados

| Tipo de Erro | Warning | Critical | Prioridade |
|--------------|---------|----------|------------|
| **Error rate 5xx** | > 5% | > 10% | P2 |
| **Error rate 5xx** | > 10% | > 25% | P1 |
| **Error rate 4xx** | > 10% | > 20% | P3 |
| **Exceptions** | > 100/min | > 500/min | P2 |
| **Deadlocks** | > 5/min | > 10/min | P2 |

### Por que monitorar?

- 🔴 **Erros 5xx** - Problema do servidor, ação imediata
- 🟡 **Erros 4xx** - Problema de cliente/integração, investigar
- 🎯 **SLO** - Error budget é baseado em error rate

---

## 5. Saturation (Saturação)

### 📊 Definição

**Quão "cheio" está o serviço**

Mede utilização de recursos:
- CPU
- Memória
- Disco
- Network
- Connection pools
- Thread pools

### Métricas no Datadog

```
# CPU
avg:system.cpu.user{env:prod} by {host} * 100

# Memória
avg:system.mem.pct_usable{env:prod} by {host}

# Disco
avg:system.disk.in_use{env:prod} by {host,device} * 100

# Network
avg:system.net.bytes_sent{env:prod}

# Connection pool (database)
(avg:postgresql.connections.used / avg:postgresql.connections.max) * 100

# Thread pool (Tomcat)
(avg:tomcat.threads.busy / avg:tomcat.threads.max) * 100

# JVM Heap
(avg:jvm.heap_memory.used / avg:jvm.heap_memory.max) * 100
```

### Thresholds Recomendados

| Recurso | Warning | Critical | Prioridade |
|---------|---------|----------|------------|
| **CPU** | > 75% | > 85% | P2 |
| **CPU** | > 85% | > 95% | P1 |
| **Memória** | < 20% livre | < 10% livre | P2 |
| **Memória** | < 10% livre | < 5% livre | P1 |
| **Disco** | > 80% | > 90% | P3 |
| **Disco** | > 90% | > 95% | P1 |
| **Conn Pool** | > 80% | > 90% | P2 |
| **Conn Pool** | > 90% | > 95% | P1 |

### Por que monitorar?

- 🔮 **Previsão** - Saturação indica problemas futuros
- ⚡ **Performance** - Recursos saturados = lentidão
- 📈 **Capacity planning** - Quando escalar?

---

## 6. Implementação no Datadog

### Passo a Passo

#### 1. Acessar Monitors

```
Datadog → Monitors → New Monitor
```

#### 2. Escolher Tipo

- **Metric Monitor** - Para CPU, memória, latência, error rate
- **Service Check** - Para healthchecks, SSL, availability
- **Log Monitor** - Para erros em logs, security events
- **SLO** - Para service level objectives

#### 3. Configurar Query

**Exemplo para Error Rate:**
```
avg(last_5m):
  (sum:trace.web.request.errors{env:prod,service:api-gateway} / 
   sum:trace.web.request.hits{env:prod,service:api-gateway}) * 100
```

#### 4. Definir Thresholds

- **Alert threshold (Critical):** Valor que dispara alerta crítico
- **Warning threshold (Warning):** Valor de aviso prévio
- **Recovery threshold:** Valor para resolver automaticamente

#### 5. Configurar Notificações

**Template de mensagem:**
```
{{#is_alert}}
🔴 ALERTA CRÍTICO - {{monitor.name}}

**Prioridade:** P1
**Serviço:** {{service.name}}
**Valor:** {{value}}
**Threshold:** > {{threshold}}

**Ação Imediata:**
1. Verificar logs: https://app.datadoghq.com/logs?query=service:{{service.name}}
2. Ver dashboard: https://app.datadoghq.com/dashboard/xxx
3. Seguir runbook: https://wiki.vertem.com/runbook-{{service.name}}

@oncall-sre @teams-sre-channel
{{/is_alert}}
```

#### 6. Adicionar Tags

```
env:prod
service:api-gateway
golden_signal:latency
severity:critical
team:sre
```

#### 7. Testar

- Click em "Test Notifications"
- Verifique se as notificações chegam
- Ajuste conforme necessário

---

## 7. Planilha de Monitores

### 📄 Arquivo Gerado

**Localização:** `docs/Monitores-Datadog-Golden-Signals.xlsx`

### Abas Disponíveis

#### 1️⃣ Monitores Datadog (Principal)

**Colunas:**
- **Golden Signal** - Qual dos 4 sinais
- **Nome do Monitor** - Nome descritivo
- **Prioridade** - P1 a P5 (conforme doc de priorização)
- **Tipo** - Metric, Service Check, Log, SLO
- **Query Datadog** - Query pronta para usar
- **Threshold Warning** - Limite de aviso
- **Threshold Critical** - Limite crítico
- **Janela de Tempo** - Período de avaliação
- **Descrição** - O que o monitor faz
- **Impacto no Negócio** - Consequências do alerta
- **Ação Imediata** - O que fazer quando alertar
- **SLA Resposta** - Tempo para começar a investigar
- **SLA Resolução** - Tempo para resolver
- **Canais Notificação** - Onde enviar alerta
- **Escalação** - Fluxo de escalação
- **Tags** - Tags do Datadog

**Total:** 26 monitores prontos para uso

#### 2️⃣ Resumo por Prioridade

Resumo dos SLAs e canais por nível de prioridade:
- P1: 11 monitores
- P2: 9 monitores
- P3: 4 monitores
- P4: 2 monitores

#### 3️⃣ 4 Golden Signals

Explicação de cada sinal com:
- Descrição
- Quantidade de monitores
- Exemplos de métricas
- Thresholds típicos

#### 4️⃣ Guia de Implementação

Passo a passo para implementar os monitores no Datadog.

---

## 📊 Monitores por Golden Signal

### 1. Latency (5 monitores)
- API Gateway - Latência P95 Crítica (P1)
- API Gateway - Latência P95 Elevada (P2)
- Database - Query Duration Alta (P2)
- Database - Replication Lag (P3)
- Cache - Hit Rate Baixo (P4)

### 2. Traffic (2 monitores)
- API - Queda Abrupta de Tráfego (P1)
- API - Pico de Tráfego Anormal (P3)

### 3. Errors (8 monitores)
- API - Taxa de Erro Crítica 5xx (P1)
- API - Taxa de Erro Elevada (P2)
- Database - Deadlocks Frequentes (P2)
- API - Taxa de Erro 4xx Elevada (P3)
- Healthcheck - Serviço Down (P1)
- SSL Certificate - Expirando (P4)
- Segurança - Acessos Não Autorizados (P1)
- Backup - Falha de Execução (P2)

### 4. Saturation (10 monitores)
- EC2 - CPU Crítica (P1)
- EC2 - CPU Elevada (P2)
- Memória - Utilização Crítica (P1)
- Disco - Espaço Crítico (P1)
- Disco - Espaço Elevado (P3)
- Database - Connection Pool Saturado (P1)
- JVM - Heap Memory Alta (P2)
- Tomcat - Thread Pool Saturado (P1)
- JVM - GC Pause Time Alto (P2)
- Network - Packet Loss (P2)

### 5. Multiple/SLO (1 monitor)
- SLO - Availability < 99.9% (P1)

---

## 🚀 Como Usar a Planilha

### 1. Abrir Planilha

```bash
# Localização
docs/Monitores-Datadog-Golden-Signals.xlsx
```

### 2. Selecionar Monitor

Escolha um monitor baseado em:
- Golden Signal que quer monitorar
- Prioridade desejada
- Tipo de recurso (API, Database, EC2)

### 3. Copiar Query

Copie a query da coluna **"Query Datadog"** e ajuste:
- `env:prod` → seu ambiente
- `service:api-gateway` → seu serviço
- Thresholds → conforme sua baseline

### 4. Criar no Datadog

1. **Monitors → New Monitor**
2. Cole a query
3. Configure thresholds
4. Adicione notificações
5. Adicione tags
6. Salve

### 5. Testar

- Use "Test Notifications"
- Simule um alerta (se possível)
- Verifique se equipe recebeu

---

## 💡 Boas Práticas

### 1. Evite Alert Fatigue

❌ **Ruim:** Alertar para tudo  
✅ **Bom:** Alertar apenas quando ação é necessária

### 2. Use Percentis (P95, P99)

❌ **Ruim:** `avg:latency` (média esconde outliers)  
✅ **Bom:** `p95:latency` (captura experiência real)

### 3. Contextualize Alertas

❌ **Ruim:** "CPU high"  
✅ **Bom:** "CPU > 90% no motor-porto-tomcat por 15min - Verificar processo Java"

### 4. Use Composite Monitors

Combine múltiplos sinais:
```
(error_rate > 10%) AND (latency > 2s) AND (cpu > 80%)
```

### 5. Defina Recovery Thresholds

Evite flapping:
- **Alert:** > 90%
- **Recovery:** < 80%

### 6. Tag Tudo

```
env:prod
service:api-gateway
team:sre
golden_signal:latency
severity:critical
```

---

## 📚 Exemplos Práticos

### Monitor Completo de Latência

**Nome:** API Gateway - Latência P95 Alta

**Query:**
```
avg(last_15m):p95:trace.web.request.duration{env:prod,service:api-gateway} > 2
```

**Configuração:**
- Warning: 1000ms
- Critical: 2000ms
- Evaluation window: 15 minutos
- No data: Alert after 10 minutes

**Message:**
```
{{#is_alert}}
🟠 ALERTA - API Gateway Lenta

**Latência P95:** {{value}}ms (threshold: {{threshold}}ms)

**Impacto:** Clientes experimentando lentidão

**Ações:**
1. Dashboard: https://app.datadoghq.com/dashboard/api-gateway
2. Verificar endpoints lentos
3. Analisar traces: https://app.datadoghq.com/apm/traces
4. Verificar CPU/memória

@oncall-sre
{{/is_alert}}

{{#is_recovery}}
✅ RECUPERADO - API Gateway voltou ao normal
Latência P95: {{value}}ms
{{/is_recovery}}
```

**Tags:**
```
env:prod
service:api-gateway
golden_signal:latency
severity:high
team:sre
priority:p2
```

---

## 🔗 Recursos Adicionais

### Documentação

- 📖 [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- 📊 [Datadog Monitor Guide](https://docs.datadoghq.com/monitors/)
- 🎯 [SLO Best Practices](https://docs.datadoghq.com/monitors/service_level_objectives/)

### Ferramentas

- 📈 [Planilha de Monitores](./Monitores-Datadog-Golden-Signals.xlsx)
- 📋 [Priorização de Alertas](./PRIORIZACAO-ALERTAS.md)
- 🏗️ [Diagrams de Arquitetura](../diagrams/)

---

## 📝 Checklist de Implementação

- [ ] Revisar planilha de monitores
- [ ] Ajustar thresholds para seu baseline
- [ ] Criar monitores no Datadog
- [ ] Configurar canais de notificação (OnCall, Teams)
- [ ] Adicionar tags padronizadas
- [ ] Testar cada monitor
- [ ] Documentar em runbooks
- [ ] Treinar equipe
- [ ] Revisar mensalmente

---

**Documento mantido por:** Equipe SRE - Vertem  
**Última atualização:** Novembro 2025  
**Próxima revisão:** Fevereiro 2026

---

<p align="center">
  <strong>Vertem - Transformando tecnologia em resultados para seu negócio</strong>
</p>

