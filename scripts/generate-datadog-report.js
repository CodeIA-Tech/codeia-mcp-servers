#!/usr/bin/env node
/**
 * Script para gerar relatório HTML5 dinâmico dos monitores do Datadog
 * Uso: node scripts/generate-datadog-report.js
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
const DATADOG_API_BASE = `https://api.${DATADOG_SITE}/api/v1`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

function datadogRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DATADOG_API_BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function analyzeMonitors(monitors) {
  const analysis = {
    total: monitors.length,
    byStatus: {},
    byType: {},
    byPriority: {},
    criticalIssues: [],
    recommendations: [],
    trends: {
      apmServices: 0,
      azureServices: 0,
      awsServices: 0,
      synthetics: 0,
      kubernetes: 0,
      custom: 0
    }
  };

  monitors.forEach(monitor => {
    // Por status
    const status = monitor.overall_state || 'Unknown';
    analysis.byStatus[status] = (analysis.byStatus[status] || 0) + 1;

    // Por tipo
    const type = monitor.type || 'Unknown';
    analysis.byType[type] = (analysis.byType[type] || 0) + 1;

    // Por prioridade (extrair de tags ou nome)
    let priority = 'P3';
    if (monitor.name) {
      if (monitor.name.includes('[P0]') || monitor.name.includes('P0')) priority = 'P0';
      else if (monitor.name.includes('[P1]') || monitor.name.includes('P1')) priority = 'P1';
      else if (monitor.name.includes('[P2]') || monitor.name.includes('P2')) priority = 'P2';
    }
    analysis.byPriority[priority] = (analysis.byPriority[priority] || 0) + 1;

    // Issues críticos
    if (status === 'Alert' || status === 'Warn') {
      analysis.criticalIssues.push({
        name: monitor.name,
        status: status,
        type: type,
        priority: priority,
        id: monitor.id
      });
    }

    // Trends por categoria
    const name = (monitor.name || '').toLowerCase();
    if (name.includes('apm') || name.includes('service')) analysis.trends.apmServices++;
    else if (name.includes('azure')) analysis.trends.azureServices++;
    else if (name.includes('aws') || name.includes('lambda')) analysis.trends.awsServices++;
    else if (name.includes('synthetic') || name.includes('ssl') || name.includes('test')) analysis.trends.synthetics++;
    else if (name.includes('kubernetes') || name.includes('k8s') || name.includes('pod')) analysis.trends.kubernetes++;
    else analysis.trends.custom++;
  });

  // Gerar recomendações
  const alertCount = analysis.byStatus['Alert'] || 0;
  const warnCount = analysis.byStatus['Warn'] || 0;
  const noDataCount = analysis.byStatus['No Data'] || 0;

  if (alertCount > 0) {
    analysis.recommendations.push({
      type: 'critical',
      title: 'Monitores em Alerta',
      description: `${alertCount} monitores estão em estado de alerta. Requer ação imediata.`,
      action: 'Revisar e corrigir os monitores em alerta prioritariamente.'
    });
  }

  if (warnCount > 0) {
    analysis.recommendations.push({
      type: 'warning',
      title: 'Monitores em Aviso',
      description: `${warnCount} monitores estão em estado de aviso.`,
      action: 'Investigar e prevenir escalação para alerta.'
    });
  }

  if (noDataCount > 0) {
    analysis.recommendations.push({
      type: 'info',
      title: 'Monitores Sem Dados',
      description: `${noDataCount} monitores não estão recebendo dados.`,
      action: 'Verificar se os serviços estão rodando ou se há problemas de coleta de métricas.'
    });
  }

  const queryAlertCount = analysis.byType['query alert'] || 0;
  if (queryAlertCount > analysis.total * 0.5) {
    analysis.recommendations.push({
      type: 'info',
      title: 'Alto Número de Query Alerts',
      description: `${queryAlertCount} monitores são do tipo query alert (${(queryAlertCount/analysis.total*100).toFixed(1)}%).`,
      action: 'Considere otimizar queries ou consolidar monitores similares.'
    });
  }

  const p0Count = analysis.byPriority['P0'] || 0;
  if (p0Count === 0) {
    analysis.recommendations.push({
      type: 'success',
      title: 'Nenhum Monitor P0',
      description: 'Não há monitores classificados como P0 (Crítico).',
      action: 'Mantenha a boa prática de classificar monitores críticos como P0.'
    });
  }

  // Recomendações de Melhorias
  const improvementRecommendations = [];

  // 1. Análise de cobertura de tipos
  const types = Object.keys(analysis.byType);
  if (types.length < 5) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Diversificar Tipos de Monitores',
      description: `Apenas ${types.length} tipos diferentes de monitores. Considere adicionar mais variedade.`,
      action: 'Adicione monitores de diferentes tipos (log alerts, trace analytics, etc.) para melhor cobertura.'
    });
  }

  // 2. Análise de monitores silenciados
  const silencedCount = monitors.filter(m => m.options?.silenced).length;
  if (silencedCount > 0) {
    improvementRecommendations.push({
      type: 'warning',
      title: 'Monitores Silenciados',
      description: `${silencedCount} monitores estão silenciados (${(silencedCount/analysis.total*100).toFixed(1)}%).`,
      action: 'Revisar monitores silenciados e decidir se devem ser reativados ou removidos.'
    });
  }

  // 3. Análise de prioridades
  const p1Count = analysis.byPriority['P1'] || 0;
  const p2Count = analysis.byPriority['P2'] || 0;
  if (p1Count + p2Count > analysis.total * 0.7) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Distribuição de Prioridades',
      description: `${((p1Count + p2Count)/analysis.total*100).toFixed(1)}% dos monitores são P1/P2.`,
      action: 'Considere revisar e ajustar prioridades para melhor alinhamento com criticidade real.'
    });
  }

  // 4. Análise de monitores sem tags
  const monitorsWithoutTags = monitors.filter(m => !m.tags || m.tags.length === 0).length;
  if (monitorsWithoutTags > 0) {
    improvementRecommendations.push({
      type: 'warning',
      title: 'Monitores Sem Tags',
      description: `${monitorsWithoutTags} monitores não possuem tags (${(monitorsWithoutTags/analysis.total*100).toFixed(1)}%).`,
      action: 'Adicionar tags aos monitores facilita organização, filtragem e manutenção.'
    });
  }

  // 5. Análise de thresholds
  const monitorsWithHighThresholds = monitors.filter(m => {
    const thresholds = m.options?.thresholds;
    if (thresholds && thresholds.critical) {
      // Assumindo que thresholds muito altos podem ser problemáticos
      return thresholds.critical > 90;
    }
    return false;
  }).length;

  if (monitorsWithHighThresholds > analysis.total * 0.3) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Thresholds de Alertas',
      description: `${monitorsWithHighThresholds} monitores têm thresholds críticos acima de 90%.`,
      action: 'Revisar thresholds para garantir que alertas sejam acionados antes de problemas críticos.'
    });
  }

  // 6. Análise de notificações
  const monitorsWithoutNotifications = monitors.filter(m => 
    !m.message || !m.message.includes('@') || m.message.trim().length < 10
  ).length;

  if (monitorsWithoutNotifications > 0) {
    improvementRecommendations.push({
      type: 'warning',
      title: 'Monitores Sem Notificações Adequadas',
      description: `${monitorsWithoutNotifications} monitores podem não ter notificações configuradas adequadamente.`,
      action: 'Garanta que todos os monitores críticos tenham notificações configuradas (@slack, @pagerduty, etc.).'
    });
  }

  // 7. Análise de renotify interval
  const monitorsWithoutRenotify = monitors.filter(m => 
    !m.options?.renotify_interval || m.options.renotify_interval === 0
  ).length;

  if (monitorsWithoutRenotify > analysis.total * 0.5) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Configuração de Renotificação',
      description: `${monitorsWithoutRenotify} monitores não têm renotify_interval configurado.`,
      action: 'Configure renotify_interval para evitar spam de alertas e alert fatigue.'
    });
  }

  // 8. Análise de evaluation delay
  const monitorsWithoutEvaluationDelay = monitors.filter(m => 
    !m.options?.evaluation_delay || m.options.evaluation_delay === 0
  ).length;

  if (monitorsWithoutEvaluationDelay > analysis.total * 0.6) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Evaluation Delay',
      description: `${monitorsWithoutEvaluationDelay} monitores não têm evaluation_delay configurado.`,
      action: 'Configure evaluation_delay para métricas que podem ter delay de coleta (ex: 900s para métricas de 5 minutos).'
    });
  }

  // 9. Análise de sintéticos
  const syntheticsCount = analysis.byType['synthetics alert'] || 0;
  if (syntheticsCount > 0 && syntheticsCount < analysis.total * 0.05) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Cobertura de Testes Sintéticos',
      description: `${syntheticsCount} testes sintéticos (${(syntheticsCount/analysis.total*100).toFixed(1)}%).`,
      action: 'Considere aumentar testes sintéticos para validar disponibilidade de endpoints críticos.'
    });
  }

  // 10. Análise de composite monitors
  const compositeCount = analysis.byType['composite'] || 0;
  if (compositeCount === 0 && analysis.total > 100) {
    improvementRecommendations.push({
      type: 'info',
      title: 'Monitoramento Composto',
      description: 'Nenhum monitor composto encontrado.',
      action: 'Considere criar monitores compostos para alertas baseados em múltiplas condições.'
    });
  }

  // Adicionar recomendações de melhorias
  analysis.recommendations.push(...improvementRecommendations);

  return analysis;
}

function generateHTMLReport(monitors, analysis, logoPath) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Converter logo para base64 se existir
  let logoBase64 = '';
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    const ext = path.extname(logoPath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    logoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Monitores Datadog - ${dateStr}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }

        .header img {
            max-height: 80px;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }

        .header .date {
            margin-top: 15px;
            font-size: 0.9em;
            opacity: 0.8;
        }

        .content {
            padding: 40px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .stat-card.alert { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%); color: white; }
        .stat-card.warning { background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%); color: white; }
        .stat-card.success { background: linear-gradient(135deg, #66bb6a 0%, #43a047 100%); color: white; }
        .stat-card.info { background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%); color: white; }

        .stat-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .section {
            margin-bottom: 40px;
        }

        .section-title {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .chart-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e0e0e0;
        }

        .chart-title {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #333;
            font-weight: 600;
        }

        .chart-bar {
            margin-bottom: 10px;
        }

        .chart-bar-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 0.9em;
        }

        .chart-bar-fill {
            height: 25px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 5px;
            transition: width 0.5s ease;
        }

        .recommendations {
            display: grid;
            gap: 15px;
        }

        .recommendation {
            padding: 20px;
            border-radius: 12px;
            border-left: 5px solid;
            background: #f8f9fa;
        }

        .recommendation.critical {
            border-left-color: #ff6b6b;
            background: #fff5f5;
        }

        .recommendation.warning {
            border-left-color: #ffa726;
            background: #fff8e1;
        }

        .recommendation.info {
            border-left-color: #42a5f5;
            background: #e3f2fd;
        }

        .recommendation.success {
            border-left-color: #66bb6a;
            background: #f1f8f4;
        }

        .recommendation-title {
            font-size: 1.3em;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }

        .recommendation-description {
            margin-bottom: 10px;
            color: #666;
            line-height: 1.6;
        }

        .recommendation-action {
            font-weight: 600;
            color: #667eea;
            margin-top: 10px;
        }

        .critical-issues {
            max-height: 400px;
            overflow-y: auto;
        }

        .issue-item {
            padding: 15px;
            margin-bottom: 10px;
            background: #fff;
            border-radius: 8px;
            border-left: 4px solid #ff6b6b;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .issue-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }

        .issue-meta {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
            color: #666;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }

        .badge-alert { background: #ff6b6b; color: white; }
        .badge-warn { background: #ffa726; color: white; }
        .badge-p0 { background: #d32f2f; color: white; }
        .badge-p1 { background: #f57c00; color: white; }
        .badge-p2 { background: #fbc02d; color: white; }
        .badge-p3 { background: #388e3c; color: white; }

        .footer {
            background: #f8f9fa;
            padding: 30px;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }

        .footer a {
            color: #667eea;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .footer a:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .footer h3 {
            margin-bottom: 15px;
        }

        .footer p {
            margin-bottom: 8px;
            line-height: 1.6;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .section {
            animation: fadeIn 0.5s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Vertem Logo">` : ''}
            <h1>Relatório de Monitores Datadog</h1>
            <div class="subtitle">Análise Completa e Recomendações</div>
            <div class="date">Gerado em: ${dateStr}</div>
        </div>

        <div class="content">
            <!-- Estatísticas Principais -->
            <div class="stats-grid">
                <div class="stat-card success">
                    <div class="stat-value">${analysis.total}</div>
                    <div class="stat-label">Total de Monitores</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-value">${analysis.byStatus['OK'] || 0}</div>
                    <div class="stat-label">✅ OK</div>
                </div>
                <div class="stat-card alert">
                    <div class="stat-value">${analysis.byStatus['Alert'] || 0}</div>
                    <div class="stat-label">⚠️ Alert</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-value">${analysis.byStatus['Warn'] || 0}</div>
                    <div class="stat-label">🔶 Warn</div>
                </div>
                <div class="stat-card info">
                    <div class="stat-value">${analysis.byStatus['No Data'] || 0}</div>
                    <div class="stat-label">📭 No Data</div>
                </div>
            </div>

            <!-- Gráficos de Distribuição -->
            <div class="section">
                <h2 class="section-title">📊 Distribuição por Tipo</h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-title">Tipos de Monitores</div>
                        ${Object.entries(analysis.byType)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => `
                            <div class="chart-bar">
                                <div class="chart-bar-label">
                                    <span>${type}</span>
                                    <span>${count}</span>
                                </div>
                                <div class="chart-bar-fill" style="width: ${(count/analysis.total*100)}%"></div>
                            </div>
                          `).join('')}
                    </div>

                    <div class="chart-container">
                        <div class="chart-title">Por Prioridade</div>
                        ${Object.entries(analysis.byPriority)
                          .sort((a, b) => {
                            const order = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3 };
                            return (order[a[0]] || 99) - (order[b[0]] || 99);
                          })
                          .map(([priority, count]) => `
                            <div class="chart-bar">
                                <div class="chart-bar-label">
                                    <span>${priority}</span>
                                    <span>${count}</span>
                                </div>
                                <div class="chart-bar-fill" style="width: ${(count/analysis.total*100)}%"></div>
                            </div>
                          `).join('')}
                    </div>

                    <div class="chart-container">
                        <div class="chart-title">Por Categoria</div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>APM Services</span>
                                <span>${analysis.trends.apmServices}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.apmServices/analysis.total*100)}%"></div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>Azure Services</span>
                                <span>${analysis.trends.azureServices}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.azureServices/analysis.total*100)}%"></div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>AWS Services</span>
                                <span>${analysis.trends.awsServices}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.awsServices/analysis.total*100)}%"></div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>Synthetics</span>
                                <span>${analysis.trends.synthetics}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.synthetics/analysis.total*100)}%"></div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>Kubernetes</span>
                                <span>${analysis.trends.kubernetes}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.kubernetes/analysis.total*100)}%"></div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span>Custom</span>
                                <span>${analysis.trends.custom}</span>
                            </div>
                            <div class="chart-bar-fill" style="width: ${(analysis.trends.custom/analysis.total*100)}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Issues Críticos -->
            ${analysis.criticalIssues.length > 0 ? `
            <div class="section">
                <h2 class="section-title">🚨 Issues Críticos (${analysis.criticalIssues.length})</h2>
                <div class="critical-issues">
                    ${analysis.criticalIssues.slice(0, 50).map(issue => `
                        <div class="issue-item">
                            <div class="issue-name">${escapeHtml(issue.name)}</div>
                            <div class="issue-meta">
                                <span class="badge badge-${issue.status.toLowerCase()}">${issue.status}</span>
                                <span class="badge badge-${issue.priority.toLowerCase()}">${issue.priority}</span>
                                <span>${issue.type}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${analysis.criticalIssues.length > 50 ? `<p style="text-align: center; margin-top: 15px; color: #666;">... e mais ${analysis.criticalIssues.length - 50} issues</p>` : ''}
                </div>
            </div>
            ` : ''}

            <!-- Recomendações -->
            <div class="section">
                <h2 class="section-title">💡 Recomendações e Melhorias</h2>
                <div class="recommendations">
                    ${analysis.recommendations.map(rec => `
                        <div class="recommendation ${rec.type}">
                            <div class="recommendation-title">${rec.title}</div>
                            <div class="recommendation-description">${rec.description}</div>
                            <div class="recommendation-action">📌 Ação Recomendada: ${rec.action}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recomendações de Melhorias Adicionais -->
            <div class="section">
                <h2 class="section-title">🚀 Melhorias Recomendadas</h2>
                <div class="recommendations">
                    <div class="recommendation info">
                        <div class="recommendation-title">📊 Consolidação de Monitores</div>
                        <div class="recommendation-description">
                            Monitores similares podem ser consolidados usando multi-alerts ou composite monitors. 
                            Isso reduz complexidade e melhora manutenibilidade.
                        </div>
                        <div class="recommendation-action">📌 Ação: Identifique monitores com queries similares e considere consolidá-los.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">🏷️ Padronização de Tags</div>
                        <div class="recommendation-description">
                            Tags consistentes facilitam filtragem, agrupamento e manutenção. 
                            Use padrões como: env:prod, team:backend, service:api
                        </div>
                        <div class="recommendation-action">📌 Ação: Revisar e padronizar tags em todos os monitores críticos.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">⏱️ Configuração de Time Windows</div>
                        <div class="recommendation-description">
                            Use time windows apropriados para diferentes tipos de alertas. 
                            Métricas rápidas podem usar 1-5 minutos, enquanto métricas de negócio podem usar 15-30 minutos.
                        </div>
                        <div class="recommendation-action">📌 Ação: Revisar time windows baseado na criticidade e tipo de métrica.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">🔔 Hierarquia de Notificações</div>
                        <div class="recommendation-description">
                            Configure notificações em cascata: P0 → PagerDuty, P1 → Slack crítico, P2 → Slack canal, P3 → Dashboard.
                        </div>
                        <div class="recommendation-action">📌 Ação: Implementar hierarquia de notificações baseada em prioridades.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">📈 SLO-Based Monitoring</div>
                        <div class="recommendation-description">
                            Monitores baseados em SLOs fornecem alertas mais relevantes para o negócio. 
                            Considere implementar monitores de error budget burn rate.
                        </div>
                        <div class="recommendation-action">📌 Ação: Criar monitores baseados em SLOs para serviços críticos.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">🔍 Anomaly Detection</div>
                        <div class="recommendation-description">
                            Para métricas com padrões sazonais, considere usar anomaly detection ao invés de thresholds fixos.
                        </div>
                        <div class="recommendation-action">📌 Ação: Identificar métricas sazonais e aplicar anomaly detection.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">📝 Documentação de Monitores</div>
                        <div class="recommendation-description">
                            Monitores devem ter mensagens claras explicando o que está sendo monitorado, 
                            possíveis causas e ações de correção.
                        </div>
                        <div class="recommendation-action">📌 Ação: Revisar e melhorar mensagens de todos os monitores críticos.</div>
                    </div>
                    
                    <div class="recommendation info">
                        <div class="recommendation-title">🔄 Runbooks e Playbooks</div>
                        <div class="recommendation-description">
                            Cada monitor crítico deve ter um runbook associado com procedimentos de troubleshooting.
                        </div>
                        <div class="recommendation-action">📌 Ação: Criar runbooks para monitores P0 e P1.</div>
                    </div>
                </div>
            </div>

            <!-- Top 10 Monitores por Tipo -->
            <div class="section">
                <h2 class="section-title">📋 Top 10 Tipos de Monitores</h2>
                <div class="charts-grid">
                    ${Object.entries(analysis.byType)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([type, count]) => `
                        <div class="stat-card info">
                            <div class="stat-value">${count}</div>
                            <div class="stat-label">${type}</div>
                        </div>
                      `).join('')}
                </div>
            </div>
        </div>

        <div class="footer">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; text-align: left; margin-bottom: 20px;">
                <div>
                    <h3 style="color: #667eea; margin-bottom: 10px; font-size: 1.1em;">📋 Informações do Relatório</h3>
                    <p><strong>Autor:</strong> Datadog Specialist (CodeIA Tech)</p>
                    <p><strong>Gerado em:</strong> ${dateStr}</p>
                    <p><strong>Data/Hora:</strong> ${now.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 10px; font-size: 1.1em;">🏢 Organização</h3>
                    <p><strong>Proprietário:</strong> Vertem / CodeIA Tech</p>
                    <p><strong>Site Datadog:</strong> ${DATADOG_SITE}</p>
                    <p><strong>Total de Monitores:</strong> ${analysis.total}</p>
                </div>
                <div>
                    <h3 style="color: #667eea; margin-bottom: 10px; font-size: 1.1em;">🌐 Links Úteis</h3>
                    <p><a href="https://app.${DATADOG_SITE}" target="_blank" style="color: #667eea; text-decoration: none;">📊 Datadog Dashboard</a></p>
                    <p><a href="https://app.${DATADOG_SITE}/monitors" target="_blank" style="color: #667eea; text-decoration: none;">🔔 Monitores</a></p>
                    <p><a href="https://app.${DATADOG_SITE}/dashboards" target="_blank" style="color: #667eea; text-decoration: none;">📈 Dashboards</a></p>
                </div>
            </div>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center;">
                <p style="margin-bottom: 5px;"><strong>Relatório gerado automaticamente pelo Datadog Specialist</strong></p>
                <p style="color: #666; font-size: 0.9em;">CodeIA Tech - Vertem © ${new Date().getFullYear()} | Gerado via MCP Server</p>
            </div>
        </div>
    </div>

    <script>
        // Animações ao carregar
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.stat-card, .chart-bar-fill');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.5s ease';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50);
                }, index * 50);
            });
        });
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

async function main() {
  try {
    console.log('🔍 Obtendo monitores do Datadog...');
    const monitors = await datadogRequest('GET', '/monitor');
    
    console.log('📊 Analisando dados...');
    const analysis = analyzeMonitors(monitors);
    
    console.log('📝 Gerando relatório HTML...');
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Procurar logo da Vertem
    const logosDir = path.join(__dirname, '..', 'templates', 'logos');
    let logoPath = null;
    if (fs.existsSync(logosDir)) {
      const logoFiles = fs.readdirSync(logosDir).filter(f => 
        f.toLowerCase().includes('vertem') && 
        /\.(png|jpg|jpeg|svg)$/i.test(f)
      );
      if (logoFiles.length > 0) {
        logoPath = path.join(logosDir, logoFiles[0]);
      }
    }

    const html = generateHTMLReport(monitors, analysis, logoPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(reportsDir, `datadog-report-${timestamp}.html`);
    
    fs.writeFileSync(reportPath, html, 'utf8');
    
    console.log('');
    console.log('✅ Relatório gerado com sucesso!');
    console.log(`📄 Arquivo: ${reportPath}`);
    console.log('');
    console.log('📊 Resumo:');
    console.log(`   • Total de monitores: ${analysis.total}`);
    console.log(`   • OK: ${analysis.byStatus['OK'] || 0}`);
    console.log(`   • Alert: ${analysis.byStatus['Alert'] || 0}`);
    console.log(`   • Warn: ${analysis.byStatus['Warn'] || 0}`);
    console.log(`   • No Data: ${analysis.byStatus['No Data'] || 0}`);
    console.log(`   • Issues críticos: ${analysis.criticalIssues.length}`);
    console.log(`   • Recomendações: ${analysis.recommendations.length}`);
    console.log('');
    console.log('💡 Para visualizar, abra o arquivo HTML no navegador!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    process.exit(1);
  }
}

main();

