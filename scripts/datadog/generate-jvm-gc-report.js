#!/usr/bin/env node
/**
 * Script para gerar relatório HTML5 completo de métricas JVM/GC/Heap do Datadog
 * Uso: node scripts/generate-jvm-gc-report.js [service] [env]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar .env se existir
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      const value = values.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const DATADOG_APP_KEY = process.env.DATADOG_APP_KEY;
const DATADOG_SITE = process.env.DATADOG_SITE || 'datadoghq.com';

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

const service = process.argv[2] || 'motor-porto-tomcat';
const env = process.argv[3] || 'prd';
const tags = `service:${service},env:${env}`;

// Período: últimas 24 horas
const to = Math.floor(Date.now() / 1000);
const from = to - (24 * 3600);

function datadogRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${DATADOG_SITE}`,
      port: 443,
      path: path,
      method: method,
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Erro da API: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Erro ao parsear resposta: ${e.message}\nBody: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function queryMetrics(metricName, aggregator = 'avg') {
  try {
    const query = `${aggregator}:${metricName}{${tags}}`;
    const path = `/api/v1/query?query=${encodeURIComponent(query)}&from=${from}&to=${to}`;
    const response = await datadogRequest('GET', path);
    return response;
  } catch (error) {
    console.error(`Erro ao consultar ${metricName}:`, error.message);
    return { series: [] };
  }
}

function calculateStats(series) {
  if (!series || series.length === 0 || !series[0].pointlist) {
    return null;
  }

  const values = series[0].pointlist
    .map(p => p[1])
    .filter(v => v !== null && v !== undefined && !isNaN(v));

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { avg, min, max, p50, p95, p99, count: values.length };
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(ms) {
  if (!ms || ms === 0) return '0ms';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

async function collectAllMetrics() {
  console.log('🔍 Coletando métricas JVM/GC/Heap...\n');

  const metrics = {
    // GC Metrics
    'jvm.gc.parnew.time': await queryMetrics('jvm.gc.parnew.time'),
    'jvm.gc.parnew.count': await queryMetrics('jvm.gc.parnew.count'),
    'jvm.gc.major_collection.time': await queryMetrics('jvm.gc.major_collection.time'),
    'jvm.gc.major_collection.count': await queryMetrics('jvm.gc.major_collection.count'),
    'jvm.gc.minor_collection.time': await queryMetrics('jvm.gc.minor_collection.time'),
    'jvm.gc.minor_collection.count': await queryMetrics('jvm.gc.minor_collection.count'),
    
    // Heap Metrics
    'jvm.heap_memory.used': await queryMetrics('jvm.heap_memory.used'),
    'jvm.heap_memory.max': await queryMetrics('jvm.heap_memory.max'),
    'jvm.heap_memory.committed': await queryMetrics('jvm.heap_memory.committed'),
    'jvm.heap_memory.init': await queryMetrics('jvm.heap_memory.init'),
    
    // Non-Heap Metrics
    'jvm.non_heap_memory.used': await queryMetrics('jvm.non_heap_memory.used'),
    'jvm.non_heap_memory.max': await queryMetrics('jvm.non_heap_memory.max'),
    'jvm.non_heap_memory.committed': await queryMetrics('jvm.non_heap_memory.committed'),
    
    // Thread Metrics
    'jvm.thread_count': await queryMetrics('jvm.thread_count'),
    'jvm.threads.daemon': await queryMetrics('jvm.threads.daemon'),
    'jvm.threads.live': await queryMetrics('jvm.threads.live'),
    'jvm.threads.peak': await queryMetrics('jvm.threads.peak'),
    
    // Class Loading
    'jvm.classes.loaded': await queryMetrics('jvm.classes.loaded'),
    'jvm.classes.unloaded': await queryMetrics('jvm.classes.unloaded'),
  };

  return metrics;
}

function analyzeMetrics(metrics) {
  const analysis = {
    gc: {
      parnewTime: calculateStats(metrics['jvm.gc.parnew.time'].series),
      parnewCount: calculateStats(metrics['jvm.gc.parnew.count'].series),
      majorTime: calculateStats(metrics['jvm.gc.major_collection.time'].series),
      majorCount: calculateStats(metrics['jvm.gc.major_collection.count'].series),
      minorTime: calculateStats(metrics['jvm.gc.minor_collection.time'].series),
      minorCount: calculateStats(metrics['jvm.gc.minor_collection.count'].series),
    },
    heap: {
      used: calculateStats(metrics['jvm.heap_memory.used'].series),
      max: calculateStats(metrics['jvm.heap_memory.max'].series),
      committed: calculateStats(metrics['jvm.heap_memory.committed'].series),
      init: calculateStats(metrics['jvm.heap_memory.init'].series),
    },
    nonHeap: {
      used: calculateStats(metrics['jvm.non_heap_memory.used'].series),
      max: calculateStats(metrics['jvm.non_heap_memory.max'].series),
      committed: calculateStats(metrics['jvm.non_heap_memory.committed'].series),
    },
    threads: {
      count: calculateStats(metrics['jvm.thread_count'].series),
      daemon: calculateStats(metrics['jvm.threads.daemon'].series),
      live: calculateStats(metrics['jvm.threads.live'].series),
      peak: calculateStats(metrics['jvm.threads.peak'].series),
    },
    classes: {
      loaded: calculateStats(metrics['jvm.classes.loaded'].series),
      unloaded: calculateStats(metrics['jvm.classes.unloaded'].series),
    }
  };

  // Calcular percentual de uso do heap
  if (analysis.heap.used && analysis.heap.max && analysis.heap.max.avg > 0) {
    analysis.heap.usagePercent = (analysis.heap.used.avg / analysis.heap.max.avg) * 100;
  }

  return analysis;
}

function generateRecommendations(analysis) {
  const recommendations = [];

  // GC Recommendations
  if (analysis.gc.parnewTime && analysis.gc.parnewTime.avg > 25000) {
    recommendations.push({
      severity: 'critical',
      category: 'GC Performance',
      title: 'GC Pause Time Extremamente Alto',
      description: `O tempo médio de pausa do GC (ParNew) é de ${formatTime(analysis.gc.parnewTime.avg)}, muito acima do threshold recomendado de 25s.`,
      actions: [
        'Aumentar o tamanho do heap (-Xmx) se estiver próximo do limite',
        'Considerar mudança para G1GC ou ZGC para reduzir pausas',
        'Ajustar tamanho da young generation',
        'Investigar memory leaks que podem estar causando GCs frequentes'
      ]
    });
  }

  if (analysis.gc.parnewCount && analysis.gc.parnewCount.avg > 100) {
    recommendations.push({
      severity: 'warning',
      category: 'GC Frequency',
      title: 'GC Muito Frequente',
      description: `GC está sendo executado ${analysis.gc.parnewCount.avg.toFixed(0)} vezes, indicando alta pressão de memória.`,
      actions: [
        'Aumentar tamanho da young generation',
        'Verificar se há memory leaks',
        'Otimizar criação de objetos desnecessários'
      ]
    });
  }

  // Heap Recommendations
  if (analysis.heap.usagePercent && analysis.heap.usagePercent > 85) {
    recommendations.push({
      severity: 'critical',
      category: 'Memory',
      title: 'Heap Usage Crítico',
      description: `O heap está ${analysis.heap.usagePercent.toFixed(1)}% utilizado, muito próximo do limite.`,
      actions: [
        'Aumentar -Xmx imediatamente',
        'Investigar memory leaks',
        'Considerar escalonamento horizontal se o problema persistir'
      ]
    });
  } else if (analysis.heap.usagePercent && analysis.heap.usagePercent > 70) {
    recommendations.push({
      severity: 'warning',
      category: 'Memory',
      title: 'Heap Usage Alto',
      description: `O heap está ${analysis.heap.usagePercent.toFixed(1)}% utilizado.`,
      actions: [
        'Monitorar tendência de crescimento',
        'Considerar aumentar -Xmx preventivamente',
        'Revisar configurações de GC'
      ]
    });
  }

  // Thread Recommendations
  if (analysis.threads.count && analysis.threads.count.avg > 500) {
    recommendations.push({
      severity: 'warning',
      category: 'Threads',
      title: 'Alto Número de Threads',
      description: `Aplicação está usando ${analysis.threads.count.avg.toFixed(0)} threads em média.`,
      actions: [
        'Verificar se há thread leaks',
        'Revisar pools de threads',
        'Considerar otimização de concorrência'
      ]
    });
  }

  return recommendations;
}

function generateHTMLReport(metrics, analysis, recommendations, logoPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportDate = new Date().toLocaleString('pt-BR', { 
    dateStyle: 'full', 
    timeStyle: 'long' 
  });

  let logoBase64 = '';
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
    const ext = path.extname(logoPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    logoBase64 = `data:${mimeType};base64,${logoBase64}`;
  }

  const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
  const warningCount = recommendations.filter(r => r.severity === 'warning').length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório JVM/GC/Heap - ${service}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .logo {
            max-width: 200px;
            margin: 0 auto 1rem;
            display: block;
        }
        
        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .card.critical {
            border-left: 4px solid #e74c3c;
        }
        
        .card.warning {
            border-left: 4px solid #f39c12;
        }
        
        .card.info {
            border-left: 4px solid #3498db;
        }
        
        .card.success {
            border-left: 4px solid #2ecc71;
        }
        
        .card-title {
            font-size: 0.9rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        
        .card-value {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
        }
        
        .card-label {
            font-size: 0.85rem;
            color: #999;
            margin-top: 0.5rem;
        }
        
        .section {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .section-title {
            font-size: 1.8rem;
            color: #333;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #667eea;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        
        .metric-item {
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #667eea;
        }
        
        .metric-name {
            font-weight: 600;
            color: #555;
            margin-bottom: 0.5rem;
        }
        
        .metric-stats {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .stat {
            font-size: 0.9rem;
        }
        
        .stat-label {
            color: #999;
            font-size: 0.8rem;
        }
        
        .stat-value {
            font-weight: 600;
            color: #333;
        }
        
        .recommendation {
            padding: 1.5rem;
            margin-bottom: 1rem;
            border-radius: 6px;
            border-left: 4px solid;
        }
        
        .recommendation.critical {
            background: #fee;
            border-color: #e74c3c;
        }
        
        .recommendation.warning {
            background: #fff8e1;
            border-color: #f39c12;
        }
        
        .recommendation-title {
            font-size: 1.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .recommendation-category {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .recommendation.critical .recommendation-category {
            background: #e74c3c;
            color: white;
        }
        
        .recommendation.warning .recommendation-category {
            background: #f39c12;
            color: white;
        }
        
        .recommendation-description {
            margin-bottom: 1rem;
            color: #555;
        }
        
        .recommendation-actions {
            list-style: none;
        }
        
        .recommendation-actions li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        
        .recommendation-actions li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
        
        .footer {
            background: #2c3e50;
            color: white;
            padding: 2rem;
            text-align: center;
            margin-top: 3rem;
        }
        
        .footer-info {
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 2rem;
            margin-bottom: 1rem;
        }
        
        .footer-item {
            text-align: left;
        }
        
        .footer-item strong {
            display: block;
            margin-bottom: 0.5rem;
            color: #ecf0f1;
        }
        
        .no-data {
            text-align: center;
            padding: 2rem;
            color: #999;
            font-style: italic;
        }
        
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .badge.critical {
            background: #e74c3c;
            color: white;
        }
        
        .badge.warning {
            background: #f39c12;
            color: white;
        }
        
        .badge.success {
            background: #2ecc71;
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : ''}
        <h1>📊 Relatório JVM/GC/Heap</h1>
        <div class="subtitle">${service} - ${env.toUpperCase()}</div>
        <div class="subtitle" style="margin-top: 0.5rem; font-size: 0.9rem;">Gerado em ${reportDate}</div>
    </div>
    
    <div class="container">
        <div class="summary-cards">
            <div class="card ${criticalCount > 0 ? 'critical' : 'success'}">
                <div class="card-title">Problemas Críticos</div>
                <div class="card-value">${criticalCount}</div>
                <div class="card-label">Requerem atenção imediata</div>
            </div>
            <div class="card ${warningCount > 0 ? 'warning' : 'success'}">
                <div class="card-title">Avisos</div>
                <div class="card-value">${warningCount}</div>
                <div class="card-label">Requerem monitoramento</div>
            </div>
            <div class="card info">
                <div class="card-title">Heap Usage</div>
                <div class="card-value">${analysis.heap.usagePercent ? analysis.heap.usagePercent.toFixed(1) + '%' : 'N/A'}</div>
                <div class="card-label">${analysis.heap.used && analysis.heap.max ? formatBytes(analysis.heap.used.avg) + ' / ' + formatBytes(analysis.heap.max.avg) : 'Dados não disponíveis'}</div>
            </div>
            <div class="card ${analysis.gc.parnewTime && analysis.gc.parnewTime.avg > 25000 ? 'critical' : 'info'}">
                <div class="card-title">GC Pause Time</div>
                <div class="card-value">${analysis.gc.parnewTime ? formatTime(analysis.gc.parnewTime.avg) : 'N/A'}</div>
                <div class="card-label">${analysis.gc.parnewTime ? 'Média (últimas 24h)' : 'Dados não disponíveis'}</div>
            </div>
        </div>
        
        ${recommendations.length > 0 ? `
        <div class="section">
            <h2 class="section-title">🚨 Recomendações</h2>
            ${recommendations.map(rec => `
                <div class="recommendation ${rec.severity}">
                    <div class="recommendation-category">${rec.category}</div>
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-description">${rec.description}</div>
                    <ul class="recommendation-actions">
                        ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="section">
            <h2 class="section-title">🗑️ Garbage Collection (GC)</h2>
            <div class="metrics-grid">
                ${analysis.gc.parnewTime ? `
                <div class="metric-item">
                    <div class="metric-name">ParNew Time</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${formatTime(analysis.gc.parnewTime.avg)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Máximo</div>
                            <div class="stat-value">${formatTime(analysis.gc.parnewTime.max)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">P95</div>
                            <div class="stat-value">${formatTime(analysis.gc.parnewTime.p95)}</div>
                        </div>
                    </div>
                </div>
                ` : '<div class="no-data">Dados não disponíveis</div>'}
                
                ${analysis.gc.parnewCount ? `
                <div class="metric-item">
                    <div class="metric-name">ParNew Count</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${analysis.gc.parnewCount.avg.toFixed(0)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Total</div>
                            <div class="stat-value">${analysis.gc.parnewCount.count}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.gc.majorTime ? `
                <div class="metric-item">
                    <div class="metric-name">Major GC Time</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${formatTime(analysis.gc.majorTime.avg)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Máximo</div>
                            <div class="stat-value">${formatTime(analysis.gc.majorTime.max)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.gc.minorTime ? `
                <div class="metric-item">
                    <div class="metric-name">Minor GC Time</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${formatTime(analysis.gc.minorTime.avg)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Máximo</div>
                            <div class="stat-value">${formatTime(analysis.gc.minorTime.max)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">💾 Heap Memory</h2>
            <div class="metrics-grid">
                ${analysis.heap.used ? `
                <div class="metric-item">
                    <div class="metric-name">Heap Used</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${formatBytes(analysis.heap.used.avg)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Máximo</div>
                            <div class="stat-value">${formatBytes(analysis.heap.used.max)}</div>
                        </div>
                    </div>
                </div>
                ` : '<div class="no-data">Dados não disponíveis</div>'}
                
                ${analysis.heap.max ? `
                <div class="metric-item">
                    <div class="metric-name">Heap Max</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Valor</div>
                            <div class="stat-value">${formatBytes(analysis.heap.max.avg)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.heap.committed ? `
                <div class="metric-item">
                    <div class="metric-name">Heap Committed</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${formatBytes(analysis.heap.committed.avg)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${analysis.heap.usagePercent ? `
                <div class="metric-item">
                    <div class="metric-name">Heap Usage %</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Percentual</div>
                            <div class="stat-value ${analysis.heap.usagePercent > 85 ? 'critical' : analysis.heap.usagePercent > 70 ? 'warning' : ''}">${analysis.heap.usagePercent.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${analysis.threads.count ? `
        <div class="section">
            <h2 class="section-title">🧵 Threads</h2>
            <div class="metrics-grid">
                <div class="metric-item">
                    <div class="metric-name">Thread Count</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${analysis.threads.count.avg.toFixed(0)}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Máximo</div>
                            <div class="stat-value">${analysis.threads.count.max.toFixed(0)}</div>
                        </div>
                    </div>
                </div>
                ${analysis.threads.live ? `
                <div class="metric-item">
                    <div class="metric-name">Live Threads</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Média</div>
                            <div class="stat-value">${analysis.threads.live.avg.toFixed(0)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
                ${analysis.threads.peak ? `
                <div class="metric-item">
                    <div class="metric-name">Peak Threads</div>
                    <div class="metric-stats">
                        <div class="stat">
                            <div class="stat-label">Valor</div>
                            <div class="stat-value">${analysis.threads.peak.avg.toFixed(0)}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
    </div>
    
    <div class="footer">
        <div class="footer-info">
            <div class="footer-item">
                <strong>Autor</strong>
                <div>Datadog Agent - Relatório Automatizado</div>
            </div>
            <div class="footer-item">
                <strong>Data</strong>
                <div>${reportDate}</div>
            </div>
            <div class="footer-item">
                <strong>Site</strong>
                <div>${DATADOG_SITE}</div>
            </div>
            <div class="footer-item">
                <strong>Proprietário</strong>
                <div>Codeia Tech</div>
            </div>
        </div>
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #34495e; font-size: 0.9rem; opacity: 0.8;">
            Relatório gerado automaticamente pelo sistema de monitoramento Datadog
        </div>
    </div>
</body>
</html>`;
}

async function main() {
  try {
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 Gerador de Relatório JVM/GC/Heap');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log(`Service: ${service}`);
    console.log(`Environment: ${env}`);
    console.log(`Tags: ${tags}`);
    console.log(`Período: Últimas 24 horas\n`);

    const metrics = await collectAllMetrics();
    const analysis = analyzeMetrics(metrics);
    const recommendations = generateRecommendations(analysis);

    console.log('✅ Métricas coletadas e analisadas\n');

    // Verificar logo
    const logoPath = path.join(__dirname, '..', 'templates', 'logos', 'vertem.png');
    const html = generateHTMLReport(metrics, analysis, recommendations, logoPath);

    // Criar diretório reports se não existir
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Gerar nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `jvm-gc-heap-report-${service}-${env}-${timestamp}.html`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, html, 'utf8');

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ Relatório gerado com sucesso!');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`📄 Arquivo: ${filepath}`);
    console.log(`🔗 Abra no navegador para visualizar\n`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

