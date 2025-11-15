#!/usr/bin/env node
/**
 * Gera recomendações de monitores para serviço Kubernetes no Datadog
 * Baseado nos 4 sinais de ouro e SRE best practices
 * 
 * Uso: node scripts/datadog/generate-kubernetes-monitor-recommendations.js <service-name> <cluster> <namespace>
 * Exemplo: node scripts/datadog/generate-kubernetes-monitor-recommendations.js portoseguromiddlewareapprd eks-engajamento-prd portoseguromiddlewareapprd
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega variáveis de ambiente do .env
 */
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

/**
 * Define os monitores recomendados baseados nos 4 sinais de ouro e SRE
 * Específico para serviços Kubernetes
 */
function generateKubernetesMonitorRecommendations(serviceName, cluster, namespace) {
  const recommendations = [];

  // Tags base para o serviço
  const baseTags = `service:${serviceName},cluster_name:${cluster},kube_namespace:${namespace},env:prd`;
  const appTags = `service:${serviceName},env:prd`;
  const infraTags = `${baseTags}`;

  // ========== ERROR - Sinais de Ouro ==========
  
  // Error Rate Total (5xx) - Crítico
  recommendations.push({
    titulo: `[PORTO] [P1] Taxa de erro 5xx crítica - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: `sum(last_5m):sum:trace.servlet.request.errors{${appTags},http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{${appTags}}.as_count()) * 100 > 25`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p1`
  });

  // Error Rate Moderado (5xx)
  recommendations.push({
    titulo: `[PORTO] [P2] Taxa de erro 5xx elevada - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_10m):sum:trace.servlet.request.errors{${appTags},http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{${appTags}}.as_count()) * 100 > 10`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p2`
  });

  // Error Rate Baixo (5xx)
  recommendations.push({
    titulo: `[PORTO] [P3] Taxa de erro 5xx moderada - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: `sum(last_15m):sum:trace.servlet.request.errors{${appTags},http.status_code:5*}.as_count() / default_zero(sum:trace.servlet.request.hits{${appTags}}.as_count()) * 100 > 5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p3`
  });

  // Error Rate 4xx Crítico
  recommendations.push({
    titulo: `[PORTO] [P2] Taxa de erro 4xx muito elevada - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_10m):(sum:trace.servlet.request{${appTags},http.status_code:4*}.as_count() / sum:trace.servlet.request{${appTags}}.as_count()) * 100 > 25`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-rate,created-by:observability,priority:p2`
  });

  // Timeout Errors
  recommendations.push({
    titulo: `[PORTO] [P2] Erros de timeout - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_10m):sum:trace.servlet.request{${appTags},http.status_code:504}.as_count() > 10`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:error-timeout,created-by:observability,priority:p2`
  });

  // Pod Crash Loop - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P1] Pod em crash loop - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `sum(last_5m):sum:kubernetes.containers.restarts{${infraTags}} by {pod_name} > 5`,
    thresholds: {
      critical: 5,
      critical_recovery: 0,
      warning: 3,
      warning_recovery: 0
    },
    window: 'last_5m',
    descricao: 'Monitora pods em crash loop (mais de 5 restarts em 5min)',
    categoria: 'pod-crash',
    justificativa: 'Crash loop indica problema crítico na aplicação ou configuração',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:pod-crash,created-by:observability,priority:p1`
  });

  // Container OOM Killed - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P1] Container OOM Killed - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `sum(last_5m):sum:kubernetes.memory.usage{${infraTags}} by {pod_name} > 0`,
    thresholds: {
      critical: 1,
      critical_recovery: 0,
      warning: 0,
      warning_recovery: 0
    },
    window: 'last_5m',
    descricao: 'Monitora containers que foram mortos por OOM (Out of Memory)',
    categoria: 'oom-killed',
    justificativa: 'OOM indica necessidade de ajuste de limites de memória',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:oom-killed,created-by:observability,priority:p1`
  });

  // ========== LATENCY - Sinais de Ouro ==========

  // Latency P50
  recommendations.push({
    titulo: `[PORTO] [P3] Latência P50 elevada - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: `avg(last_20m):p50:trace.servlet.request{${appTags}} > 1`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p3`
  });

  // Latency P75
  recommendations.push({
    titulo: `[PORTO] [P3] Latência P75 elevada - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: `avg(last_20m):p75:trace.servlet.request{${appTags}} > 1.5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p3`
  });

  // Latency P95 Crítica
  recommendations.push({
    titulo: `[PORTO] [P1] Latência P95 crítica - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: `avg(last_15m):p95:trace.servlet.request{${appTags}} > 5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p1`
  });

  // Latency P95 Moderada
  recommendations.push({
    titulo: `[PORTO] [P2] Latência P95 muito elevada - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `avg(last_20m):p95:trace.servlet.request{${appTags}} > 2`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p2`
  });

  // Latency P99 Moderada
  recommendations.push({
    titulo: `[PORTO] [P2] Latência P99 muito elevada - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `avg(last_15m):p99:trace.servlet.request{${appTags}} > 2`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:latency,created-by:observability,priority:p2`
  });

  // ========== TRAFFIC - Sinais de Ouro ==========

  // Traffic Muito Alto (Sobrecarga)
  recommendations.push({
    titulo: `[PORTO] [P2] Tráfego muito alto - ${serviceName}`,
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_5m):sum:trace.servlet.request.hits{${appTags}}.as_count() > 10000`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p2`
  });

  // Traffic Crescimento Anormal
  recommendations.push({
    titulo: `[PORTO] [P3] Crescimento anormal de tráfego - ${serviceName}`,
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P3',
    query: `sum(last_5m):sum:trace.servlet.request.hits{${appTags}}.as_count() > sum(last_15m):sum:trace.servlet.request.hits{${appTags}}.as_count() * 1.5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p3`
  });

  // Traffic Queda Moderada
  recommendations.push({
    titulo: `[PORTO] [P2] Queda moderada de tráfego - ${serviceName}`,
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_10m):sum:trace.servlet.request.hits{${appTags}}.as_count() < sum(last_30m):sum:trace.servlet.request.hits{${appTags}}.as_count() * 0.5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p2`
  });

  // Traffic Queda Crítica
  recommendations.push({
    titulo: `[PORTO] [P1] Queda crítica de tráfego - ${serviceName}`,
    sinalOuro: 'Traffic',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: `sum(last_5m):sum:trace.servlet.request.hits{${appTags}}.as_count() < sum(last_30m):sum:trace.servlet.request.hits{${appTags}}.as_count() * 0.1`,
    thresholds: {
      critical: 0.1,
      critical_recovery: 0.5,
      warning: 0.3,
      warning_recovery: 0.6
    },
    window: 'last_5m',
    descricao: 'Monitora queda de tráfego acima de 90% (P1) - possível indisponibilidade',
    categoria: 'traffic',
    justificativa: 'Queda acima de 90% indica possível indisponibilidade total',
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:traffic,created-by:observability,priority:p1`
  });

  // Pods não recebendo tráfego - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P2] Pods sem tráfego - ${serviceName}`,
    sinalOuro: 'Traffic',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `count_nonzero(sum(last_10m):sum:trace.servlet.request.hits{${appTags}} by {pod_name}.as_count()) < count_nonzero(sum(last_10m):sum:kubernetes.pods.running{${infraTags}} by {pod_name})`,
    thresholds: {
      critical: 1,
      critical_recovery: 0,
      warning: 0,
      warning_recovery: 0
    },
    window: 'last_10m',
    descricao: 'Monitora pods que não estão recebendo tráfego',
    categoria: 'pod-traffic',
    justificativa: 'Pods sem tráfego podem indicar problemas de load balancing ou health checks',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:pod-traffic,created-by:observability,priority:p2`
  });

  // ========== SATURATION - Sinais de Ouro ==========

  // CPU Crítico - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P1] CPU crítico - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `avg(last_15m):max:kubernetes.cpu.usage.total{${infraTags}} by {pod_name} > 95`,
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
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:cpu,created-by:observability,priority:p1`
  });

  // CPU Alto - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P2] CPU muito alto - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `avg(last_30m):max:kubernetes.cpu.usage.total{${infraTags}} by {pod_name} > 90`,
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
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:cpu,created-by:observability,priority:p2`
  });

  // CPU Request Limit - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P2] CPU próximo ao limite de request - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `avg(last_10m):(avg:kubernetes.cpu.usage.total{${infraTags}} by {pod_name} / avg:kubernetes.cpu.requests{${infraTags}} by {pod_name}) * 100 > 90`,
    thresholds: {
      critical: 90,
      critical_recovery: 80,
      warning: 85,
      warning_recovery: 75
    },
    window: 'last_10m',
    descricao: 'Monitora uso de CPU próximo ao limite de request configurado',
    categoria: 'cpu-request',
    justificativa: 'Indica necessidade de ajuste de requests ou scaling',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:cpu-request,created-by:observability,priority:p2`
  });

  // Memória Crítica - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P1] Memória crítica - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `avg(last_5m):max:kubernetes.memory.usage{${infraTags}} by {pod_name} / max:kubernetes.memory.limits{${infraTags}} by {pod_name} * 100 > 95`,
    thresholds: {
      critical: 95,
      critical_recovery: 90,
      warning: 90,
      warning_recovery: 85
    },
    window: 'last_5m',
    descricao: 'Monitora memória acima de 95% do limite (P1)',
    categoria: 'memory',
    justificativa: 'Memória crítica pode causar OOM e indisponibilidade',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:memory,created-by:observability,priority:p1`
  });

  // Memória Alta - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P2] Memória muito alta - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `avg(last_10m):max:kubernetes.memory.usage{${infraTags}} by {pod_name} / max:kubernetes.memory.limits{${infraTags}} by {pod_name} * 100 > 90`,
    thresholds: {
      critical: 90,
      critical_recovery: 85,
      warning: 85,
      warning_recovery: 80
    },
    window: 'last_10m',
    descricao: 'Monitora memória acima de 90% do limite (P2)',
    categoria: 'memory',
    justificativa: 'Memória alta indica necessidade de otimização ou scaling',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:memory,created-by:observability,priority:p2`
  });

  // Memory Request Limit - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P2] Memória próximo ao limite de request - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `avg(last_10m):(avg:kubernetes.memory.usage{${infraTags}} by {pod_name} / avg:kubernetes.memory.requests{${infraTags}} by {pod_name}) * 100 > 90`,
    thresholds: {
      critical: 90,
      critical_recovery: 80,
      warning: 85,
      warning_recovery: 75
    },
    window: 'last_10m',
    descricao: 'Monitora uso de memória próximo ao limite de request configurado',
    categoria: 'memory-request',
    justificativa: 'Indica necessidade de ajuste de requests ou scaling',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:memory-request,created-by:observability,priority:p2`
  });

  // Pods não prontos - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P1] Pods não prontos - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `sum(last_5m):sum:kubernetes.pods.ready{${infraTags}} < sum(last_5m):sum:kubernetes.pods.running{${infraTags}}`,
    thresholds: {
      critical: 1,
      critical_recovery: 0,
      warning: 0,
      warning_recovery: 0
    },
    window: 'last_5m',
    descricao: 'Monitora pods que não estão prontos (ready=false)',
    categoria: 'pod-ready',
    justificativa: 'Pods não prontos não recebem tráfego e podem causar indisponibilidade',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:pod-ready,created-by:observability,priority:p1`
  });

  // Pods não saudáveis - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P1] Pods não saudáveis - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `sum(last_5m):sum:kubernetes.pods.status_phase{${infraTags},phase:failed} > 0`,
    thresholds: {
      critical: 1,
      critical_recovery: 0,
      warning: 0,
      warning_recovery: 0
    },
    window: 'last_5m',
    descricao: 'Monitora pods em estado Failed',
    categoria: 'pod-status',
    justificativa: 'Pods failed indicam problemas críticos na aplicação',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:pod-status,created-by:observability,priority:p1`
  });

  // Network Packet Loss - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P1] Packet loss crítico - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P1',
    query: `avg(last_5m):avg:kubernetes.network.rx_errors{${infraTags}} by {pod_name} > 5`,
    thresholds: {
      critical: 5,
      critical_recovery: 2,
      warning: 2,
      warning_recovery: 1
    },
    window: 'last_5m',
    descricao: 'Monitora erros de rede acima de 5% (P1) conforme documentação SRE',
    categoria: 'network',
    justificativa: 'Erros de rede altos indicam problemas críticos',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:network,created-by:observability,priority:p1`
  });

  // Network Packet Loss Moderado - Kubernetes
  recommendations.push({
    titulo: `[PORTO] [P2] Erros de rede elevados - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P2',
    query: `avg(last_10m):avg:kubernetes.network.rx_errors{${infraTags}} by {pod_name} > 2`,
    thresholds: {
      critical: 2,
      critical_recovery: 1,
      warning: 1,
      warning_recovery: 0.5
    },
    window: 'last_10m',
    descricao: 'Monitora erros de rede entre 2-5% (P2)',
    categoria: 'network',
    justificativa: 'Erros de rede moderados podem causar degradação',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:network,created-by:observability,priority:p2`
  });

  // HPA Scaling - Kubernetes específico
  recommendations.push({
    titulo: `[PORTO] [P3] HPA atingindo limite máximo - ${serviceName}`,
    sinalOuro: 'Saturation',
    tipo: 'Infraestrutura',
    prioridade: 'P3',
    query: `sum(last_10m):sum:kubernetes.pods.running{${infraTags}} >= 10`,
    thresholds: {
      critical: 10,
      critical_recovery: 8,
      warning: 8,
      warning_recovery: 6
    },
    window: 'last_10m',
    descricao: 'Monitora quando HPA atinge o limite máximo de pods',
    categoria: 'hpa-scaling',
    justificativa: 'Indica necessidade de revisão de limites de HPA ou otimização',
    tags: `${infraTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:hpa-scaling,created-by:observability,priority:p3`
  });

  // ========== SRE - Monitoramento Avançado ==========

  // Availability (SLI)
  recommendations.push({
    titulo: `[PORTO] [P1] Disponibilidade abaixo de 95% - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P1',
    query: `sum(last_1h):sum:trace.servlet.request.errors{${appTags}}.as_count() / default_zero(sum(last_1h):sum:trace.servlet.request.hits{${appTags}}.as_count()) * 100 > 5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:availability,created-by:observability,priority:p1`
  });

  // Availability Moderada
  recommendations.push({
    titulo: `[PORTO] [P2] Disponibilidade abaixo de 98% - ${serviceName}`,
    sinalOuro: 'Error',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_1h):sum:trace.servlet.request.errors{${appTags}}.as_count() / default_zero(sum(last_1h):sum:trace.servlet.request.hits{${appTags}}.as_count()) * 100 > 2`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:availability,created-by:observability,priority:p2`
  });

  // Slow Queries (Database)
  recommendations.push({
    titulo: `[PORTO] [P2] Queries lentas no database - ${serviceName}`,
    sinalOuro: 'Latency',
    tipo: 'Aplicação',
    prioridade: 'P2',
    query: `sum(last_10m):sum:trace.db.query.duration{${appTags}} > 5`,
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
    tags: `${appTags},team:thor-delivery,campaing:portoseguro,acionamento:porto,category:database,created-by:observability,priority:p2`
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
  const serviceName = process.argv[2] || 'portoseguromiddlewareapprd';
  const cluster = process.argv[3] || 'eks-engajamento-prd';
  const namespace = process.argv[4] || 'portoseguromiddlewareapprd';

  console.log(`🔍 Gerando recomendações de monitores para serviço Kubernetes:`);
  console.log(`   Serviço: ${serviceName}`);
  console.log(`   Cluster: ${cluster}`);
  console.log(`   Namespace: ${namespace}\n`);
  console.log('📊 Baseado nos 4 Sinais de Ouro e SRE Best Practices\n');

  try {
    const recommendations = generateKubernetesMonitorRecommendations(serviceName, cluster, namespace);

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
    const filename = `${serviceName}-monitors-recommendations-${timestamp}.csv`;
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

