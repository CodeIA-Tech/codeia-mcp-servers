#!/usr/bin/env node
/**
 * Gera análise completa dos monitores do serviço motor-porto-tomcat
 * Classifica pelos 4 sinais de ouro e gera planilha com recomendações
 * 
 * Uso: node scripts/datadog/generate-monitor-analysis.js
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function searchMonitors(query) {
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY no .env');
  }

  const url = `https://api.${site}/api/v1/monitor/search?query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return await response.json();
}

async function fetchMonitorDetails(monitorId) {
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  const url = `https://api.${site}/api/v1/monitor/${monitorId}`;
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return await response.json();
}

/**
 * Classifica o monitor pelos 4 sinais de ouro
 */
function classifyGoldenSignal(monitor) {
  const name = (monitor.name || '').toLowerCase();
  const query = (monitor.query || '').toLowerCase();
  const tags = (monitor.tags || []).map(t => t.toLowerCase()).join(' ');
  const category = tags.includes('category:') 
    ? tags.match(/category:([^\s,]+)/)?.[1] 
    : null;

  // Classificação por categoria (se existir)
  if (category) {
    if (category.includes('error') || category.includes('errors')) return 'Error';
    if (category.includes('latency') || category.includes('performance')) return 'Latency';
    if (category.includes('traffic')) return 'Traffic';
    if (category.includes('saturation') || category.includes('infrastructure')) return 'Saturation';
  }

  // Classificação por nome
  if (name.includes('erro') || name.includes('error') || name.includes('4xx') || name.includes('5xx')) {
    return 'Error';
  }
  if (name.includes('latência') || name.includes('latency') || name.includes('p95') || name.includes('p99')) {
    return 'Latency';
  }
  if (name.includes('tráfego') || name.includes('traffic') || name.includes('request') || name.includes('hits')) {
    return 'Traffic';
  }
  if (name.includes('cpu') || name.includes('memory') || name.includes('memória') || 
      name.includes('disk') || name.includes('disco') || name.includes('network') || 
      name.includes('saturation') || name.includes('heap') || name.includes('gc') || 
      name.includes('thread')) {
    return 'Saturation';
  }

  // Classificação por query
  if (query.includes('error') || query.includes('4xx') || query.includes('5xx') || 
      query.includes('status:error') || query.includes('status_code:4') || query.includes('status_code:5')) {
    return 'Error';
  }
  if (query.includes('latency') || query.includes('duration') || query.includes('p95') || 
      query.includes('p99') || query.includes('.p95') || query.includes('.p99')) {
    return 'Latency';
  }
  if (query.includes('hits') || query.includes('requests') || query.includes('count') || 
      query.includes('rate') || query.includes('traffic')) {
    return 'Traffic';
  }
  if (query.includes('cpu') || query.includes('memory') || query.includes('mem') || 
      query.includes('disk') || query.includes('network') || query.includes('heap') || 
      query.includes('gc') || query.includes('thread')) {
    return 'Saturation';
  }

  return 'Não Classificado';
}

/**
 * Determina se é Infraestrutura ou Aplicação
 */
function classifyType(monitor) {
  const name = (monitor.name || '').toLowerCase();
  const query = (monitor.query || '').toLowerCase();
  const tags = (monitor.tags || []).map(t => t.toLowerCase()).join(' ');

  // Infraestrutura: CPU, memória, disco, rede, JVM (heap, GC, threads)
  const infraKeywords = ['cpu', 'memory', 'memória', 'disk', 'disco', 'network', 'rede', 
                         'heap', 'gc', 'garbage', 'thread', 'jvm', 'system.', 'infrastructure'];
  
  // Aplicação: erros HTTP, latência de requisições, tráfego de requisições, traces
  const appKeywords = ['error', 'erro', '4xx', '5xx', 'latency', 'latência', 'traffic', 
                       'tráfego', 'request', 'requisição', 'trace', 'apm', 'http'];

  const allText = `${name} ${query} ${tags}`.toLowerCase();

  const hasInfra = infraKeywords.some(kw => allText.includes(kw));
  const hasApp = appKeywords.some(kw => allText.includes(kw));

  if (hasInfra && !hasApp) return 'Infraestrutura';
  if (hasApp && !hasInfra) return 'Aplicação';
  if (hasInfra && hasApp) {
    // Se tem ambos, priorizar por contexto
    if (query.includes('trace.') || query.includes('apm') || query.includes('http')) {
      return 'Aplicação';
    }
    return 'Infraestrutura';
  }

  return 'Não Classificado';
}

/**
 * Extrai prioridade atual do monitor
 */
