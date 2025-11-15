#!/usr/bin/env node
/**
 * Gera relatório completo em Markdown sobre um serviço no Datadog
 * Inclui análise dos monitores existentes e recomendações baseadas nos 4 sinais de ouro SRE
 * 
 * Uso: node scripts/datadog/generate-service-report.js <service-name>
 * Exemplo: node scripts/datadog/generate-service-report.js portoseguromiddlewareapprd
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
  loadEnv();
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
  loadEnv();
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

  if (category) {
    if (category.includes('error') || category.includes('errors')) return 'Error';
    if (category.includes('latency') || category.includes('performance')) return 'Latency';
    if (category.includes('traffic')) return 'Traffic';
    if (category.includes('saturation') || category.includes('infrastructure')) return 'Saturation';
  }

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

  const infraKeywords = ['cpu', 'memory', 'memória', 'disk', 'disco', 'network', 'rede', 
                         'heap', 'gc', 'garbage', 'thread', 'jvm', 'system.', 'infrastructure'];
  
  const appKeywords = ['error', 'erro', '4xx', '5xx', 'latency', 'latência', 'traffic', 
                       'tráfego', 'request', 'requisição', 'trace', 'apm', 'http'];

  const allText = `${name} ${query} ${tags}`.toLowerCase();

  const hasInfra = infraKeywords.some(kw => allText.includes(kw));
  const hasApp = appKeywords.some(kw => allText.includes(kw));

  if (hasInfra && !hasApp) return 'Infraestrutura';
  if (hasApp && !hasInfra) return 'Aplicação';
  if (hasInfra && hasApp) {
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
  
  const name = monitor.name || '';
  const match = name.match(/\[P([0-5])\]/i);
  if (match) {
    return `P${match[1]}`;
  }

  return 'Não Definida';
}

/**
 * Gera recomendações de monitores baseadas nos 4 sinais de ouro
 */
function generateRecommendations(existingMonitors, serviceName) {
  const recommendations = [];
  const existingSignals = {
    Error: existingMonitors.some(m => classifyGoldenSignal(m) === 'Error'),
    Latency: existingMonitors.some(m => classifyGoldenSignal(m) === 'Latency'),
    Traffic: existingMonitors.some(m => classifyGoldenSignal(m) === 'Traffic'),
    Saturation: existingMonitors.some(m => classifyGoldenSignal(m) === 'Saturation')
  };

  // Error - Recomendações
  if (!existingSignals.Error) {
    recommendations.push({
      sinal: 'Error',
      titulo: `[PORTO] [P1] Taxa de erro 5xx crítica - ${serviceName}`,
      query: `sum(last_5m):sum:trace.aspnet_core.request.errors{service:${serviceName},env:prd,http.status_code:5*}.as_count() / default_zero(sum:trace.aspnet_core.request.hits{service:${serviceName},env:prd}.as_count()) * 100 > 25`,
      prioridade: 'P1',
      descricao: 'Monitora taxa de erro 5xx acima de 25% - crítico para detectar indisponibilidade',
      tipo: 'Aplicação'
    });
    recommendations.push({
      sinal: 'Error',
      titulo: `[PORTO] [P2] Taxa de erro 5xx elevada - ${serviceName}`,
      query: `sum(last_10m):sum:trace.aspnet_core.request.errors{service:${serviceName},env:prd,http.status_code:5*}.as_count() / default_zero(sum:trace.aspnet_core.request.hits{service:${serviceName},env:prd}.as_count()) * 100 > 10`,
      prioridade: 'P2',
      descricao: 'Monitora taxa de erro 5xx entre 10-25% - degradação significativa',
      tipo: 'Aplicação'
    });
  }

  // Latency - Recomendações
  if (!existingSignals.Latency) {
    recommendations.push({
      sinal: 'Latency',
      titulo: `[PORTO] [P1] Latência P95 crítica - ${serviceName}`,
      query: `avg(last_15m):p95:trace.aspnet_core.request.duration{service:${serviceName},env:prd} > 5`,
      prioridade: 'P1',
      descricao: 'Monitora latência P95 acima de 5s - experiência muito ruim para usuários',
      tipo: 'Aplicação'
    });
    recommendations.push({
      sinal: 'Latency',
      titulo: `[PORTO] [P2] Latência P95 elevada - ${serviceName}`,
      query: `avg(last_20m):p95:trace.aspnet_core.request.duration{service:${serviceName},env:prd} > 2`,
      prioridade: 'P2',
      descricao: 'Monitora latência P95 entre 2-5s - degradação significativa',
      tipo: 'Aplicação'
    });
  }

  // Traffic - Recomendações
  if (!existingSignals.Traffic) {
    recommendations.push({
      sinal: 'Traffic',
      titulo: `[PORTO] [P1] Tráfego muito baixo - ${serviceName}`,
      query: `sum(last_5m):max:trace.aspnet_core.request.hits{service:${serviceName},env:prd}.as_count() < 5`,
      prioridade: 'P1',
      descricao: 'Monitora tráfego muito baixo - possível indisponibilidade',
      tipo: 'Aplicação'
    });
    recommendations.push({
      sinal: 'Traffic',
      titulo: `[PORTO] [P2] Tráfego muito alto - ${serviceName}`,
      query: `sum(last_5m):sum:trace.aspnet_core.request.hits{service:${serviceName},env:prd}.as_count() > 10000`,
      prioridade: 'P2',
      descricao: 'Monitora tráfego muito alto - possível sobrecarga',
      tipo: 'Aplicação'
    });
  }

  // Saturation - Recomendações
  if (!existingSignals.Saturation) {
    recommendations.push({
      sinal: 'Saturation',
      titulo: `[PORTO] [P1] CPU crítico - ${serviceName}`,
      query: `avg(last_15m):max:system.cpu.user{service:${serviceName},env:prd} > 95`,
      prioridade: 'P1',
      descricao: 'Monitora CPU acima de 95% por 15min - risco de indisponibilidade',
      tipo: 'Infraestrutura'
    });
    recommendations.push({
      sinal: 'Saturation',
      titulo: `[PORTO] [P2] Memória muito alta - ${serviceName}`,
      query: `avg(last_5m):avg:system.mem.pct_usable{service:${serviceName},env:prd}.rollup(avg) < 10`,
      prioridade: 'P2',
      descricao: 'Monitora memória disponível abaixo de 10% - degradação significativa',
      tipo: 'Infraestrutura'
    });
  }

  return recommendations;
}

