#!/usr/bin/env node
/**
 * Script para obter detalhes de um monitor específico do Datadog
 * Uso: node scripts/get-datadog-monitor.js <monitor_id>
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
  console.error('❌ Erro: DATADOG_API_KEY e DATADOG_APP_KEY devem estar configurados no .env');
  process.exit(1);
}

const monitorId = process.argv[2];

if (!monitorId) {
  console.error('❌ Erro: Forneça o ID do monitor');
  console.error('Uso: node scripts/get-datadog-monitor.js <monitor_id>');
  process.exit(1);
}

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

async function getMonitorDetails(monitorId) {
  try {
    const response = await datadogRequest('GET', `/api/v1/monitor/${monitorId}`);
    return response;
  } catch (error) {
    throw error;
  }
}

function validateMetric(metric, monitorType) {
  const issues = [];
  const recommendations = [];

  // Validar métricas comuns do Datadog Agent
  const validAgentMetrics = [
    'datadog.agent.running',
    'datadog.agent.up',
    'datadog.agent.status',
    'datadog.agent.checks',
    'datadog.agent.collector',
    'datadog.agent.forwarder',
    'datadog.agent.go.memstats',
    'datadog.agent.go.goroutines',
    'datadog.agent.heartbeat',
    'datadog.agent.python',
    'datadog.agent.python.version',
    'datadog.agent.statsd',
    'datadog.agent.uptime',
    'datadog.agent.checks.*',
    'datadog.agent.collector.*',
    'datadog.agent.forwarder.*',
    'datadog.agent.go.*',
    'datadog.agent.python.*',
    'datadog.agent.statsd.*',
    'datadog.agent.uptime.*'
  ];

  // Verificar se a métrica existe
  if (!metric) {
    issues.push('Métrica não especificada');
    return { valid: false, issues, recommendations };
  }

  // Verificar se é uma métrica do Datadog Agent
  const isAgentMetric = metric.startsWith('datadog.agent.');
  const matchesValidPattern = validAgentMetrics.some(pattern => {
    if (pattern.endsWith('.*')) {
      return metric.startsWith(pattern.replace('.*', '.'));
    }
    return metric === pattern;
  });

  if (isAgentMetric && !matchesValidPattern) {
    issues.push(`Métrica "${metric}" pode não ser uma métrica válida do Datadog Agent`);
    recommendations.push('Verifique se a métrica está sendo coletada pelo Agent');
  }

  // Verificar formato da query
  if (monitorType === 'metric alert' || monitorType === 'query alert') {
    // Verificar se a query está bem formada
    if (metric.includes('{') && !metric.includes('}')) {
      issues.push('Query de métrica malformada: chaves não balanceadas');
    }
  }

  // Recomendações gerais
  if (isAgentMetric) {
    recommendations.push('Certifique-se de que o Datadog Agent está rodando e coletando métricas');
    recommendations.push('Verifique os logs do Agent: sudo tail -f /var/log/datadog/agent.log');
  }

  return {
    valid: issues.length === 0,
    issues,
    recommendations
  };
}

function formatMonitor(monitor) {
  const type = monitor.type || 'unknown';
  const query = monitor.query || '';
  const message = monitor.message || '';
  const name = monitor.name || 'Sem nome';
  const tags = monitor.tags || [];
  const options = monitor.options || {};

  // Extrair métrica da query
  let metric = '';
  if (query) {
    // Tentar extrair a métrica da query
    const metricMatch = query.match(/([a-zA-Z0-9_.]+)\{/);
    if (metricMatch) {
      metric = metricMatch[1];
    } else {
      // Pode ser uma query sem tags
      const parts = query.split('(');
      if (parts.length > 0) {
        metric = parts[0].trim();
      }
    }
  }

  return {
    id: monitor.id,
    name,
    type,
    query,
    metric,
    message,
    tags,
    options,
    state: monitor.overall_state || 'unknown',
    created: monitor.created,
    modified: monitor.modified,
    creator: monitor.creator?.name || 'unknown',
    org_id: monitor.org_id
  };
}

async function main() {
  try {
    console.log(`🔍 Buscando monitor ID: ${monitorId}...\n`);

    const monitor = await getMonitorDetails(monitorId);

    if (!monitor) {
      console.error('❌ Monitor não encontrado');
      process.exit(1);
    }

    const formatted = formatMonitor(monitor);

    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 DETALHES DO MONITOR');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log(`📌 ID: ${formatted.id}`);
    console.log(`📝 Nome: ${formatted.name}`);
    console.log(`🔧 Tipo: ${formatted.type}`);
    console.log(`📈 Estado: ${formatted.state}`);
    console.log(`👤 Criado por: ${formatted.creator}`);
    console.log(`📅 Criado em: ${new Date(formatted.created * 1000).toLocaleString('pt-BR')}`);
    console.log(`📅 Modificado em: ${new Date(formatted.modified * 1000).toLocaleString('pt-BR')}`);
    console.log(`🏷️  Tags: ${formatted.tags.length > 0 ? formatted.tags.join(', ') : 'Nenhuma'}`);

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('📊 QUERY/MÉTRICA');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log(`Query completa:`);
    console.log(`  ${formatted.query}\n`);

    if (formatted.metric) {
      console.log(`Métrica extraída: ${formatted.metric}\n`);

      // Validar métrica
      const validation = validateMetric(formatted.metric, formatted.type);

      console.log('════════════════════════════════════════════════════════════');
      console.log('✅ VALIDAÇÃO DA MÉTRICA');
      console.log('════════════════════════════════════════════════════════════\n');

      if (validation.valid) {
        console.log('✅ Métrica parece estar correta\n');
      } else {
        console.log('⚠️  Problemas encontrados:\n');
        validation.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
        console.log('');
      }

      if (validation.recommendations.length > 0) {
        console.log('💡 Recomendações:\n');
        validation.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
        console.log('');
      }
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('⚙️  OPÇÕES DO MONITOR');
    console.log('════════════════════════════════════════════════════════════\n');

    if (formatted.options.thresholds) {
      console.log('Limiares:');
      Object.entries(formatted.options.thresholds).forEach(([level, value]) => {
        console.log(`  ${level}: ${value}`);
      });
      console.log('');
    }

    if (formatted.options.notify_no_data !== undefined) {
      console.log(`Notificar quando não houver dados: ${formatted.options.notify_no_data}`);
    }

    if (formatted.options.notify_audit !== undefined) {
      console.log(`Notificar auditoria: ${formatted.options.notify_audit}`);
    }

    if (formatted.options.require_full_window !== undefined) {
      console.log(`Requer janela completa: ${formatted.options.require_full_window}`);
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('💬 MENSAGEM DO MONITOR');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(formatted.message || '(Sem mensagem)');
    console.log('');

    // Verificar se é métrica do Datadog Agent
    if (formatted.metric && formatted.metric.startsWith('datadog.agent.')) {
      console.log('════════════════════════════════════════════════════════════');
      console.log('🤖 MÉTRICA DO DATADOG AGENT');
      console.log('════════════════════════════════════════════════════════════\n');
      console.log('Esta métrica é do Datadog Agent. Verificações recomendadas:\n');
      console.log('1. Verificar se o Agent está rodando:');
      console.log('   sudo systemctl status datadog-agent\n');
      console.log('2. Verificar se a métrica está sendo coletada:');
      console.log('   sudo datadog-agent status\n');
      console.log('3. Verificar logs do Agent:');
      console.log('   sudo tail -f /var/log/datadog/agent.log\n');
      console.log('4. Verificar métricas disponíveis:');
      console.log('   sudo datadog-agent status | grep -A 20 "Metrics"');
      console.log('');
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('🔗 LINK DO MONITOR');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`https://app.datadoghq.com/monitor/${monitorId}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

