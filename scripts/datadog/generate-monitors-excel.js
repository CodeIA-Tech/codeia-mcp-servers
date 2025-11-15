#!/usr/bin/env node
/**
 * Gerador de Planilha de Monitores Datadog
 * 
 * Gera planilha Excel com exemplos de monitores baseados nos 4 Golden Signals
 * e na priorização de alertas da Vertem
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 4 Golden Signals: Latency, Traffic, Errors, Saturation
const monitorsData = [
  // ============================================
  // GOLDEN SIGNAL 1: LATENCY (Latência)
  // ============================================
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'API Gateway - Latência P95 Crítica',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):p95:trace.web.request.duration{env:prod,service:api-gateway} > 5',
    'Threshold Warning': '2000ms',
    'Threshold Critical': '5000ms',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Alerta quando a latência P95 da API Gateway ultrapassa 5 segundos, indicando degradação severa do serviço',
    'Impacto no Negócio': 'Alto - Clientes experimentando lentidão extrema, possível timeout de requisições',
    'Ação Imediata': 'Verificar CPU/memória, analisar queries lentas, considerar scaling horizontal',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador SRE (15min) → Gerente Infra (30min)',
    'Tags': 'env:prod, service:api-gateway, golden_signal:latency, severity:critical'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'API Gateway - Latência P95 Elevada',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):p95:trace.web.request.duration{env:prod,service:api-gateway} > 2',
    'Threshold Warning': '1000ms',
    'Threshold Critical': '2000ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Latência elevada mas ainda em níveis aceitáveis, requer investigação',
    'Impacto no Negócio': 'Médio - Performance degradada, experiência do usuário comprometida',
    'Ação Imediata': 'Investigar causas, monitorar tendência, preparar ações corretivas',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Coordenador SRE (30min) → Gerente (2h)',
    'Tags': 'env:prod, service:api-gateway, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Database - Query Duration Alta',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:postgresql.queries.query_time{env:prod} by {host} > 5',
    'Threshold Warning': '2000ms',
    'Threshold Critical': '5000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Queries do PostgreSQL demorando mais que 5 segundos em média',
    'Impacto no Negócio': 'Alto - Degradação de performance em todas as aplicações dependentes',
    'Ação Imediata': 'Identificar queries lentas, verificar locks, analisar plano de execução',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → DBA → Coordenador (30min)',
    'Tags': 'env:prod, resource:database, golden_signal:latency, severity:high'
  },

  // ============================================
  // GOLDEN SIGNAL 2: TRAFFIC (Tráfego)
  // ============================================
  {
    'Golden Signal': 'Traffic',
    'Nome do Monitor': 'API - Queda Abrupta de Tráfego',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):per_minute(sum:trace.web.request.hits{env:prod,service:api-gateway}) < 100',
    'Threshold Warning': 'Queda de 50%',
    'Threshold Critical': 'Queda de 90%',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Tráfego da API caiu drasticamente, possível indisponibilidade',
    'Impacto no Negócio': 'Crítico - Serviço possivelmente fora do ar ou inacessível',
    'Ação Imediata': 'Verificar healthcheck, DNS, load balancer, firewall',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (15min) → Gerente (30min) → Diretoria (45min)',
    'Tags': 'env:prod, service:api-gateway, golden_signal:traffic, severity:critical'
  },
  {
    'Golden Signal': 'Traffic',
    'Nome do Monitor': 'API - Pico de Tráfego Anormal',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):per_minute(sum:trace.web.request.hits{env:prod,service:api-gateway}) > 10000',
    'Threshold Warning': '8000 req/min',
    'Threshold Critical': '10000 req/min',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Tráfego anormalmente alto, possível ataque DDoS ou campanha não planejada',
    'Impacto no Negócio': 'Médio - Risco de degradação, pode escalar para P2',
    'Ação Imediata': 'Verificar origem do tráfego, considerar rate limiting, monitorar recursos',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Coordenador (4h)',
    'Tags': 'env:prod, service:api-gateway, golden_signal:traffic, severity:medium'
  },

  // ============================================
  // GOLDEN SIGNAL 3: ERRORS (Erros)
  // ============================================
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'API - Taxa de Erro Crítica (5xx)',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):(sum:trace.web.request.errors{env:prod,service:api-gateway,http.status_code:5*} / sum:trace.web.request.hits{env:prod,service:api-gateway}) * 100 > 25',
    'Threshold Warning': '10%',
    'Threshold Critical': '25%',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Mais de 25% das requisições retornando erros 5xx',
    'Impacto no Negócio': 'Crítico - Maioria dos clientes não conseguindo usar o serviço',
    'Ação Imediata': 'Verificar logs, status de dependências, considerar rollback se deploy recente',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Dev Team → Coordenador (15min) → War Room',
    'Tags': 'env:prod, service:api-gateway, golden_signal:errors, severity:critical'
  },
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'API - Taxa de Erro Elevada',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):(sum:trace.web.request.errors{env:prod,service:api-gateway} / sum:trace.web.request.hits{env:prod,service:api-gateway}) * 100 > 10',
    'Threshold Warning': '5%',
    'Threshold Critical': '10%',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Taxa de erro entre 10-25%, degradação significativa',
    'Impacto no Negócio': 'Alto - Parcela significativa de clientes afetada',
    'Ação Imediata': 'Investigar erros específicos, correlacionar com deploys/mudanças',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (30min) → Gerente (2h)',
    'Tags': 'env:prod, service:api-gateway, golden_signal:errors, severity:high'
  },
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'Database - Deadlocks Frequentes',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):per_minute(sum:postgresql.deadlocks{env:prod}) > 10',
    'Threshold Warning': '5 deadlocks/min',
    'Threshold Critical': '10 deadlocks/min',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Alto número de deadlocks no database, indicando problemas de concorrência',
    'Impacto no Negócio': 'Alto - Transações falhando, dados inconsistentes possíveis',
    'Ação Imediata': 'Identificar queries conflitantes, analisar locks, otimizar transações',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → DBA → Dev Team',
    'Tags': 'env:prod, resource:database, golden_signal:errors, severity:high'
  },

  // ============================================
  // GOLDEN SIGNAL 4: SATURATION (Saturação)
  // ============================================
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'EC2 - CPU Crítica',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:system.cpu.user{env:prod,service:motor-porto-tomcat} by {host} * 100 > 95',
    'Threshold Warning': '85%',
    'Threshold Critical': '95%',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'CPU acima de 95% por 15 minutos, servidor próximo da saturação total',
    'Impacto no Negócio': 'Crítico - Risco de travamento, timeouts, indisponibilidade',
    'Ação Imediata': 'Identificar processo consumindo CPU, kill se necessário, considerar scaling',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (15min) → Gerente (30min)',
    'Tags': 'env:prod, resource:compute, golden_signal:saturation, severity:critical'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'EC2 - CPU Elevada',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_30m):avg:system.cpu.user{env:prod} by {host} * 100 > 85',
    'Threshold Warning': '75%',
    'Threshold Critical': '85%',
    'Janela de Tempo': '30 minutos',
    'Descrição': 'CPU entre 85-95%, requer investigação e possível ação',
    'Impacto no Negócio': 'Alto - Performance degradada, risco de escalar para P1',
    'Ação Imediata': 'Investigar processos, verificar se é pico normal ou problema',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (30min)',
    'Tags': 'env:prod, resource:compute, golden_signal:saturation, severity:high'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Memória - Utilização Crítica',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:system.mem.pct_usable{env:prod} by {host} < 5',
    'Threshold Warning': '15% livre',
    'Threshold Critical': '5% livre',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Menos de 5% de memória disponível, risco de OOM (Out of Memory)',
    'Impacto no Negócio': 'Crítico - Risco de crash da aplicação e perda de dados',
    'Ação Imediata': 'Identificar memory leak, reiniciar serviço se necessário, aumentar memória',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (15min) → Dev Team',
    'Tags': 'env:prod, resource:memory, golden_signal:saturation, severity:critical'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Disco - Espaço Crítico',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):avg:system.disk.in_use{env:prod} by {host,device} * 100 > 95',
    'Threshold Warning': '85%',
    'Threshold Critical': '95%',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Disco acima de 95%, risco de paralisação do serviço',
    'Impacto no Negócio': 'Crítico - Aplicação pode parar de escrever logs, cache, dados',
    'Ação Imediata': 'Limpar logs antigos, mover arquivos, expandir volume imediatamente',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (15min)',
    'Tags': 'env:prod, resource:storage, golden_signal:saturation, severity:critical'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Database - Connection Pool Saturado',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):(avg:postgresql.connections.used{env:prod} / avg:postgresql.connections.max{env:prod}) * 100 > 95',
    'Threshold Warning': '85%',
    'Threshold Critical': '95%',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Pool de conexões do database quase esgotado',
    'Impacto no Negócio': 'Crítico - Novas requisições não conseguem conectar ao DB',
    'Ação Imediata': 'Identificar conexões ociosas, kill se necessário, aumentar pool',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → DBA → Coordenador (15min)',
    'Tags': 'env:prod, resource:database, golden_signal:saturation, severity:critical'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'JVM - Heap Memory Alta',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):(avg:jvm.heap_memory.used{env:prod,service:motor-porto-tomcat} / avg:jvm.heap_memory.max{env:prod,service:motor-porto-tomcat}) * 100 > 85',
    'Threshold Warning': '75%',
    'Threshold Critical': '85%',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Heap memory do Tomcat acima de 85%, risco de OutOfMemory',
    'Impacto no Negócio': 'Alto - Performance degradada, risco de crash',
    'Ação Imediata': 'Analisar heap dump, verificar memory leak, considerar restart',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team → Coordenador',
    'Tags': 'env:prod, service:tomcat, golden_signal:saturation, severity:high'
  },

  // ============================================
  // MONITORES COMPLEMENTARES (P3, P4)
  // ============================================
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Disco - Espaço Elevado',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_30m):avg:system.disk.in_use{env:prod} by {host,device} * 100 > 80',
    'Threshold Warning': '75%',
    'Threshold Critical': '80%',
    'Janela de Tempo': '30 minutos',
    'Descrição': 'Disco entre 80-95%, planejamento de limpeza necessário',
    'Impacto no Negócio': 'Médio - Ainda há espaço, mas requer ação preventiva',
    'Ação Imediata': 'Agendar limpeza de logs, análise de arquivos grandes',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Coordenador (4h)',
    'Tags': 'env:prod, resource:storage, golden_signal:saturation, severity:medium'
  },
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'API - Taxa de Erro 4xx Elevada',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_30m):(sum:trace.web.request.errors{env:prod,http.status_code:4*} / sum:trace.web.request.hits{env:prod}) * 100 > 20',
    'Threshold Warning': '10%',
    'Threshold Critical': '20%',
    'Janela de Tempo': '30 minutos',
    'Descrição': 'Alta taxa de erros 4xx, possível problema de integração ou cliente',
    'Impacto no Negócio': 'Médio - Erros de cliente, pode indicar problema de API contract',
    'Ação Imediata': 'Analisar endpoints específicos, verificar documentação de API, contatar clientes se necessário',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Dev Team → Product',
    'Tags': 'env:prod, service:api-gateway, golden_signal:errors, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Cache - Hit Rate Baixo',
    'Prioridade': 'P4',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_1h):avg:redis.stats.keyspace_hits{env:prod} / (avg:redis.stats.keyspace_hits{env:prod} + avg:redis.stats.keyspace_misses{env:prod}) < 0.7',
    'Threshold Warning': '80%',
    'Threshold Critical': '70%',
    'Janela de Tempo': '1 hora',
    'Descrição': 'Hit rate do Redis abaixo de 70%, cache não efetivo',
    'Impacto no Negócio': 'Baixo - Performance subótima, mas não crítico',
    'Ação Imediata': 'Revisar estratégia de cache, TTLs, warming de cache',
    'SLA Resposta': '1 dia útil',
    'SLA Resolução': '5 dias úteis',
    'Canais Notificação': 'Teams (sem menção)',
    'Escalação': 'Time SRE (daily review)',
    'Tags': 'env:prod, resource:cache, golden_signal:latency, severity:low'
  },
  
  // ============================================
  // LATENCY - MONITORES ADICIONAIS
  // ============================================
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'API - Latência P99 Extrema',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):p99:trace.web.request.duration{env:prod,service:api-gateway} > 10',
    'Threshold Warning': '5000ms',
    'Threshold Critical': '10000ms',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Latência P99 acima de 10 segundos, indicando timeouts para 1% dos usuários',
    'Impacto no Negócio': 'Crítico - Usuários experimentando timeouts, transações falhando',
    'Ação Imediata': 'Identificar endpoints específicos com p99 alto, analisar traces lentos, verificar outliers',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Dev Team → Coordenador',
    'Tags': 'env:prod, service:api-gateway, golden_signal:latency, severity:critical'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'API - Latência por Endpoint Crítico',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):p95:trace.web.request.duration{env:prod,resource_name:/api/payment} by {resource_name} > 3',
    'Threshold Warning': '1500ms',
    'Threshold Critical': '3000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Latência elevada em endpoints críticos (payment, checkout, etc)',
    'Impacto no Negócio': 'Alto - Operações críticas de negócio afetadas',
    'Ação Imediata': 'Analisar trace específico, verificar dependencies downstream, otimizar queries',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team',
    'Tags': 'env:prod, service:api, endpoint:critical, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Database - Write Latency Alta',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:postgresql.bgwriter.write_time{env:prod} by {host} > 1000',
    'Threshold Warning': '500ms',
    'Threshold Critical': '1000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Operações de write no database demorando mais de 1 segundo',
    'Impacto no Negócio': 'Alto - Transações lentas, usuários esperando em operações de save/update',
    'Ação Imediata': 'Verificar I/O do disco, analisar queries de insert/update, verificar locks',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → DBA → Dev Team',
    'Tags': 'env:prod, resource:database, operation:write, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Integração Externa - Latência de API Terceiros',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):p95:trace.http.request.duration{env:prod,http.url:*external-api.com*} > 5',
    'Threshold Warning': '3000ms',
    'Threshold Critical': '5000ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'APIs de terceiros respondendo lentamente, afetando fluxo interno',
    'Impacto no Negócio': 'Médio - Funcionalidades dependentes de terceiros degradadas',
    'Ação Imediata': 'Verificar status da API externa, implementar timeout adequado, considerar circuit breaker',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Integrations Team',
    'Tags': 'env:prod, integration:external, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Tomcat - Request Processing Time',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:tomcat.request_processor.processing_time{env:prod} by {host} > 2000',
    'Threshold Warning': '1000ms',
    'Threshold Critical': '2000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Tempo de processamento de requisições do Tomcat acima de 2 segundos',
    'Impacto no Negócio': 'Alto - Aplicação Tomcat processando requisições lentamente',
    'Ação Imediata': 'Verificar threads, CPU, heap memory, analisar application logs do Tomcat',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team Java',
    'Tags': 'env:prod, service:tomcat, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Load Balancer - Response Time Alto',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:aws.elb.target_response_time.average{env:prod} by {loadbalancer} > 2',
    'Threshold Warning': '1000ms',
    'Threshold Critical': '2000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Targets do load balancer respondendo lentamente',
    'Impacto no Negócio': 'Alto - Todas as requisições passando pelo LB afetadas',
    'Ação Imediata': 'Verificar saúde dos targets, distribuição de carga, considerar adicionar mais instâncias',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Coordenador',
    'Tags': 'env:prod, resource:loadbalancer, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'DNS - Query Resolution Time Alta',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:dns.response_time{env:prod} by {domain} > 500',
    'Threshold Warning': '200ms',
    'Threshold Critical': '500ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Resolução DNS demorando mais de 500ms',
    'Impacto no Negócio': 'Médio - Adiciona latência a todas as requisições, mas não crítico',
    'Ação Imediata': 'Verificar Route53/DNS provider, verificar TTL, considerar DNS caching',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Network Team',
    'Tags': 'env:prod, resource:dns, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Microserviços - Latência de Service-to-Service',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):p95:trace.http.request.duration{env:prod,span.kind:client} by {service,peer.service} > 1',
    'Threshold Warning': '500ms',
    'Threshold Critical': '1000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Comunicação entre microserviços com latência elevada',
    'Impacto no Negócio': 'Alto - Latência se acumula em chamadas em cadeia',
    'Ação Imediata': 'Identificar serviço lento, verificar network latency, considerar circuit breaker',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team → Arquiteto',
    'Tags': 'env:prod, architecture:microservices, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Fila de Mensagens - Processing Lag',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:aws.sqs.approximate_age_of_oldest_message{env:prod} by {queue} > 300',
    'Threshold Warning': '120 segundos',
    'Threshold Critical': '300 segundos',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Mensagens na fila esperando mais de 5 minutos para processamento',
    'Impacto no Negócio': 'Médio - Processamento assíncrono atrasado, notificações lentas',
    'Ação Imediata': 'Verificar consumers, considerar scaling de workers, analisar dead letter queue',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Dev Team',
    'Tags': 'env:prod, resource:queue, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'CDN/CloudFront - Cache Miss Latency',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:aws.cloudfront.origin_latency{env:prod} by {distribution_id} > 2000',
    'Threshold Warning': '1000ms',
    'Threshold Critical': '2000ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Latência do origin no CloudFront elevada (cache miss)',
    'Impacto no Negócio': 'Médio - Assets estáticos sendo servidos lentamente',
    'Ação Imediata': 'Verificar cache hit ratio, otimizar TTL, verificar origin health',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → DevOps',
    'Tags': 'env:prod, resource:cdn, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Database - Lock Wait Time',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:postgresql.locks.waiting{env:prod} by {host} > 100',
    'Threshold Warning': '50 locks',
    'Threshold Critical': '100 locks',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Muitas queries aguardando locks no database',
    'Impacto no Negócio': 'Alto - Transações travadas, timeouts de aplicação',
    'Ação Imediata': 'Identificar queries travadas, analisar pg_locks, considerar kill de long-running queries',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → DBA',
    'Tags': 'env:prod, resource:database, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Tomcat - Servlet Response Time',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:tomcat.servlet.request_time{env:prod,service:motor-porto-tomcat} by {servlet} > 3000',
    'Threshold Warning': '1500ms',
    'Threshold Critical': '3000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Servlets específicos do Tomcat com response time alto',
    'Impacto no Negócio': 'Alto - Funcionalidades específicas lentas',
    'Ação Imediata': 'Identificar servlet lento, analisar código, verificar database queries',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team Java',
    'Tags': 'env:prod, service:tomcat, golden_signal:latency, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'S3 - Upload/Download Latency',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:aws.s3.first_byte_latency{env:prod} by {bucket_name} > 1000',
    'Threshold Warning': '500ms',
    'Threshold Critical': '1000ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Latência de first byte do S3 elevada',
    'Impacto no Negócio': 'Médio - Upload/download de arquivos lento',
    'Ação Imediata': 'Verificar transfer acceleration, região do bucket, tamanho dos objetos',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → DevOps',
    'Tags': 'env:prod, resource:s3, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Background Jobs - Processing Latency',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_20m):avg:worker.job.duration{env:prod,job_type:email_sender} by {job_type} > 60',
    'Threshold Warning': '30 segundos',
    'Threshold Critical': '60 segundos',
    'Janela de Tempo': '20 minutos',
    'Descrição': 'Jobs assíncronos demorando mais que o esperado',
    'Impacto no Negócio': 'Médio - Emails, notificações atrasadas',
    'Ação Imediata': 'Verificar workers disponíveis, analisar jobs específicos, considerar scaling',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Dev Team',
    'Tags': 'env:prod, resource:worker, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'API - Latência por Método HTTP',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):p95:trace.web.request.duration{env:prod,http.method:POST} by {http.method} > 3',
    'Threshold Warning': '2000ms',
    'Threshold Critical': '3000ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Métodos específicos (POST, PUT, DELETE) com latência elevada',
    'Impacto no Negócio': 'Médio - Operações de escrita lentas',
    'Ação Imediata': 'Analisar endpoints de POST/PUT, verificar validações, otimizar writes',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → Dev Team',
    'Tags': 'env:prod, http_method:post, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Database - Index Scan Time',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:postgresql.index_scan_time{env:prod} by {table,index} > 500',
    'Threshold Warning': '200ms',
    'Threshold Critical': '500ms',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Scans de índice demorando muito, possível índice mal configurado',
    'Impacto no Negócio': 'Médio - Queries específicas lentas',
    'Ação Imediata': 'Analisar índices, verificar se precisa reindex, considerar criar novos índices',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → DBA',
    'Tags': 'env:prod, resource:database, golden_signal:latency, severity:medium'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Network - Packet Loss',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:system.net.tcp.retrans_segs{env:prod} by {host} > 1000',
    'Threshold Warning': '500 packets',
    'Threshold Critical': '1000 packets',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Retransmissões TCP elevadas, possível problema de rede',
    'Impacto no Negócio': 'Alto - Latência aumentada, timeouts possíveis',
    'Ação Imediata': 'Verificar conectividade, saturação de rede, problemas de hardware',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Network Team → Coordenador',
    'Tags': 'env:prod, resource:network, golden_signal:saturation, severity:high'
  },

  // ============================================
  // MONITORES ESPECÍFICOS TOMCAT/JVM
  // ============================================
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'Tomcat - Thread Pool Saturado',
    'Prioridade': 'P1',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_5m):(avg:tomcat.threads.busy{env:prod} / avg:tomcat.threads.max{env:prod}) * 100 > 95',
    'Threshold Warning': '85%',
    'Threshold Critical': '95%',
    'Janela de Tempo': '5 minutos',
    'Descrição': 'Thread pool do Tomcat esgotado, novas requisições serão rejeitadas',
    'Impacto no Negócio': 'Crítico - Servidor não consegue processar mais requisições',
    'Ação Imediata': 'Verificar threads travadas, restart se necessário, aumentar pool',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Dev Team → Coordenador',
    'Tags': 'env:prod, service:tomcat, golden_signal:saturation, severity:critical'
  },
  {
    'Golden Signal': 'Saturation',
    'Nome do Monitor': 'JVM - GC Pause Time Alto',
    'Prioridade': 'P2',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_10m):avg:jvm.gc.parnew.time{env:prod,service:motor-porto-tomcat} > 1000',
    'Threshold Warning': '500ms',
    'Threshold Critical': '1000ms',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Garbage Collector pausando aplicação por mais de 1 segundo',
    'Impacto no Negócio': 'Alto - Latência aumentada durante GC, experiência degradada',
    'Ação Imediata': 'Analisar heap, ajustar flags de GC, considerar aumento de memória',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → Dev Team Java',
    'Tags': 'env:prod, service:tomcat, golden_signal:saturation, severity:high'
  },

  // ============================================
  // MONITORES DE DISPONIBILIDADE
  // ============================================
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'Healthcheck - Serviço Down',
    'Prioridade': 'P1',
    'Tipo': 'Service Check',
    'Query Datadog': 'http_check("motor-porto-tomcat").over("env:prod").last(3).count_by_status()',
    'Threshold Warning': '1 falha',
    'Threshold Critical': '3 falhas consecutivas',
    'Janela de Tempo': '3 checks (3 minutos)',
    'Descrição': 'Healthcheck falhando, serviço possivelmente indisponível',
    'Impacto no Negócio': 'Crítico - Serviço fora do ar',
    'Ação Imediata': 'Verificar logs, status do processo, reiniciar se necessário',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador (15min) → War Room',
    'Tags': 'env:prod, check:http, golden_signal:errors, severity:critical'
  },
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'SSL Certificate - Expirando em Breve',
    'Prioridade': 'P4',
    'Tipo': 'Service Check',
    'Query Datadog': 'ssl_check("api.vertem.com").over("*").last(1).days_until_expiration() < 30',
    'Threshold Warning': '60 dias',
    'Threshold Critical': '30 dias',
    'Janela de Tempo': '1 dia',
    'Descrição': 'Certificado SSL expira em menos de 30 dias',
    'Impacto no Negócio': 'Baixo - Tempo suficiente para renovação, mas requer ação',
    'Ação Imediata': 'Agendar renovação do certificado SSL',
    'SLA Resposta': '1 dia útil',
    'SLA Resolução': '5 dias úteis',
    'Canais Notificação': 'Teams (sem menção)',
    'Escalação': 'Time SRE',
    'Tags': 'resource:ssl, golden_signal:errors, severity:low'
  },

  // ============================================
  // MONITORES DE SEGURANÇA
  // ============================================
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'Segurança - Tentativas de Acesso Não Autorizado',
    'Prioridade': 'P1',
    'Tipo': 'Log',
    'Query Datadog': 'logs("status:401 OR status:403").over("env:prod").rollup("count").last("10m") > 1000',
    'Threshold Warning': '500 tentativas',
    'Threshold Critical': '1000 tentativas',
    'Janela de Tempo': '10 minutos',
    'Descrição': 'Alto volume de tentativas de acesso não autorizado, possível ataque',
    'Impacto no Negócio': 'Crítico - Possível breach de segurança, ataque em progresso',
    'Ação Imediata': 'Bloquear IPs suspeitos, ativar WAF, notificar Security Team',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel + Security Team',
    'Escalação': 'Plantonista → Security → CISO → Diretoria',
    'Tags': 'env:prod, security:auth, golden_signal:errors, severity:critical'
  },

  // ============================================
  // MONITORES COMPOSITE (múltiplos sinais)
  // ============================================
  {
    'Golden Signal': 'Multiple',
    'Nome do Monitor': 'SLO - Availability < 99.9%',
    'Prioridade': 'P1',
    'Tipo': 'SLO',
    'Query Datadog': 'slo("api-gateway-availability").over("7d") < 99.9',
    'Threshold Warning': '99.95%',
    'Threshold Critical': '99.9%',
    'Janela de Tempo': '7 dias',
    'Descrição': 'SLO de availability violado, serviço abaixo do acordado',
    'Impacto no Negócio': 'Crítico - Violação de contrato, penalidades financeiras possíveis',
    'Ação Imediata': 'Análise de root cause, plano de ação para recuperar SLO',
    'SLA Resposta': '15 minutos',
    'SLA Resolução': '4 horas (para iniciar recuperação)',
    'Canais Notificação': 'Datadog OnCall (Call+SMS) + Teams @channel',
    'Escalação': 'Plantonista → Coordenador → Gerente → Diretoria',
    'Tags': 'env:prod, slo:availability, golden_signal:multiple, severity:critical'
  },
  {
    'Golden Signal': 'Errors',
    'Nome do Monitor': 'Backup - Falha de Execução',
    'Prioridade': 'P2',
    'Tipo': 'Log',
    'Query Datadog': 'logs("backup AND (failed OR error)").over("env:prod").rollup("count").last("24h") > 0',
    'Threshold Warning': '1 falha',
    'Threshold Critical': '2 falhas consecutivas',
    'Janela de Tempo': '24 horas',
    'Descrição': 'Backup diário falhou, risco de perda de dados',
    'Impacto no Negócio': 'Alto - Sem backup, recovery point objective em risco',
    'Ação Imediata': 'Investigar falha, executar backup manual, corrigir processo',
    'SLA Resposta': '30 minutos',
    'SLA Resolução': '8 horas',
    'Canais Notificação': 'Datadog OnCall + Teams @channel',
    'Escalação': 'Plantonista → DBA → Coordenador',
    'Tags': 'env:prod, process:backup, golden_signal:errors, severity:high'
  },
  {
    'Golden Signal': 'Latency',
    'Nome do Monitor': 'Database - Replication Lag',
    'Prioridade': 'P3',
    'Tipo': 'Metric',
    'Query Datadog': 'avg(last_15m):avg:postgresql.replication.delay{env:prod} > 30',
    'Threshold Warning': '10 segundos',
    'Threshold Critical': '30 segundos',
    'Janela de Tempo': '15 minutos',
    'Descrição': 'Réplica do database atrasada em mais de 30 segundos',
    'Impacto no Negócio': 'Médio - Reads da réplica podem estar desatualizados',
    'Ação Imediata': 'Verificar carga na réplica, network, considerar promote se primário com problema',
    'SLA Resposta': '4 horas',
    'SLA Resolução': '2 dias úteis',
    'Canais Notificação': 'Teams @channel + Email',
    'Escalação': 'Time SRE → DBA',
    'Tags': 'env:prod, resource:database, golden_signal:latency, severity:medium'
  }
];

async function generateExcel() {
  console.log('📊 Gerando planilha de monitores Datadog...\n');
  
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Monitores
  const ws1 = XLSX.utils.json_to_sheet(monitorsData);
  
  // Ajustar largura das colunas
  ws1['!cols'] = [
    { wch: 15 },  // Golden Signal
    { wch: 40 },  // Nome do Monitor
    { wch: 12 },  // Prioridade
    { wch: 15 },  // Tipo
    { wch: 80 },  // Query Datadog
    { wch: 15 },  // Threshold Warning
    { wch: 15 },  // Threshold Critical
    { wch: 15 },  // Janela de Tempo
    { wch: 60 },  // Descrição
    { wch: 60 },  // Impacto no Negócio
    { wch: 60 },  // Ação Imediata
    { wch: 15 },  // SLA Resposta
    { wch: 15 },  // SLA Resolução
    { wch: 40 },  // Canais Notificação
    { wch: 40 },  // Escalação
    { wch: 60 }   // Tags
  ];
  
  XLSX.utils.book_append_sheet(wb, ws1, 'Monitores Datadog');
  
  // Sheet 2: Resumo por Prioridade
  const summaryData = [
    {
      'Prioridade': 'P1 - CRÍTICO',
      'Quantidade': monitorsData.filter(m => m.Prioridade === 'P1').length,
      'SLA Resposta': '15 minutos',
      'SLA Resolução': '4 horas',
      'Disponibilidade': '24x7',
      'Canal': 'Datadog OnCall (Call+SMS) + Teams'
    },
    {
      'Prioridade': 'P2 - ALTO',
      'Quantidade': monitorsData.filter(m => m.Prioridade === 'P2').length,
      'SLA Resposta': '30 minutos',
      'SLA Resolução': '8 horas',
      'Disponibilidade': '24x7',
      'Canal': 'Datadog OnCall + Teams'
    },
    {
      'Prioridade': 'P3 - MÉDIO',
      'Quantidade': monitorsData.filter(m => m.Prioridade === 'P3').length,
      'SLA Resposta': '4 horas',
      'SLA Resolução': '2 dias úteis',
      'Disponibilidade': 'Comercial',
      'Canal': 'Teams + Email'
    },
    {
      'Prioridade': 'P4 - BAIXO',
      'Quantidade': monitorsData.filter(m => m.Prioridade === 'P4').length,
      'SLA Resposta': '1 dia útil',
      'SLA Resolução': '5 dias úteis',
      'Disponibilidade': 'Comercial',
      'Canal': 'Teams (sem menção)'
    }
  ];
  
  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!cols'] = [
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo por Prioridade');
  
  // Sheet 3: Golden Signals
  const goldenSignalsData = [
    {
      'Golden Signal': 'Latency',
      'Descrição': 'Tempo que leva para servir uma requisição',
      'Monitores': monitorsData.filter(m => m['Golden Signal'] === 'Latency').length,
      'Exemplos de Métricas': 'trace.web.request.duration, trace.sql.query.duration, response_time',
      'Thresholds Típicos': 'P95 < 2s (warning), P95 < 5s (critical)'
    },
    {
      'Golden Signal': 'Traffic',
      'Descrição': 'Demanda sendo colocada no sistema',
      'Monitores': monitorsData.filter(m => m['Golden Signal'] === 'Traffic').length,
      'Exemplos de Métricas': 'trace.web.request.hits, requests_per_minute, throughput',
      'Thresholds Típicos': 'Queda de 50% (warning), Queda de 90% (critical)'
    },
    {
      'Golden Signal': 'Errors',
      'Descrição': 'Taxa de requisições que falham',
      'Monitores': monitorsData.filter(m => m['Golden Signal'] === 'Errors').length,
      'Exemplos de Métricas': 'trace.web.request.errors, error_rate, 5xx_count',
      'Thresholds Típicos': 'Error rate > 5% (warning), > 10% (critical)'
    },
    {
      'Golden Signal': 'Saturation',
      'Descrição': 'Quão "cheio" está o serviço',
      'Monitores': monitorsData.filter(m => m['Golden Signal'] === 'Saturation').length,
      'Exemplos de Métricas': 'system.cpu.user, system.mem.pct_usable, disk.in_use, connection_pool',
      'Thresholds Típicos': 'CPU > 85% (warning), > 95% (critical)'
    }
  ];
  
  const ws3 = XLSX.utils.json_to_sheet(goldenSignalsData);
  ws3['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 12 },
    { wch: 60 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(wb, ws3, '4 Golden Signals');
  
  // Sheet 4: Guia de Implementação
  const guideData = [
    {
      'Passo': '1',
      'Ação': 'Escolher Monitor',
      'Detalhes': 'Selecione o monitor apropriado da aba "Monitores Datadog"'
    },
    {
      'Passo': '2',
      'Ação': 'Acessar Datadog',
      'Detalhes': 'Monitors → New Monitor → escolha o tipo (Metric, Service Check, Log)'
    },
    {
      'Passo': '3',
      'Ação': 'Configurar Query',
      'Detalhes': 'Copie a query da planilha e ajuste conforme seu ambiente'
    },
    {
      'Passo': '4',
      'Ação': 'Definir Thresholds',
      'Detalhes': 'Configure Alert e Warning thresholds conforme planilha'
    },
    {
      'Passo': '5',
      'Ação': 'Configurar Notificações',
      'Detalhes': 'Configure canais conforme prioridade (OnCall, Teams, Email)'
    },
    {
      'Passo': '6',
      'Ação': 'Adicionar Tags',
      'Detalhes': 'Copie as tags da planilha para facilitar filtros e agrupamento'
    },
    {
      'Passo': '7',
      'Ação': 'Testar Monitor',
      'Detalhes': 'Force um alerta de teste para validar notificações'
    },
    {
      'Passo': '8',
      'Ação': 'Documentar',
      'Detalhes': 'Adicione o monitor ao runbook e documentação de serviço'
    }
  ];
  
  const ws4 = XLSX.utils.json_to_sheet(guideData);
  ws4['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 80 }
  ];
  XLSX.utils.book_append_sheet(wb, ws4, 'Guia de Implementação');
  
  // Salvar arquivo
  const outputDir = path.join(__dirname, '../docs');
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputFile = path.join(outputDir, 'Monitores-Datadog-Golden-Signals.xlsx');
  XLSX.writeFile(wb, outputFile);
  
  console.log('✅ Planilha gerada com sucesso!');
  console.log(`📄 Arquivo: ${outputFile}\n`);
  
  // Estatísticas
  console.log('📊 Estatísticas:');
  console.log(`   • Total de monitores: ${monitorsData.length}`);
  console.log(`   • P1 (Crítico): ${monitorsData.filter(m => m.Prioridade === 'P1').length}`);
  console.log(`   • P2 (Alto): ${monitorsData.filter(m => m.Prioridade === 'P2').length}`);
  console.log(`   • P3 (Médio): ${monitorsData.filter(m => m.Prioridade === 'P3').length}`);
  console.log(`   • P4 (Baixo): ${monitorsData.filter(m => m.Prioridade === 'P4').length}\n`);
  
  console.log('📊 Por Golden Signal:');
  console.log(`   • Latency: ${monitorsData.filter(m => m['Golden Signal'] === 'Latency').length}`);
  console.log(`   • Traffic: ${monitorsData.filter(m => m['Golden Signal'] === 'Traffic').length}`);
  console.log(`   • Errors: ${monitorsData.filter(m => m['Golden Signal'] === 'Errors').length}`);
  console.log(`   • Saturation: ${monitorsData.filter(m => m['Golden Signal'] === 'Saturation').length}`);
  console.log(`   • Multiple: ${monitorsData.filter(m => m['Golden Signal'] === 'Multiple').length}\n`);
  
  console.log('📋 Abas da planilha:');
  console.log('   1. Monitores Datadog - Lista completa de monitores');
  console.log('   2. Resumo por Prioridade - SLAs e canais');
  console.log('   3. 4 Golden Signals - Explicação dos sinais');
  console.log('   4. Guia de Implementação - Passo a passo\n');
  
  return outputFile;
}

async function main() {
  console.log('🎯 Gerador de Planilha de Monitores Datadog\n');
  console.log('📌 Baseado em:');
  console.log('   • 4 Golden Signals (Google SRE)');
  console.log('   • Priorização de Alertas Vertem');
  console.log('   • Melhores práticas Datadog\n');
  
  try {
    const outputFile = await generateExcel();
    
    console.log('🚀 Próximos passos:');
    console.log('   1. Abrir planilha Excel');
    console.log('   2. Revisar monitores e ajustar thresholds');
    console.log('   3. Implementar monitores no Datadog');
    console.log('   4. Configurar canais de notificação');
    console.log('   5. Testar alertas\n');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