/**
 * Gera relatório em Markdown
 */
function generateMarkdownReport(serviceName, monitors, recommendations, site) {
  const timestamp = new Date().toISOString().split('T')[0];
  const stats = {
    total: monitors.length,
    byGoldenSignal: {},
    byType: {},
    byPriority: {}
  };

  monitors.forEach(m => {
    const signal = classifyGoldenSignal(m);
    const type = classifyType(m);
    const priority = getCurrentPriority(m);

    stats.byGoldenSignal[signal] = (stats.byGoldenSignal[signal] || 0) + 1;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
  });

  let md = `# 📊 Relatório de Monitoramento - ${serviceName}\n\n`;
  md += `**Data de Geração:** ${new Date().toLocaleString('pt-BR')}\n`;
  md += `**Serviço:** ${serviceName}\n`;
  md += `**Ambiente:** Produção\n\n`;
  md += `---\n\n`;

  // Resumo Executivo
  md += `## 📈 Resumo Executivo\n\n`;
  md += `- **Total de Monitores:** ${stats.total}\n`;
  md += `- **Cobertura dos 4 Sinais de Ouro:** ${Object.keys(stats.byGoldenSignal).filter(s => s !== 'Não Classificado').length}/4\n`;
  md += `- **Monitores de Aplicação:** ${stats.byType['Aplicação'] || 0}\n`;
  md += `- **Monitores de Infraestrutura:** ${stats.byType['Infraestrutura'] || 0}\n\n`;

  // Estatísticas por Sinal de Ouro
  md += `## 🏆 Distribuição por Sinal de Ouro\n\n`;
  md += `| Sinal | Quantidade | Cobertura |\n`;
  md += `|-------|------------|-----------|\n`;
  md += `| 🔴 Error | ${stats.byGoldenSignal['Error'] || 0} | ${stats.byGoldenSignal['Error'] ? '✅' : '❌'} |\n`;
  md += `| 🟡 Latency | ${stats.byGoldenSignal['Latency'] || 0} | ${stats.byGoldenSignal['Latency'] ? '✅' : '❌'} |\n`;
  md += `| 🟢 Traffic | ${stats.byGoldenSignal['Traffic'] || 0} | ${stats.byGoldenSignal['Traffic'] ? '✅' : '❌'} |\n`;
  md += `| 🔵 Saturation | ${stats.byGoldenSignal['Saturation'] || 0} | ${stats.byGoldenSignal['Saturation'] ? '✅' : '❌'} |\n\n`;

  // Distribuição por Prioridade
  md += `## 🎯 Distribuição por Prioridade\n\n`;
  md += `| Prioridade | Quantidade |\n`;
  md += `|------------|------------|\n`;
  Object.entries(stats.byPriority).sort().forEach(([priority, count]) => {
    md += `| ${priority} | ${count} |\n`;
  });
  md += `\n`;

  // Monitores Existentes
  md += `## 📋 Monitores Existentes\n\n`;
  if (monitors.length === 0) {
    md += `⚠️ **Nenhum monitor encontrado para este serviço.**\n\n`;
  } else {
    md += `### Por Sinal de Ouro\n\n`;
    
    ['Error', 'Latency', 'Traffic', 'Saturation', 'Não Classificado'].forEach(signal => {
      const signalMonitors = monitors.filter(m => classifyGoldenSignal(m) === signal);
      if (signalMonitors.length > 0) {
        md += `#### ${signal}\n\n`;
        md += `| ID | Título | Tipo | Prioridade | Link |\n`;
        md += `|----|--------|------|------------|------|\n`;
        signalMonitors.forEach(m => {
          const priority = getCurrentPriority(m);
          const type = classifyType(m);
          const link = `https://app.${site}/monitors/${m.id}`;
          md += `| ${m.id} | ${m.name} | ${type} | ${priority} | [Ver Monitor](${link}) |\n`;
        });
        md += `\n`;
      }
    });
  }

  // Recomendações
  md += `## 💡 Recomendações - Monitores Necessários\n\n`;
  md += `### Análise de Cobertura\n\n`;
  
  const coverage = {
    Error: stats.byGoldenSignal['Error'] > 0,
    Latency: stats.byGoldenSignal['Latency'] > 0,
    Traffic: stats.byGoldenSignal['Traffic'] > 0,
    Saturation: stats.byGoldenSignal['Saturation'] > 0
  };

  md += `| Sinal de Ouro | Status | Observação |\n`;
  md += `|---------------|--------|------------|\n`;
  md += `| 🔴 Error | ${coverage.Error ? '✅ Coberto' : '❌ Não Coberto'} | ${coverage.Error ? 'Monitor de erros configurado' : '**CRÍTICO:** Adicionar monitor de taxa de erro'} |\n`;
  md += `| 🟡 Latency | ${coverage.Latency ? '✅ Coberto' : '❌ Não Coberto'} | ${coverage.Latency ? 'Monitor de latência configurado' : '**CRÍTICO:** Adicionar monitor de latência P95/P99'} |\n`;
  md += `| 🟢 Traffic | ${coverage.Traffic ? '✅ Coberto' : '❌ Não Coberto'} | ${coverage.Traffic ? 'Monitor de tráfego configurado' : '**CRÍTICO:** Adicionar monitor de tráfego'} |\n`;
  md += `| 🔵 Saturation | ${coverage.Saturation ? '✅ Coberto' : '❌ Não Coberto'} | ${coverage.Saturation ? 'Monitor de saturação configurado' : '**IMPORTANTE:** Adicionar monitor de recursos (CPU/Memória)'} |\n\n`;

  if (recommendations.length > 0) {
    md += `### Monitores Recomendados\n\n`;
    md += `#### Por Sinal de Ouro\n\n`;
    
    ['Error', 'Latency', 'Traffic', 'Saturation'].forEach(signal => {
      const signalRecs = recommendations.filter(r => r.sinal === signal);
      if (signalRecs.length > 0) {
        md += `##### ${signal}\n\n`;
        signalRecs.forEach(rec => {
          md += `**${rec.titulo}** (${rec.prioridade})\n`;
          md += `- **Tipo:** ${rec.tipo}\n`;
          md += `- **Descrição:** ${rec.descricao}\n`;
          md += `- **Query:**\n`;
          md += `  \`\`\`\n`;
          md += `  ${rec.query}\n`;
          md += `  \`\`\`\n\n`;
        });
      }
    });
  }

  // Próximos Passos
  md += `## 🚀 Próximos Passos\n\n`;
  md += `1. **Revisar monitores existentes** e validar thresholds\n`;
  md += `2. **Implementar monitores recomendados** para garantir cobertura completa dos 4 sinais de ouro\n`;
  md += `3. **Configurar mensagens de escalação** usando os templates apropriados (P1P2 ou P3P4P5)\n`;
  md += `4. **Validar tags** e garantir que todos os monitores tenham prioridade definida\n`;
  md += `5. **Criar dashboard** consolidado para visualização dos 4 sinais de ouro\n\n`;

  md += `---\n\n`;
  md += `*Relatório gerado automaticamente pelo Datadog Agent*\n`;

  return md;
}

