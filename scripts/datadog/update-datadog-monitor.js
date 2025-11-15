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

const monitorId = process.argv[2];
const newQuery = process.argv.slice(3).join(' ');

if (!monitorId) {
  console.error('Uso: node scripts/update-datadog-monitor.js <monitor_id> <nova_query>');
  process.exit(1);
}
if (!newQuery) {
  console.error('❌ Forneça a nova query.');
  process.exit(1);
}

function ddRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `api.${DATADOG_SITE}`,
      port: 443,
      path,
      method,
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
          return reject(new Error(`Erro ${res.statusCode}: ${body}`));
        } catch (e) {
          return reject(new Error(`Parse error: ${e.message} body=${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getMonitor(id) {
  return ddRequest('GET', `/api/v1/monitor/${id}`);
}

async function updateMonitor(id, payload) {
  return ddRequest('PUT', `/api/v1/monitor/${id}`, payload);
}

(async () => {
  try {
    console.log(`🔍 Lendo monitor ${monitorId}...`);
    const current = await getMonitor(monitorId);

    const payload = {
      name: current.name,
      type: current.type,
      query: newQuery,
      message: current.message,
      tags: current.tags,
      priority: current.priority,
      options: {
        ...current.options,
        require_full_window: true, // manter janela completa
      }
    };

    console.log('📝 Nova query:');
    console.log(newQuery);

    console.log('🚀 Atualizando monitor...');
    const res = await updateMonitor(monitorId, payload);
    console.log('✅ Monitor atualizado.');
    console.log(`🔗 https://app.${DATADOG_SITE}/monitor/${monitorId}`);
  } catch (err) {
    console.error('❌ Falha ao atualizar monitor:', err.message);
    process.exit(1);
  }
})();
