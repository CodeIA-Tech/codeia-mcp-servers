#!/usr/bin/env node
/**
 * Script para listar monitores do Datadog
 * Usa variáveis de ambiente ou arquivo .env
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
  console.error('💡 Configure no arquivo .env ou como variáveis de ambiente');
  process.exit(1);
}

function listMonitors() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DATADOG_API_BASE}/monitor`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
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
            const monitors = JSON.parse(data);
            resolve(monitors);
          } catch (e) {
            reject(new Error(`Erro ao parsear resposta: ${e.message}`));
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

async function main() {
  try {
    console.log('🔍 Listando monitores do Datadog...');
    console.log(`📍 Site: ${DATADOG_SITE}`);
    console.log('');

    const monitors = await listMonitors();

    if (!monitors || monitors.length === 0) {
      console.log('📭 Nenhum monitor encontrado no Datadog');
      return;
    }

    console.log(`📊 Total de monitores encontrados: ${monitors.length}`);
    console.log('');

    // Formatar e exibir
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Monitores do Datadog                                                       │');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');

    monitors.forEach((monitor, index) => {
      const status = monitor.options?.silenced ? '🔇' : monitor.overall_state === 'OK' ? '✅' : '⚠️';
      const type = monitor.type || 'N/A';
      const name = (monitor.name || 'Sem nome').substring(0, 50);
      
      console.log(`│ ${index + 1}. ${status} ${name.padEnd(50)} ${type.padEnd(15)} │`);
      if (monitor.message && monitor.message.length > 0) {
        const msg = monitor.message.substring(0, 65).padEnd(65);
        console.log(`│    ${msg} │`);
      }
    });

    console.log('└─────────────────────────────────────────────────────────────────────────────┘');
    console.log('');

    // Estatísticas
    const okMonitors = monitors.filter(m => m.overall_state === 'OK').length;
    const alertMonitors = monitors.filter(m => m.overall_state === 'Alert').length;
    const warnMonitors = monitors.filter(m => m.overall_state === 'Warn').length;
    const noDataMonitors = monitors.filter(m => m.overall_state === 'No Data').length;

    console.log('📊 Estatísticas:');
    console.log(`   • Total: ${monitors.length}`);
    console.log(`   • ✅ OK: ${okMonitors}`);
    console.log(`   • ⚠️  Alert: ${alertMonitors}`);
    console.log(`   • 🔶 Warn: ${warnMonitors}`);
    console.log(`   • 📭 No Data: ${noDataMonitors}`);

    // Tipos de monitores
    const types = {};
    monitors.forEach(m => {
      const type = m.type || 'Unknown';
      types[type] = (types[type] || 0) + 1;
    });

    console.log('');
    console.log('📋 Tipos de monitores:');
    Object.entries(types).forEach(([type, count]) => {
      console.log(`   • ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erro ao listar monitores:');
    console.error(error.message);
    process.exit(1);
  }
}

main();

