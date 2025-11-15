#!/usr/bin/env node
/**
 * Consulta detalhes de um monitor no Datadog utilizando as credenciais do .env
 * Uso: node scripts/datadog-monitor-fetch.js <monitorId>
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
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

async function fetchMonitor(monitorId) {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY (ou DATADOG_API_KEY / DATADOG_APP_KEY) no .env');
  }

  const url = `https://api.${site}/api/v1/monitor/${monitorId}`;
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return data;
}

async function main() {
  const monitorId = process.argv[2] || '233840750';

  console.log('🔍 Consultando monitor no Datadog');
  console.log(`🆔 Monitor ID: ${monitorId}\n`);

  try {
    const monitor = await fetchMonitor(monitorId);

    console.log('📌 Título:', monitor?.name || '—');
    console.log('📝 Tipo:', monitor?.type || '—');
    console.log('🧪 Query:\n', monitor?.query || '—', '\n');

    if (monitor?.options) {
      console.log('⚙️  Opções principais:', {
        thresholds: monitor.options?.thresholds,
        renotify_interval: monitor.options?.renotify_interval,
        escalation_message: monitor.options?.escalation_message
      });
    }

    if (monitor?.tags) {
      console.log('\n🏷️  Tags:', monitor.tags.join(', '));
    }
  } catch (error) {
    console.error('❌ Falha ao consultar monitor:', error.message);
    process.exitCode = 1;
  }
}

main();


