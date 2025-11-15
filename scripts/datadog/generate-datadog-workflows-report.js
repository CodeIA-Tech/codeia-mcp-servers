#!/usr/bin/env node
/**
 * Script para gerar relatório HTML5 dos workflows do Datadog
 * Uso: node scripts/generate-datadog-workflows-report.js
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
const DATADOG_API_BASE_V2 = `https://api.${DATADOG_SITE}/api/v2`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

function datadogRequest(method, path, body = null, useV2 = false) {
  return new Promise((resolve, reject) => {
    const baseUrl = useV2 ? DATADOG_API_BASE_V2 : `https://api.${DATADOG_SITE}/api/v1`;
    const url = new URL(`${baseUrl}${path}`);
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

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ data: JSON.parse(data), statusCode: res.statusCode });
          } catch (e) {
            resolve({ data: data, statusCode: res.statusCode });
          }
        } else {
          reject(new Error(`Erro da API: ${res.statusCode} - ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function listWorkflows() {
  const endpoints = [
    { path: '/workflows', v2: true, name: 'v2 workflows' },
    { path: '/workflows', v2: false, name: 'v1 workflows' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await datadogRequest('GET', endpoint.path, null, endpoint.v2);
      return { ...response, endpoint: endpoint.name };
    } catch (error) {
      continue;
    }
  }
  throw new Error('Não foi possível encontrar a API de workflows');
}

async function getWorkflowDetails(workflowId) {
  try {
    const response = await datadogRequest('GET', `/workflows/${workflowId}`, null, true);
    return response.data;
  } catch (error) {
    return null;
  }
}

function analyzeWorkflow(workflow, details) {
  const detailsData = details?.data?.attributes || details?.attributes || {};
  
  const analysis = {
    id: workflow.id,
    name: workflow.attributes?.name || workflow.name,
    description: workflow.attributes?.description || detailsData.description || '',
    status: detailsData.published ? 'Publicado' : 'Rascunho',
    triggerType: workflow.attributes?.triggerTypes?.[0] || 'Unknown',
    createdAt: workflow.attributes?.createdAt,
    updatedAt: workflow.attributes?.updatedAt || details?.attributes?.updatedAt,
    steps: [],
    issues: [],
    recommendations: [],
    complexity: 'Low',
    integrationTypes: new Set(),
    securityConcerns: []
  };

  const spec = detailsData.spec;
  if (spec) {
    // Analisar steps
    if (spec.steps && Array.isArray(spec.steps)) {
      analysis.steps = spec.steps.map(step => {
        const stepAnalysis = {
          name: step.name,
          actionId: step.actionId,
          connectionLabel: step.connectionLabel,
          parameters: step.parameters || [],
          hasErrorHandling: false,
          hasConditionalLogic: step.outboundEdges && step.outboundEdges.length > 1,
          complexity: 'Low'
        };

        // Detectar tipo de integração
        if (step.actionId) {
          if (step.actionId.includes('aws')) {
            analysis.integrationTypes.add('AWS');
          } else if (step.actionId.includes('msteams')) {
            analysis.integrationTypes.add('Microsoft Teams');
          } else if (step.actionId.includes('email')) {
            analysis.integrationTypes.add('Email');
          } else if (step.actionId.includes('datatransformation')) {
            analysis.integrationTypes.add('Data Transformation');
          }
        }

        // Verificar segurança
        if (step.parameters) {
          step.parameters.forEach(param => {
            if (param.value && typeof param.value === 'string') {
              if (param.value.includes('password') || param.value.includes('secret') || param.value.includes('key')) {
                analysis.securityConcerns.push(`Step "${step.name}" pode conter credenciais expostas`);
              }
            }
          });
        }

        return stepAnalysis;
      });

      // Calcular complexidade
      const stepCount = analysis.steps.length;
      const hasConditionals = analysis.steps.some(s => s.hasConditionalLogic);
      if (stepCount > 10 || hasConditionals) {
        analysis.complexity = 'High';
      } else if (stepCount > 5) {
        analysis.complexity = 'Medium';
      }

      // Verificar problemas
      if (analysis.steps.length === 0) {
        analysis.issues.push({ type: 'warning', message: 'Workflow não possui steps definidos' });
      }

      if (analysis.steps.length > 15) {
        analysis.issues.push({ type: 'info', message: 'Workflow muito complexo, considere dividir em workflows menores' });
      }

      // Verificar se há tratamento de erro
      const hasErrorHandling = analysis.steps.some(s => 
        s.actionId?.includes('error') || 
        s.actionId?.includes('catch') ||
        s.outboundEdges?.some(e => e.branchName?.toLowerCase().includes('error'))
      );
      if (!hasErrorHandling && analysis.steps.length > 3) {
        analysis.issues.push({ type: 'warning', message: 'Workflow não possui tratamento de erros explícito' });
      }
    }

    // Verificar triggers
    if (spec.triggers && spec.triggers.length > 0) {
      const triggerTypes = spec.triggers.map(t => {
        if (t.monitorTrigger) return 'Monitor';
        if (t.workflowTrigger) return 'Workflow';
        if (t.scheduleTrigger) return 'Schedule';
        return 'Unknown';
      });
      if (triggerTypes.includes('Monitor')) {
        analysis.recommendations.push({
          type: 'success',
          title: 'Trigger por Monitor Configurado',
          description: 'Workflow configurado para ser acionado por alertas de monitores',
          action: 'Certifique-se de que os monitores estão configurados corretamente'
        });
      }
    }

    // Verificar se há descrição
    if (!analysis.description || analysis.description.trim() === '') {
      analysis.issues.push({ type: 'warning', message: 'Workflow não possui descrição' });
      analysis.recommendations.push({
        type: 'warning',
        title: 'Adicionar Descrição',
        description: 'Workflow sem descrição dificulta a manutenção',
        action: 'Adicione uma descrição clara explicando o propósito do workflow'
      });
    }

    // Verificar tags
    const tags = workflow.attributes?.tags || detailsData.tags || [];
    if (tags.length === 0) {
      analysis.issues.push({ type: 'info', message: 'Workflow não possui tags' });
      analysis.recommendations.push({
        type: 'info',
        title: 'Adicionar Tags',
        description: 'Tags facilitam organização e busca',
        action: 'Adicione tags como: environment:production, team:devops, etc.'
      });
    }

    // Verificar se está publicado
    if (!detailsData.published) {
      analysis.issues.push({ type: 'warning', message: 'Workflow não está publicado' });
      analysis.recommendations.push({
        type: 'warning',
        title: 'Publicar Workflow',
        description: 'Workflow não publicado não será executado',
        action: 'Publique o workflow para que possa ser acionado'
      });
    }

    // Verificar dependências entre workflows
    const triggersWorkflow = analysis.steps.some(s => 
      s.actionId?.includes('triggerWorkflow') || s.actionId?.includes('workflow_automation')
    );
    if (triggersWorkflow) {
      analysis.recommendations.push({
        type: 'success',
        title: 'Integração com Outros Workflows',
        description: 'Workflow integrado com outros workflows',
        action: 'Verifique se os workflows dependentes estão configurados corretamente'
      });
    }

    // Verificar uso de variáveis de ambiente
    const hasEnvVars = spec.connectionEnvs && spec.connectionEnvs.length > 0;
    if (hasEnvVars) {
      analysis.recommendations.push({
        type: 'success',
        title: 'Uso de Variáveis de Ambiente',
        description: 'Workflow utiliza variáveis de ambiente para conexões',
        action: 'Mantenha as variáveis de ambiente atualizadas e seguras'
      });
    }

    // Verificar scripts JavaScript
    const hasJavaScript = analysis.steps.some(s => 
      s.actionId?.includes('datatransformation') || s.actionId?.includes('javascript')
    );
    if (hasJavaScript) {
      analysis.recommendations.push({
        type: 'info',
        title: 'Scripts Customizados',
        description: 'Workflow utiliza scripts JavaScript para transformação de dados',
        action: 'Revise e documente os scripts para facilitar manutenção'
      });
    }
  }

  return analysis;
}

function generateHTMLReport(workflows, analyses, logoPath) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Carregar logo se existir
  let logoBase64 = '';
  if (logoPath && fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    const logoExt = path.extname(logoPath).toLowerCase();
    const mimeType = logoExt === '.png' ? 'image/png' : logoExt === '.jpg' || logoExt === '.jpeg' ? 'image/jpeg' : 'image/png';
    logoBase64 = `data:${mimeType};base64,${logoBuffer.toString('base64')}`;
  }

  const totalSteps = analyses.reduce((sum, a) => sum + a.steps.length, 0);
  const totalIssues = analyses.reduce((sum, a) => sum + a.issues.length, 0);
  const totalRecommendations = analyses.reduce((sum, a) => sum + a.recommendations.length, 0);
  const publishedCount = analyses.filter(a => a.status === 'Publicado').length;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Workflows Datadog - ${dateStr}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
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
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card .number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .stat-card .label {
            color: #666;
            font-size: 0.9em;
        }
        
        .section {
            padding: 40px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .section:last-child {
            border-bottom: none;
        }
        
        .section-title {
            font-size: 2em;
            color: #667eea;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .workflow-card {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
            transition: box-shadow 0.3s;
        }
        
        .workflow-card:hover {
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .workflow-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        
        .workflow-title {
            font-size: 1.8em;
            color: #333;
            margin-bottom: 10px;
        }
        
        .workflow-meta {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        
        .badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .badge-info {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .steps-container {
            margin-top: 20px;
        }
        
        .step-item {
            background: white;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 3px solid #667eea;
        }
        
        .step-name {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .step-details {
            font-size: 0.9em;
            color: #666;
        }
        
        .issues-list {
            margin-top: 20px;
        }
        
        .issue-item {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .issue-warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
        }
        
        .issue-info {
            background: #d1ecf1;
            border-left: 4px solid #17a2b8;
        }
        
        .recommendations {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .recommendation {
            background: white;
            padding: 20px;
            border-radius: 10px;
            border-left: 5px solid;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .recommendation.success {
            border-left-color: #28a745;
        }
        
        .recommendation.warning {
            border-left-color: #ffc107;
        }
        
        .recommendation.info {
            border-left-color: #17a2b8;
        }
        
        .recommendation-title {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .recommendation-description {
            color: #666;
            margin-bottom: 10px;
        }
        
        .recommendation-action {
            font-size: 0.9em;
            color: #667eea;
            font-weight: bold;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            text-align: left;
            margin-bottom: 20px;
        }
        
        .footer-section h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .footer-section p {
            margin-bottom: 5px;
        }
        
        .footer-section a {
            color: #667eea;
            text-decoration: none;
        }
        
        .footer-section a:hover {
            text-decoration: underline;
        }
        
        .complexity-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .complexity-low {
            background: #d4edda;
            color: #155724;
        }
        
        .complexity-medium {
            background: #fff3cd;
            color: #856404;
        }
        
        .complexity-high {
            background: #f8d7da;
            color: #721c24;
        }
        
        @media print {
            body {
                background: white;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo Vertem">` : ''}
            <h1>📊 Relatório de Workflows Datadog</h1>
            <p>Análise Completa e Recomendações de Melhorias</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="number">${workflows.length}</div>
                <div class="label">Workflows</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalSteps}</div>
                <div class="label">Total de Steps</div>
            </div>
            <div class="stat-card">
                <div class="number">${publishedCount}</div>
                <div class="label">Publicados</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalIssues}</div>
                <div class="label">Pontos de Atenção</div>
            </div>
            <div class="stat-card">
                <div class="number">${totalRecommendations}</div>
                <div class="label">Recomendações</div>
            </div>
        </div>
        
        ${analyses.map((analysis, idx) => `
        <div class="section">
            <div class="workflow-card">
                <div class="workflow-header">
                    <div>
                        <h2 class="workflow-title">${analysis.name}</h2>
                        <div class="workflow-meta">
                            <span class="badge ${analysis.status === 'Publicado' ? 'badge-success' : 'badge-warning'}">${analysis.status}</span>
                            <span class="badge badge-info">${analysis.triggerType}</span>
                            <span class="complexity-badge complexity-${analysis.complexity.toLowerCase()}">Complexidade: ${analysis.complexity}</span>
                            <span class="badge badge-info">${analysis.steps.length} Steps</span>
                        </div>
                    </div>
                </div>
                
                ${analysis.description ? `<p style="margin: 15px 0; color: #666;">${analysis.description}</p>` : ''}
                
                <div style="margin-top: 20px; font-size: 0.9em; color: #666;">
                    <strong>ID:</strong> ${analysis.id}<br>
                    <strong>Criado:</strong> ${new Date(analysis.createdAt).toLocaleString('pt-BR')}<br>
                    <strong>Modificado:</strong> ${new Date(analysis.updatedAt).toLocaleString('pt-BR')}
                </div>
                
                ${Array.from(analysis.integrationTypes).length > 0 ? `
                <div style="margin-top: 15px;">
                    <strong>Integrações:</strong> ${Array.from(analysis.integrationTypes).join(', ')}
                </div>
                ` : ''}
                
                ${analysis.steps.length > 0 ? `
                <div class="steps-container">
                    <h3 style="margin-top: 25px; margin-bottom: 15px; color: #667eea;">📋 Steps do Workflow</h3>
                    ${analysis.steps.map((step, stepIdx) => `
                    <div class="step-item">
                        <div class="step-name">${stepIdx + 1}. ${step.name}</div>
                        <div class="step-details">
                            <strong>Ação:</strong> ${step.actionId || 'N/A'}<br>
                            ${step.connectionLabel ? `<strong>Conexão:</strong> ${step.connectionLabel}<br>` : ''}
                            ${step.hasConditionalLogic ? '<span class="badge badge-info">Lógica Condicional</span>' : ''}
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${analysis.issues.length > 0 ? `
                <div class="issues-list">
                    <h3 style="margin-top: 25px; margin-bottom: 15px; color: #ffc107;">⚠️ Pontos de Atenção</h3>
                    ${analysis.issues.map(issue => `
                    <div class="issue-item issue-${issue.type}">
                        <strong>${issue.type === 'warning' ? '⚠️' : 'ℹ️'}</strong>
                        <span>${issue.message}</span>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${analysis.securityConcerns.length > 0 ? `
                <div class="issues-list">
                    <h3 style="margin-top: 25px; margin-bottom: 15px; color: #dc3545;">🔒 Preocupações de Segurança</h3>
                    ${analysis.securityConcerns.map(concern => `
                    <div class="issue-item issue-warning">
                        <strong>🔒</strong>
                        <span>${concern}</span>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${analysis.recommendations.length > 0 ? `
                <div>
                    <h3 style="margin-top: 25px; margin-bottom: 15px; color: #667eea;">💡 Recomendações</h3>
                    <div class="recommendations">
                        ${analysis.recommendations.map(rec => `
                        <div class="recommendation ${rec.type}">
                            <div class="recommendation-title">${rec.title}</div>
                            <div class="recommendation-description">${rec.description}</div>
                            <div class="recommendation-action">📌 ${rec.action}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        `).join('')}
        
        <div class="section">
            <h2 class="section-title">🚀 Melhorias Gerais Recomendadas</h2>
            <div class="recommendations">
                <div class="recommendation warning">
                    <div class="recommendation-title">📝 Documentação</div>
                    <div class="recommendation-description">
                        Todos os workflows devem ter descrições claras explicando seu propósito, 
                        quando são acionados e quais são os resultados esperados.
                    </div>
                    <div class="recommendation-action">📌 Ação: Adicione descrições detalhadas em todos os workflows</div>
                </div>
                
                <div class="recommendation info">
                    <div class="recommendation-title">🏷️ Tags e Organização</div>
                    <div class="recommendation-description">
                        Use tags consistentes para organizar workflows por ambiente, equipe, 
                        propósito ou criticidade.
                    </div>
                    <div class="recommendation-action">📌 Ação: Padronize tags como: environment:production, team:devops, criticality:high</div>
                </div>
                
                <div class="recommendation warning">
                    <div class="recommendation-title">🛡️ Tratamento de Erros</div>
                    <div class="recommendation-description">
                        Implemente tratamento de erros robusto em workflows críticos. 
                        Use steps condicionais para lidar com falhas.
                    </div>
                    <div class="recommendation-action">📌 Ação: Adicione steps de tratamento de erro e notificações de falha</div>
                </div>
                
                <div class="recommendation info">
                    <div class="recommendation-title">🔒 Segurança</div>
                    <div class="recommendation-description">
                        Nunca exponha credenciais, senhas ou chaves de API diretamente nos workflows. 
                        Use variáveis de ambiente ou secrets do Datadog.
                    </div>
                    <div class="recommendation-action">📌 Ação: Revise todos os workflows e migre credenciais para secrets</div>
                </div>
                
                <div class="recommendation info">
                    <div class="recommendation-title">📊 Monitoramento</div>
                    <div class="recommendation-description">
                        Monitore a execução dos workflows. Configure alertas para falhas 
                        e acompanhe métricas de execução.
                    </div>
                    <div class="recommendation-action">📌 Ação: Configure monitores para workflows críticos</div>
                </div>
                
                <div class="recommendation success">
                    <div class="recommendation-title">🔄 Versionamento</div>
                    <div class="recommendation-description">
                        Mantenha histórico de mudanças. Documente alterações importantes 
                        e teste workflows antes de publicar em produção.
                    </div>
                    <div class="recommendation-action">📌 Ação: Implemente processo de revisão antes de publicar</div>
                </div>
                
                <div class="recommendation info">
                    <div class="recommendation-title">⚡ Performance</div>
                    <div class="recommendation-description">
                        Workflows muito complexos podem ser lentos e difíceis de manter. 
                        Considere dividir workflows grandes em workflows menores e reutilizáveis.
                    </div>
                    <div class="recommendation-action">📌 Ação: Avalie se workflows com mais de 10 steps podem ser divididos</div>
                </div>
                
                <div class="recommendation warning">
                    <div class="recommendation-title">🧪 Testes</div>
                    <div class="recommendation-description">
                        Teste workflows em ambiente de desenvolvimento antes de publicar. 
                        Valide todos os cenários possíveis, incluindo casos de erro.
                    </div>
                    <div class="recommendation-action">📌 Ação: Crie ambiente de teste e valide workflows antes de produção</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-grid">
                <div class="footer-section">
                    <h3>📋 Informações do Relatório</h3>
                    <p><strong>Autor:</strong> Datadog Specialist (CodeIA Tech)</p>
                    <p><strong>Gerado em:</strong> ${dateStr}</p>
                    <p><strong>Data/Hora:</strong> ${now.toLocaleString('pt-BR')}</p>
                </div>
                <div class="footer-section">
                    <h3>🏢 Organização</h3>
                    <p><strong>Proprietário:</strong> Vertem / CodeIA Tech</p>
                    <p><strong>Site Datadog:</strong> ${DATADOG_SITE}</p>
                    <p><strong>Total de Workflows:</strong> ${workflows.length}</p>
                </div>
                <div class="footer-section">
                    <h3>🌐 Links Úteis</h3>
                    <p><a href="https://app.${DATADOG_SITE}" target="_blank">📊 Datadog Dashboard</a></p>
                    <p><a href="https://app.${DATADOG_SITE}/workflows" target="_blank">🔄 Workflows</a></p>
                    <p><a href="https://app.${DATADOG_SITE}/monitors" target="_blank">🔔 Monitores</a></p>
                </div>
            </div>
            <div style="border-top: 1px solid #e0e0e0; padding-top: 15px; text-align: center;">
                <p style="margin-bottom: 5px;"><strong>Relatório gerado automaticamente pelo Datadog Specialist</strong></p>
                <p style="color: #666; font-size: 0.9em;">CodeIA Tech - Vertem © ${new Date().getFullYear()} | Gerado via MCP Server</p>
            </div>
        </div>
    </div>
    
    <script>
        // Adicionar animações suaves
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.workflow-card, .stat-card, .recommendation');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });
    </script>
</body>
</html>`;
}

async function main() {
  try {
    console.log('🔍 Buscando workflows no Datadog...');
    const workflowsResponse = await listWorkflows();
    
    const workflows = workflowsResponse.data?.data || workflowsResponse.data || [];
    if (!Array.isArray(workflows)) {
      console.error('❌ Formato de resposta inesperado');
      process.exit(1);
    }

    console.log(`📊 Encontrados ${workflows.length} workflows`);
    console.log('📋 Analisando workflows...');

    const analyses = [];
    for (const workflow of workflows) {
      const workflowId = workflow.id;
      const details = await getWorkflowDetails(workflowId);
      const analysis = analyzeWorkflow(workflow, details);
      analyses.push(analysis);
    }

    // Criar diretório reports se não existir
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Caminho do logo
    const logoPath = path.join(__dirname, '..', 'templates', 'logos', 'logo - helpdesk.png');
    
    // Gerar HTML
    const html = generateHTMLReport(workflows, analyses, logoPath);
    
    // Salvar arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `datadog-workflows-report-${timestamp}.html`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, html, 'utf8');
    
    console.log('');
    console.log('✅ Relatório gerado com sucesso!');
    console.log(`📄 Arquivo: ${filepath}`);
    console.log('');
    console.log('📊 Estatísticas:');
    console.log(`   • Workflows: ${workflows.length}`);
    console.log(`   • Total de Steps: ${analyses.reduce((sum, a) => sum + a.steps.length, 0)}`);
    console.log(`   • Publicados: ${analyses.filter(a => a.status === 'Publicado').length}`);
    console.log(`   • Pontos de Atenção: ${analyses.reduce((sum, a) => sum + a.issues.length, 0)}`);
    console.log(`   • Recomendações: ${analyses.reduce((sum, a) => sum + a.recommendations.length, 0)}`);
    console.log('');
    console.log('💡 Para visualizar:');
    console.log(`   xdg-open ${filepath}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

