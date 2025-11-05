#!/usr/bin/env node
/**
 * Script para testar conexão com Datadog usando variáveis de ambiente
 * Pode ser usado localmente ou em CI/CD com GitHub Secrets
 */

const https = require('https');

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const DATADOG_APP_KEY = process.env.DATADOG_APP_KEY;
const DATADOG_SITE = process.env.DATADOG_SITE || 'datadoghq.com';
const DATADOG_API_BASE = `https://api.${DATADOG_SITE}/api/v1`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  console.error('💡 Configure via variáveis de ambiente ou GitHub Secrets');
  process.exit(1);
}

function testConnection() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DATADOG_API_BASE}/validate`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve({ valid: true, message: 'Connection successful' });
          }
        } else {
          reject(new Error(`Connection failed: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Testando conexão com Datadog...');
    console.log(`📍 Site: ${DATADOG_SITE}`);
    console.log(`🔑 API Key: ${DATADOG_API_KEY.substring(0, 8)}...`);
    
    const result = await testConnection();
    console.log('✅ Conexão com Datadog estabelecida com sucesso!');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao conectar com Datadog:');
    console.error(error.message);
    process.exit(1);
  }
}

main();