async function main() {
  const serviceName = process.argv[2] || 'portoseguromiddlewareapprd';
  
  console.log(`📊 Gerando relatório para o serviço: ${serviceName}\n`);

  try {
    loadEnv();
    const site = process.env.DATADOG_SITE || 'datadoghq.com';

    // Buscar monitores do serviço
    console.log('🔍 Buscando monitores...');
    const searchResult = await searchMonitors(`service:${serviceName}`);
    
    if (!searchResult?.monitors || searchResult.monitors.length === 0) {
      console.log(`⚠️  Nenhum monitor encontrado para o serviço ${serviceName}`);
      console.log('📝 Gerando relatório com recomendações...\n');
      
      const recommendations = generateRecommendations([], serviceName);
      const md = generateMarkdownReport(serviceName, [], recommendations, site);
      
      const reportsDir = path.join(__dirname, '..', '..', 'reports', 'generated');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const filename = `${serviceName}-report-${new Date().toISOString().split('T')[0]}.md`;
      const filepath = path.join(reportsDir, filename);
      fs.writeFileSync(filepath, md, 'utf-8');
      
      console.log(`✅ Relatório gerado: ${filepath}`);
      return;
    }

    console.log(`✅ ${searchResult.monitors.length} monitores encontrados\n`);
    console.log('🔎 Buscando detalhes completos...\n');

    // Buscar detalhes completos
    const monitorsWithDetails = [];
    for (const monitor of searchResult.monitors) {
      try {
        const details = await fetchMonitorDetails(monitor.id);
        monitorsWithDetails.push(details);
        console.log(`✅ ${monitor.id}: ${monitor.name}`);
      } catch (error) {
        console.error(`❌ Erro ao buscar detalhes do monitor ${monitor.id}:`, error.message);
      }
    }

    console.log(`\n📈 Gerando recomendações...\n`);

    // Gerar recomendações
    const recommendations = generateRecommendations(monitorsWithDetails, serviceName);

    // Gerar relatório Markdown
    const md = generateMarkdownReport(serviceName, monitorsWithDetails, recommendations, site);

    // Salvar arquivo
    const reportsDir = path.join(__dirname, '..', '..', 'reports', 'generated');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${serviceName}-report-${new Date().toISOString().split('T')[0]}.md`;
    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, md, 'utf-8');

    console.log(`✅ Relatório gerado com sucesso!`);
    console.log(`📄 Arquivo: ${filepath}\n`);

    // Estatísticas no console
    const stats = {
      total: monitorsWithDetails.length,
      byGoldenSignal: {},
      byType: {},
      byPriority: {}
    };

    monitorsWithDetails.forEach(m => {
      const signal = classifyGoldenSignal(m);
      const type = classifyType(m);
      const priority = getCurrentPriority(m);

      stats.byGoldenSignal[signal] = (stats.byGoldenSignal[signal] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    });

    console.log('📊 Estatísticas:');
    console.log(`   Total: ${stats.total}`);
    console.log('\n   Por Sinal de Ouro:');
    Object.entries(stats.byGoldenSignal).forEach(([signal, count]) => {
      console.log(`     ${signal}: ${count}`);
    });
    console.log('\n   Por Tipo:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    console.log(`\n   Recomendações geradas: ${recommendations.length}`);

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

