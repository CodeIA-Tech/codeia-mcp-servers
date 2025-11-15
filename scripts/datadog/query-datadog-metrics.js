#!/usr/bin/env node
/**
 * Script para consultar métricas do Datadog via API
 * Uso: node scripts/query-datadog-metrics.js <metric_name> [from] [to]
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

async function queryMetrics(query, from, to) {
  try {
    const path = `/api/v1/query?query=${encodeURIComponent(query)}&from=${from}&to=${to}`;
    const response = await datadogRequest('GET', path);
    return response;
  } catch (error) {
    throw error;
  }
}

function formatTimestamp(ts) {
  return new Date(ts * 1000).toLocaleString('pt-BR');
}

function formatValue(value) {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    // Se for tempo em ms, formatar
    if (value > 1000) {
      return `${(value / 1000).toFixed(2)}s (${value.toFixed(0)}ms)`;
    }
    return value.toFixed(2);
  }
  return value;
}

async function main() {
  const metricName = process.argv[2] || 'jvm.gc.parnew.time';
  const from = parseInt(process.argv[3]) || Math.floor(Date.now() / 1000) - 3600; // Última hora
  const to = parseInt(process.argv[4]) || Math.floor(Date.now() / 1000);

  const tags = 'service:motor-porto-tomcat,env:prd';
  const query = `avg:${metricName}{${tags}}`;

  try {
    console.log('════════════════════════════════════════════════════════════');
    console.log('📊 CONSULTA DE MÉTRICAS NO DATADOG');
    console.log('════════════════════════════════════════════════════════════\n');

    console.log(`Métrica: ${metricName}`);
    console.log(`Tags: ${tags}`);
    console.log(`Período: ${formatTimestamp(from)} até ${formatTimestamp(to)}`);
    console.log(`Query: ${query}\n`);

    console.log('🔍 Consultando métricas...\n');

    const result = await queryMetrics(query, from, to);

    if (!result.series || result.series.length === 0) {
      console.log('⚠️  Nenhuma série de dados encontrada para esta métrica.');
      console.log('\n💡 Possíveis causas:');
      console.log('   • A métrica não está sendo coletada');
      console.log('   • As tags não correspondem a nenhuma instância');
      console.log('   • O período selecionado não tem dados');
      console.log('\n🔗 Verifique no Datadog:');
      console.log(`   https://app.${DATADOG_SITE}/metric/explorer?exp_metric=${metricName}`);
      return;
    }

    console.log(`✅ ${result.series.length} série(s) de dados encontrada(s)\n`);

    result.series.forEach((series, index) => {
      console.log(`════════════════════════════════════════════════════════════`);
      console.log(`📈 Série ${index + 1}`);
      console.log(`════════════════════════════════════════════════════════════\n`);

      if (series.scope) {
        console.log(`Escopo: ${series.scope}`);
      }

      if (series.tag_set && series.tag_set.length > 0) {
        console.log(`Tags: ${series.tag_set.join(', ')}`);
      }

      if (series.pointlist && series.pointlist.length > 0) {
        console.log(`\nPontos de dados: ${series.pointlist.length}\n`);

        // Calcular estatísticas
        const values = series.pointlist.map(p => p[1]).filter(v => v !== null && v !== undefined);
        if (values.length > 0) {
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          console.log('📊 Estatísticas:');
          console.log(`   • Média: ${formatValue(avg)}`);
          console.log(`   • Mínimo: ${formatValue(min)}`);
          console.log(`   • Máximo: ${formatValue(max)}`);
          console.log(`   • Total de pontos: ${values.length}`);

          // Últimos valores
          console.log('\n📅 Últimos 5 valores:');
          series.pointlist.slice(-5).forEach(point => {
            const [timestamp, value] = point;
            console.log(`   ${formatTimestamp(timestamp)}: ${formatValue(value)}`);
          });

          // Verificar se está acima do threshold
          if (metricName.includes('gc') && metricName.includes('time')) {
            const threshold = 25000; // 25 segundos
            if (max > threshold) {
              console.log(`\n⚠️  ALERTA: Valor máximo (${formatValue(max)}) está acima do threshold de ${formatValue(threshold)}`);
            }
          }
        } else {
          console.log('⚠️  Nenhum valor válido encontrado na série');
        }
      } else {
        console.log('⚠️  Nenhum ponto de dados encontrado');
      }

      console.log('');
    });

    console.log('════════════════════════════════════════════════════════════');
    console.log('🔗 Links úteis:');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log(`Métrica Explorer: https://app.${DATADOG_SITE}/metric/explorer?exp_metric=${metricName}`);
    console.log(`Dashboard: https://app.${DATADOG_SITE}/dashboard`);
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