function getCurrentPriority(monitor) {
  const tags = monitor.tags || [];
  const priorityTag = tags.find(t => t.toLowerCase().startsWith('priority:'));
  if (priorityTag) {
    return priorityTag.split(':')[1].toUpperCase();
  }
  
  // Tentar extrair do título
  const name = monitor.name || '';
  const match = name.match(/\[P([0-5])\]/i);
  if (match) {
    return `P${match[1]}`;
  }

  return 'Não Definida';
}

/**
 * Gera recomendações de alertas baseado nos 4 sinais de ouro
 */
function generateRecommendations(monitor, goldenSignal, type) {
  const recommendations = [];
  const hasErrorMonitor = monitor.name?.toLowerCase().includes('error') || 
                          monitor.name?.toLowerCase().includes('erro') ||
                          monitor.query?.toLowerCase().includes('error') ||
                          monitor.query?.toLowerCase().includes('4xx') ||
                          monitor.query?.toLowerCase().includes('5xx');
  
  const hasLatencyMonitor = monitor.name?.toLowerCase().includes('latency') || 
                            monitor.name?.toLowerCase().includes('latência') ||
                            monitor.query?.toLowerCase().includes('latency') ||
                            monitor.query?.toLowerCase().includes('duration') ||
                            monitor.query?.toLowerCase().includes('p95') ||
                            monitor.query?.toLowerCase().includes('p99');
  
  const hasTrafficMonitor = monitor.name?.toLowerCase().includes('traffic') || 
                            monitor.name?.toLowerCase().includes('tráfego') ||
                            monitor.query?.toLowerCase().includes('hits') ||
                            monitor.query?.toLowerCase().includes('requests');
  
  const hasSaturationMonitor = monitor.name?.toLowerCase().includes('cpu') || 
                               monitor.name?.toLowerCase().includes('memory') ||
                               monitor.name?.toLowerCase().includes('disk') ||
                               monitor.name?.toLowerCase().includes('network') ||
                               monitor.name?.toLowerCase().includes('heap') ||
                               monitor.name?.toLowerCase().includes('gc');

  if (type === 'Aplicação') {
    if (!hasErrorMonitor) {
      recommendations.push('Criar monitor de Error Rate (taxa de erros 4xx/5xx)');
    }
    if (!hasLatencyMonitor) {
      recommendations.push('Criar monitor de Latency P95/P99');
    }
    if (!hasTrafficMonitor) {
      recommendations.push('Criar monitor de Traffic (requisições muito baixas/altas)');
    }
  }

  if (type === 'Infraestrutura') {
    if (!hasSaturationMonitor) {
      recommendations.push('Criar monitor de Saturation (CPU, Memória, Disco, Network)');
    }
    if (!monitor.query?.includes('heap')) {
      recommendations.push('Considerar monitor de JVM Heap Memory');
    }
    if (!monitor.query?.includes('gc')) {
      recommendations.push('Considerar monitor de GC Time');
    }
  }

  // Recomendações gerais
  if (!monitor.message || monitor.message.trim().length < 50) {
    recommendations.push('Adicionar mensagem de escalação detalhada');
  }

  const hasPriority = monitor.tags?.some(t => t.toLowerCase().startsWith('priority:'));
  if (!hasPriority) {
    recommendations.push('Adicionar tag de prioridade (priority:p1-p5)');
  }

  return recommendations.length > 0 ? recommendations.join('; ') : 'Monitor adequado';
}

/**
 * Determina prioridade recomendada baseada na documentação
 */
