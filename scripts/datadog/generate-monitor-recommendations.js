#!/usr/bin/env node
/**
 * Gera recomendações de novos monitores para o serviço motor-porto-tomcat
 * Baseado nos 4 sinais de ouro e SRE best practices
 * 
 * Uso: node scripts/datadog/generate-monitor-recommendations.js
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Define os monitores recomendados baseados nos 4 sinais de ouro e SRE
 */
function generateMonitorRecommendations() {
  const recommendations = [];

  // ========== ERROR - Sinais de Ouro ==========
  
  // Error Rate Total (5xx)
  recommendations.push({
    titulo: '[PORTO] [P1] Taxa de erro 5xx crítica - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: 'sum(last_5m):sum:trace.servlet.request.errors{service:motor-porto-tomcat,env:prd,http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count()) * 100 > 25',
    thresholds: {
      critical: 25,
      critical_recovery: 5,
      warning: 10,
      warning_recovery: 3
    },
    window: 'last_5m',
    descricao: 'Monitora taxa de erro 5xx acima de 25% (P1) conforme documentação SRE',
    categoria: 'error-rate',
    justificativa: 'Crítico para detectar indisponibilidade do serviço',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p1'
  });

  // Error Rate Moderado (5xx)
  recommendations.push({
    titulo: '[PORTO] [P2] Taxa de erro 5xx elevada - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_10m):sum:trace.servlet.request.errors{service:motor-porto-tomcat,env:prd,http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count()) * 100 > 10',
    thresholds: {
      critical: 10,
      critical_recovery: 5,
      warning: 5,
      warning_recovery: 2
    },
    window: 'last_10m',
    descricao: 'Monitora taxa de erro 5xx entre 10-25% (P2) - degradação significativa',
    categoria: 'error-rate',
    justificativa: 'Detecta degradação antes de se tornar crítica',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p2'
  });

  // Error Rate Baixo (5xx)
  recommendations.push({
    titulo: '[PORTO] [P3] Taxa de erro 5xx moderada - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: 'sum(last_15m):sum:trace.servlet.request.errors{service:motor-porto-tomcat,env:prd,http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count()) * 100 > 5',
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 3,
      warning_recovery: 1
    },
    window: 'last_15m',
    descricao: 'Monitora taxa de erro 5xx entre 5-10% (P3) - atenção preventiva',
    categoria: 'error-rate',
    justificativa: 'Detecta tendências antes de degradação significativa',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p3'
  });

  // Error Rate 4xx Crítico
  recommendations.push({
    titulo: '[PORTO] [P2] Taxa de erro 4xx muito elevada - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_10m):(sum:trace.servlet.request{service:motor-porto-tomcat,env:prd,http.status_code:4*}.as_count() / sum:trace.servlet.request{service:motor-porto-tomcat,env:prd}.as_count()) * 100 > 25',
    thresholds: {
      critical: 25,
      critical_recovery: 15,
      warning: 15,
      warning_recovery: 10
    },
    window: 'last_10m',
    descricao: 'Monitora taxa de erro 4xx acima de 25% - problemas de validação/autenticação',
    categoria: 'error-rate',
    justificativa: 'Alto volume de 4xx pode indicar problemas de integração ou configuração',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p2'
  });

  // Timeout Errors
  recommendations.push({
    titulo: '[PORTO] [P2] Erros de timeout - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_10m):sum:trace.servlet.request{service:motor-porto-tomcat,env:prd,http.status_code:504}.as_count() > 10',
    thresholds: {
      critical: 10,
      critical_recovery: 2,
      warning: 5,
      warning_recovery: 1
    },
    window: 'last_10m',
    descricao: 'Monitora erros 504 (Gateway Timeout) - problemas de dependências lentas',
    categoria: 'error-timeout',
    justificativa: 'Timeouts indicam problemas com dependências ou sobrecarga',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-timeout,created-by:observability,priority:p2'
  });

  // ========== LATENCY - Sinais de Ouro ==========

  // Latency P50
  recommendations.push({
    titulo: '[PORTO] [P3] Latência P50 elevada - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: 'avg(last_20m):p50:trace.servlet.request{service:motor-porto-tomcat,env:prd} > 1',
    thresholds: {
      critical: 1,
      critical_recovery: 0.5,
      warning: 0.7,
      warning_recovery: 0.4
    },
    window: 'last_20m',
    descricao: 'Monitora latência mediana (P50) acima de 1s',
    categoria: 'latency',
    justificativa: 'P50 indica degradação geral de performance',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p3'
  });

  // Latency P75
  recommendations.push({
    titulo: '[PORTO] [P3] Latência P75 elevada - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: 'avg(last_20m):p75:trace.servlet.request{service:motor-porto-tomcat,env:prd} > 1.5',
    thresholds: {
      critical: 1.5,
      critical_recovery: 0.8,
      warning: 1,
      warning_recovery: 0.6
    },
    window: 'last_20m',
    descricao: 'Monitora latência P75 acima de 1.5s',
    categoria: 'latency',
    justificativa: 'P75 detecta problemas de performance em 75% das requisições',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p3'
  });

  // Latency P95 Crítica
  recommendations.push({
    titulo: '[PORTO] [P1] Latência P95 crítica - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: 'avg(last_15m):p95:trace.servlet.request{service:motor-porto-tomcat,env:prd} > 5',
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 3,
      warning_recovery: 1.5
    },
    window: 'last_15m',
    descricao: 'Monitora latência P95 acima de 5s (P1) conforme documentação SRE',
    categoria: 'latency',
    justificativa: 'P95 crítico indica experiência muito ruim para usuários',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p1'
  });

  // Latency P95 Moderada
  recommendations.push({
    titulo: '[PORTO] [P2] Latência P95 muito elevada - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'avg(last_20m):p95:trace.servlet.request{service:motor-porto-tomcat,env:prd} > 2',
    thresholds: {
      critical: 2,
      critical_recovery: 1,
      warning: 1.5,
      warning_recovery: 0.8
    },
    window: 'last_20m',
    descricao: 'Monitora latência P95 entre 2-5s (P2)',
    categoria: 'latency',
    justificativa: 'P95 entre 2-5s indica degradação significativa',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p2'
  });

  // Latency P99 Moderada
  recommendations.push({
    titulo: '[PORTO] [P2] Latência P99 muito elevada - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'avg(last_15m):p99:trace.servlet.request{service:motor-porto-tomcat,env:prd} > 2',
    thresholds: {
      critical: 2,
      critical_recovery: 1.2,
      warning: 1.5,
      warning_recovery: 0.9
    },
    window: 'last_15m',
    descricao: 'Monitora latência P99 acima de 2s (P2)',
    categoria: 'latency',
    justificativa: 'P99 detecta outliers de performance',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p2'
  });

  // ========== TRAFFIC - Sinais de Ouro ==========

  // Traffic Muito Alto (Sobrecarga)
  recommendations.push({
    titulo: '[PORTO] [P2] Tráfego muito alto - motor-porto-tomcat',
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_5m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() > 10000',
    thresholds: {
      critical: 10000,
      critical_recovery: 8000,
      warning: 8000,
      warning_recovery: 6000
    },
    window: 'last_5m',
    descricao: 'Monitora tráfego muito alto - possível sobrecarga ou ataque',
    categoria: 'traffic',
    justificativa: 'Tráfego anormalmente alto pode causar degradação',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p2'
  });

  // Traffic Crescimento Anormal
  recommendations.push({
    titulo: '[PORTO] [P3] Crescimento anormal de tráfego - motor-porto-tomcat',
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: 'sum(last_5m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() > sum(last_15m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() * 1.5',
    thresholds: {
      critical: 1.5,
      critical_recovery: 1.2,
      warning: 1.3,
      warning_recovery: 1.1
    },
    window: 'last_5m',
    descricao: 'Monitora crescimento de tráfego acima de 50% em relação à média',
    categoria: 'traffic',
    justificativa: 'Crescimento súbito pode indicar problemas ou picos de demanda',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p3'
  });

  // Traffic Queda Moderada
  recommendations.push({
    titulo: '[PORTO] [P2] Queda moderada de tráfego - motor-porto-tomcat',
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_10m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() < sum(last_30m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() * 0.5',
    thresholds: {
      critical: 0.5,
      critical_recovery: 0.7,
      warning: 0.6,
      warning_recovery: 0.8
    },
    window: 'last_10m',
    descricao: 'Monitora queda de tráfego acima de 50% (P2) conforme documentação SRE',
    categoria: 'traffic',
    justificativa: 'Queda de 50-90% indica problemas de disponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p2'
  });

  // ========== SATURATION - Sinais de Ouro ==========

  // CPU Crítico
  recommendations.push({
    titulo: '[PORTO] [P1] CPU crítico - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_15m):max:system.cpu.user{service:motor-porto-tomcat,env:prd} > 95',
    thresholds: {
      critical: 95,
      critical_recovery: 85,
      warning: 90,
      warning_recovery: 80
    },
    window: 'last_15m',
    descricao: 'Monitora CPU acima de 95% por 15min (P1) conforme documentação SRE',
    categoria: 'cpu',
    justificativa: 'CPU crítico pode causar indisponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:cpu,created-by:observability,priority:p1'
  });

  // CPU Alto
  recommendations.push({
    titulo: '[PORTO] [P2] CPU muito alto - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_30m):max:system.cpu.user{service:motor-porto-tomcat,env:prd} > 90',
    thresholds: {
      critical: 90,
      critical_recovery: 80,
      warning: 85,
      warning_recovery: 75
    },
    window: 'last_30m',
    descricao: 'Monitora CPU acima de 90% por 30min (P2)',
    categoria: 'cpu',
    justificativa: 'CPU alto por período prolongado indica necessidade de scaling',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:cpu,created-by:observability,priority:p2'
  });

  // Memória Crítica
  recommendations.push({
    titulo: '[PORTO] [P1] Memória crítica - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_5m):avg:system.mem.pct_usable{service:motor-porto-tomcat,env:prd}.rollup(avg) < 5',
    thresholds: {
      critical: 5,
      critical_recovery: 10,
      warning: 10,
      warning_recovery: 15
    },
    window: 'last_5m',
    descricao: 'Monitora memória disponível abaixo de 5% (P1)',
    categoria: 'memory',
    justificativa: 'Memória crítica pode causar OOM e indisponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:memory,created-by:observability,priority:p1'
  });

  // Memória Alta
  recommendations.push({
    titulo: '[PORTO] [P2] Memória muito alta - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_5m):avg:system.mem.pct_usable{service:motor-porto-tomcat,env:prd}.rollup(avg) < 10',
    thresholds: {
      critical: 10,
      critical_recovery: 15,
      warning: 15,
      warning_recovery: 20
    },
    window: 'last_5m',
    descricao: 'Monitora memória disponível abaixo de 10% (P2)',
    categoria: 'memory',
    justificativa: 'Memória alta indica necessidade de otimização ou scaling',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:memory,created-by:observability,priority:p2'
  });

  // Disco Crítico
  recommendations.push({
    titulo: '[PORTO] [P1] Disco crítico - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_5m):avg:system.disk.in_use{service:motor-porto-tomcat,env:prd} by {host,device} > 95',
    thresholds: {
      critical: 95,
      critical_recovery: 90,
      warning: 90,
      warning_recovery: 85
    },
    window: 'last_5m',
    descricao: 'Monitora uso de disco acima de 95% (P1)',
    categoria: 'disk',
    justificativa: 'Disco cheio pode causar falhas de escrita e indisponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:disk,created-by:observability,priority:p1'
  });

  // Disco Alto
  recommendations.push({
    titulo: '[PORTO] [P2] Disco muito alto - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_5m):avg:system.disk.in_use{service:motor-porto-tomcat,env:prd} by {host,device} > 90',
    thresholds: {
      critical: 90,
      critical_recovery: 85,
      warning: 85,
      warning_recovery: 80
    },
    window: 'last_5m',
    descricao: 'Monitora uso de disco acima de 90% (P2)',
    categoria: 'disk',
    justificativa: 'Disco alto requer atenção preventiva',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:disk,created-by:observability,priority:p2'
  });

  // Network Packet Loss
  recommendations.push({
    titulo: '[PORTO] [P1] Packet loss crítico - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_5m):avg:system.net.packet_drop_rate{service:motor-porto-tomcat,env:prd} > 5',
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 2,
      warning_recovery: 1
    },
    window: 'last_5m',
    descricao: 'Monitora packet loss acima de 5% (P1) conforme documentação SRE',
    categoria: 'network',
    justificativa: 'Packet loss alto indica problemas de rede críticos',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:network,created-by:observability,priority:p1'
  });

  // Network Packet Loss Moderado
  recommendations.push({
    titulo: '[PORTO] [P2] Packet loss elevado - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_10m):avg:system.net.packet_drop_rate{service:motor-porto-tomcat,env:prd} > 2',
    thresholds: {
      critical: 2,
      critical_recovery: 1,
      warning: 1,
      warning_recovery: 0.5
    },
    window: 'last_10m',
    descricao: 'Monitora packet loss entre 2-5% (P2)',
    categoria: 'network',
    justificativa: 'Packet loss moderado pode causar degradação',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:network,created-by:observability,priority:p2'
  });

  // JVM Heap Memory Crítico
  recommendations.push({
    titulo: '[PORTO] [P1] JVM Heap Memory crítico - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_5m):(avg:jvm.heap_memory{service:motor-porto-tomcat,env:prd} / avg:jvm.heap_memory_max{service:motor-porto-tomcat,env:prd}) * 100 > 95',
    thresholds: {
      critical: 95,
      critical_recovery: 90,
      warning: 90,
      warning_recovery: 85
    },
    window: 'last_5m',
    descricao: 'Monitora JVM Heap acima de 95% (P1)',
    categoria: 'jvm-memory',
    justificativa: 'Heap crítico pode causar OOM e indisponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:jvm-memory,created-by:observability,priority:p1'
  });

  // JVM Heap Memory Alto
  recommendations.push({
    titulo: '[PORTO] [P2] JVM Heap Memory muito alto - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_10m):(avg:jvm.heap_memory{service:motor-porto-tomcat,env:prd} / avg:jvm.heap_memory_max{service:motor-porto-tomcat,env:prd}) * 100 > 90',
    thresholds: {
      critical: 90,
      critical_recovery: 85,
      warning: 85,
      warning_recovery: 80
    },
    window: 'last_10m',
    descricao: 'Monitora JVM Heap acima de 90% (P2)',
    categoria: 'jvm-memory',
    justificativa: 'Heap alto indica necessidade de tuning ou scaling',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:jvm-memory,created-by:observability,priority:p2'
  });

  // GC Minor Time Elevado
  recommendations.push({
    titulo: '[PORTO] [P3] GC Minor time elevado - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P3',
    query: 'avg(last_5m):sum:jvm.gc.minor_collection_time{service:motor-porto-tomcat,env:prd}.rollup(sum).weighted() > 200',
    thresholds: {
      critical: 200,
      critical_recovery: 100,
      warning: 150,
      warning_recovery: 80
    },
    window: 'last_5m',
    descricao: 'Monitora tempo de GC Minor acima de 200ms',
    categoria: 'jvm-gc',
    justificativa: 'GC Minor frequente pode impactar performance',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:jvm-gc,created-by:observability,priority:p3'
  });

  // Thread Count Crítico
  recommendations.push({
    titulo: '[PORTO] [P1] Thread count crítico - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: 'avg(last_5m):avg:jvm.thread_count{service:motor-porto-tomcat,env:prd} by {host} > 500',
    thresholds: {
      critical: 500,
      critical_recovery: 400,
      warning: 400,
      warning_recovery: 350
    },
    window: 'last_5m',
    descricao: 'Monitora thread count acima de 500 (P1)',
    categoria: 'jvm-threads',
    justificativa: 'Thread count crítico pode causar deadlocks e indisponibilidade',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:jvm-threads,created-by:observability,priority:p1'
  });

  // File Descriptors
  recommendations.push({
    titulo: '[PORTO] [P2] File descriptors elevado - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_10m):avg:system.fs.file_handles.used{service:motor-porto-tomcat,env:prd} / avg:system.fs.file_handles.max{service:motor-porto-tomcat,env:prd} * 100 > 85',
    thresholds: {
      critical: 85,
      critical_recovery: 75,
      warning: 80,
      warning_recovery: 70
    },
    window: 'last_10m',
    descricao: 'Monitora uso de file descriptors acima de 85%',
    categoria: 'file-descriptors',
    justificativa: 'File descriptors altos podem causar falhas de conexão',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:file-descriptors,created-by:observability,priority:p2'
  });

  // ========== SRE - Monitoramento Avançado ==========

  // Availability (SLI)
  recommendations.push({
    titulo: '[PORTO] [P1] Disponibilidade abaixo de 95% - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: 'sum(last_1h):sum:trace.servlet.request.errors{service:motor-porto-tomcat,env:prd}.as_count() / sum(last_1h):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() * 100 > 5',
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 2,
      warning_recovery: 1
    },
    window: 'last_1h',
    descricao: 'Monitora disponibilidade (SLI) abaixo de 95% (P1) conforme documentação SRE',
    categoria: 'availability',
    justificativa: 'SLI crítico para medir qualidade do serviço',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:availability,created-by:observability,priority:p1'
  });

  // Availability Moderada
  recommendations.push({
    titulo: '[PORTO] [P2] Disponibilidade abaixo de 98% - motor-porto-tomcat',
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_1h):sum:trace.servlet.request.errors{service:motor-porto-tomcat,env:prd}.as_count() / sum(last_1h):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() * 100 > 2',
    thresholds: {
      critical: 2,
      critical_recovery: 1,
      warning: 1,
      warning_recovery: 0.5
    },
    window: 'last_1h',
    descricao: 'Monitora disponibilidade (SLI) abaixo de 98% (P2)',
    categoria: 'availability',
    justificativa: 'SLI moderado para detectar degradação',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:availability,created-by:observability,priority:p2'
  });

  // Slow Queries (Database)
  recommendations.push({
    titulo: '[PORTO] [P2] Queries lentas no database - motor-porto-tomcat',
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: 'sum(last_10m):sum:trace.db.query.duration{service:motor-porto-tomcat,env:prd} > 5',
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 3,
      warning_recovery: 1.5
    },
    window: 'last_10m',
    descricao: 'Monitora queries de database acima de 5s',
    categoria: 'database',
    justificativa: 'Queries lentas impactam experiência do usuário',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:database,created-by:observability,priority:p2'
  });

  // Database Connection Pool
  recommendations.push({
    titulo: '[PORTO] [P2] Connection pool esgotado - motor-porto-tomcat',
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: 'avg(last_10m):avg:jdbc.connections.active{service:motor-porto-tomcat,env:prd} / avg:jdbc.connections.max{service:motor-porto-tomcat,env:prd} * 100 > 85',
    thresholds: {
      critical: 85,
      critical_recovery: 75,
      warning: 75,
      warning_recovery: 65
    },
    window: 'last_10m',
    descricao: 'Monitora uso de connection pool acima de 85%',
    categoria: 'database',
    justificativa: 'Connection pool esgotado pode causar timeouts',
    tags: 'service:motor-porto-tomcat,env:prd,team:thor-delivery,campaing:portoseguro,acionamento:porto,category:database,created-by:observability,priority:p2'
  });

  return recommendations;
}