function recommendPriority(monitor, goldenSignal, type) {
  const name = (monitor.name || '').toLowerCase();
  const query = monitor.query || '';
  
  // P1 - Crítico: Indisponibilidade, erros altos, latência crítica
  if (name.includes('crítica') || name.includes('muito baixo') || 
      query.includes('> 25') || query.includes('> 5s') || 
      (query.includes('error') && query.match(/>\s*(\d+)/)?.[1] > 25)) {
    return 'P1';
  }

  // P2 - Alto: Degradação significativa
  if (name.includes('elevad') || name.includes('alto') || 
      query.includes('> 10') || query.includes('> 2s') ||
      (query.includes('error') && query.match(/>\s*(\d+)/)?.[1] > 10)) {
    return 'P2';
  }

  // P3 - Médio: Problemas moderados
  if (name.includes('moderad') || query.includes('> 5') || query.includes('> 1s')) {
    return 'P3';
  }

  // P4 - Baixo: Alertas informativos
  if (name.includes('informativ') || query.includes('> 1')) {
    return 'P4';
  }

  // Default baseado no tipo
  if (goldenSignal === 'Error' && type === 'Aplicação') return 'P2';
  if (goldenSignal === 'Latency' && type === 'Aplicação') return 'P2';
  if (goldenSignal === 'Traffic' && type === 'Aplicação') return 'P1';
  if (goldenSignal === 'Saturation' && type === 'Infraestrutura') return 'P3';

  return 'P3';
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
 * Gera planilha CSV (compatível com Excel)
 */
function generateCSV(monitors) {
  const headers = [
    'ID Monitor',
    'Título',
    'Tipo Monitor',
    'Status',
    'Sinal de Ouro',
    'Tipo (Infra/Aplic)',
    'Prioridade Atual',
    'Prioridade Recomendada',
    'Query',
    'Thresholds',
    'Tags',
    'Recomendações',
    'Link Monitor'
  ];

  const rows = monitors.map(m => {
    const site = process.env.DATADOG_SITE || 'datadoghq.com';
    const link = `https://app.${site}/monitors/${m.id}`;
    
    const thresholds = m.options?.thresholds 
      ? JSON.stringify(m.options.thresholds)
      : 'N/A';

    return [
      escapeCSVField(m.id),
      escapeCSVField(m.name),
      escapeCSVField(m.type || 'N/A'),
      escapeCSVField(m.status || 'N/A'),
      escapeCSVField(m.goldenSignal || 'N/A'),
      escapeCSVField(m.typeClass || 'N/A'),
      escapeCSVField(m.currentPriority || 'N/A'),
      escapeCSVField(m.recommendedPriority || 'N/A'),
      escapeCSVField(m.query || ''),
      escapeCSVField(thresholds),
      escapeCSVField((m.tags || []).join(', ')),
      escapeCSVField(m.recommendations || ''),
      escapeCSVField(link)
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Adiciona BOM (Byte Order Mark) UTF-8 para melhor compatibilidade com Excel
  const BOM = '\uFEFF';
  return BOM + csvContent;
}

async function main() {
  loadEnv();

  console.log('🔍 Analisando monitores do serviço motor-porto-tomcat...\n');

  try {
    // Buscar todos os monitores do serviço
    const searchResult = await searchMonitors('service:motor-porto-tomcat');
    
    if (!searchResult?.monitors || searchResult.monitors.length === 0) {
      console.log('❌ Nenhum monitor encontrado para o serviço motor-porto-tomcat');
      return;
    }

    console.log(`📊 Encontrados ${searchResult.monitors.length} monitores\n`);
    console.log('🔎 Buscando detalhes completos de cada monitor...\n');

    // Buscar detalhes completos de cada monitor
    const monitorsWithDetails = [];
    for (const monitor of searchResult.monitors) {
      try {
        const details = await fetchMonitorDetails(monitor.id);
        
        const goldenSignal = classifyGoldenSignal(details);
        const typeClass = classifyType(details);
        const currentPriority = getCurrentPriority(details);
        const recommendedPriority = recommendPriority(details, goldenSignal, typeClass);
        const recommendations = generateRecommendations(details, goldenSignal, typeClass);

        monitorsWithDetails.push({
          ...details,
          goldenSignal,
          typeClass,
          currentPriority,
          recommendedPriority,
          recommendations
        });

        console.log(`✅ ${monitor.id}: ${monitor.name}`);
      } catch (error) {
        console.error(`❌ Erro ao buscar detalhes do monitor ${monitor.id}:`, error.message);
      }
    }

    console.log(`\n📈 Gerando planilha de análise...\n`);

    // Gerar CSV
    const csv = generateCSV(monitorsWithDetails);
    
    // Salvar arquivo
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `motor-porto-tomcat-monitors-analysis-${timestamp}.csv`;
    const reportsDir = path.join(__dirname, '..', '..', 'reports', 'generated');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, csv, 'utf-8');

    console.log(`✅ Planilha gerada com sucesso!`);
    console.log(`📄 Arquivo: ${filepath}\n`);

    // Estatísticas
    const stats = {
      total: monitorsWithDetails.length,
      byGoldenSignal: {},
      byType: {},
      byPriority: {}
    };

    monitorsWithDetails.forEach(m => {
      stats.byGoldenSignal[m.goldenSignal] = (stats.byGoldenSignal[m.goldenSignal] || 0) + 1;
      stats.byType[m.typeClass] = (stats.byType[m.typeClass] || 0) + 1;
      stats.byPriority[m.currentPriority] = (stats.byPriority[m.currentPriority] || 0) + 1;
    });

    console.log('📊 Estatísticas:');
    console.log(`   Total de monitores: ${stats.total}`);
    console.log('\n   Por Sinal de Ouro:');
    Object.entries(stats.byGoldenSignal).forEach(([signal, count]) => {
      console.log(`     ${signal}: ${count}`);
    });
    console.log('\n   Por Tipo:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    console.log('\n   Por Prioridade Atual:');
    Object.entries(stats.byPriority).forEach(([priority, count]) => {
      console.log(`     ${priority}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao gerar análise:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