/**
 * Escapa campos CSV para compatibilidade com Excel
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '""';
  }
  
  const str = String(field);
  // Remove quebras de linha e tabs que podem quebrar o CSV
  const cleaned = str.replace(/[\r\n\t]/g, ' ').trim();
  
  // Se contém vírgula, aspas ou quebra de linha, precisa ser envolvido em aspas
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n') || cleaned.includes('\r')) {
    // Escapa aspas duplas (RFC 4180)
    return `"${cleaned.replace(/"/g, '""')}"`;
  }
  
  return cleaned || '""';
}

/**
 * Gera planilha CSV com recomendações (compatível com Excel)
 */
function generateCSV(recommendations) {
  const headers = [
    'Título',
    'Sinal de Ouro',
    'Tipo (Infra/Aplic)',
    'Prioridade',
    'Query',
    'Thresholds (JSON)',
    'Window',
    'Categoria',
    'Descrição',
    'Justificativa',
    'Tags Sugeridas'
  ];

  const rows = recommendations.map(rec => {
    const thresholdsJson = JSON.stringify(rec.thresholds);
    
    return [
      escapeCSVField(rec.titulo),
      escapeCSVField(rec.sinalOuro),
      escapeCSVField(rec.tipo),
      escapeCSVField(rec.prioridade),
      escapeCSVField(rec.query),
      escapeCSVField(thresholdsJson),
      escapeCSVField(rec.window),
      escapeCSVField(rec.categoria),
      escapeCSVField(rec.descricao),
      escapeCSVField(rec.justificativa),
      escapeCSVField(rec.tags)
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Adiciona BOM (Byte Order Mark) UTF-8 para melhor compatibilidade com Excel
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

async function main() {
  console.log('🔍 Gerando recomendações de monitores para motor-porto-tomcat...\n');
  console.log('📊 Baseado nos 4 Sinais de Ouro e SRE Best Practices\n');

  try {
    const recommendations = generateMonitorRecommendations();

    console.log(`✅ Geradas ${recommendations.length} recomendações de monitores\n`);

    // Estatísticas
    const stats = {
      byGoldenSignal: {},
      byType: {},
      byPriority: {},
      byCategory: {}
    };

    recommendations.forEach(rec => {
      stats.byGoldenSignal[rec.sinalOuro] = (stats.byGoldenSignal[rec.sinalOuro] || 0) + 1;
      stats.byType[rec.tipo] = (stats.byType[rec.tipo] || 0) + 1;
      stats.byPriority[rec.prioridade] = (stats.byPriority[rec.prioridade] || 0) + 1;
      stats.byCategory[rec.categoria] = (stats.byCategory[rec.categoria] || 0) + 1;
    });

    console.log('📊 Estatísticas das Recomendações:');
    console.log(`   Total: ${recommendations.length}`);
    console.log('\n   Por Sinal de Ouro:');
    Object.entries(stats.byGoldenSignal).forEach(([signal, count]) => {
      console.log(`     ${signal}: ${count}`);
    });
    console.log('\n   Por Tipo:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    console.log('\n   Por Prioridade:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      console.log(`     ${priority}: ${count}`);
    });
    console.log('\n   Por Categoria:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`     ${category}: ${count}`);
    });

    // Gerar CSV
    const csv = generateCSV(recommendations);
    
    // Salvar arquivo
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `motor-porto-tomcat-monitors-recommendations-${timestamp}.csv`;
    const reportsDir = path.join(__dirname, '..', '..', 'reports', 'generated');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, csv, 'utf-8');

    console.log(`\n✅ Planilha de recomendações gerada com sucesso!`);
    console.log(`📄 Arquivo: ${filepath}\n`);

  } catch (error) {
    console.error('❌ Erro ao gerar recomendações:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

