#!/usr/bin/env node
/**
 * Atualiza um monitor no Datadog, ajustando a query para utilizar percentis.
 *
 * Uso:
 *   node scripts/datadog-monitor-update.js <monitorId> "<nova-query>"
 *
 * Se a query não for informada, será aplicada uma query padrão utilizando p95.
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

function getCredentials() {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY (ou DATADOG_API_KEY / DATADOG_APP_KEY) no .env');
  }

  return { apiKey, appKey, site };
}

async function fetchMonitor(monitorId, creds) {
  const url = `https://api.${creds.site}/api/v1/monitor/${monitorId}`;
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': creds.apiKey,
      'DD-APPLICATION-KEY': creds.appKey,
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

async function updateMonitor(monitorId, payload, creds) {
  const url = `https://api.${creds.site}/api/v1/monitor/${monitorId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'DD-API-KEY': creds.apiKey,
      'DD-APPLICATION-KEY': creds.appKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
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

function parseArgs(rawArgs) {
  const args = [...rawArgs];
  const opts = {
    monitorId: args.shift() || '233840750',
    query: null,
    name: null,
    message: null,
    messageFile: null,
    priority: null
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg.startsWith('--query=')) {
      opts.query = arg.replace('--query=', '');
    } else if (arg === '--query') {
      opts.query = args.shift();
    } else if (arg.startsWith('--name=')) {
      opts.name = arg.replace('--name=', '');
    } else if (arg === '--name') {
      opts.name = args.shift();
    } else if (arg.startsWith('--message=')) {
      opts.message = arg.replace('--message=', '');
    } else if (arg === '--message') {
      opts.message = args.shift();
    } else if (arg.startsWith('--message-file=')) {
      opts.messageFile = arg.replace('--message-file=', '');
    } else if (arg === '--message-file') {
      opts.messageFile = args.shift();
    } else if (arg.startsWith('--priority=')) {
      opts.priority = arg.replace('--priority=', '');
    } else if (arg === '--priority') {
      opts.priority = args.shift();
    } else if (arg.trim()) {
      // backwards compatibility: treat as query if not recognized
      opts.query = arg;
    }
  }

  if (opts.messageFile) {
    const absolute = path.isAbsolute(opts.messageFile)
      ? opts.messageFile
      : path.join(process.cwd(), opts.messageFile);
    if (!fs.existsSync(absolute)) {
      throw new Error(`Arquivo de mensagem não encontrado: ${absolute}`);
    }
    opts.message = fs.readFileSync(absolute, 'utf-8');
  }

  return opts;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error('❌ Erro nos argumentos:', error.message);
    process.exit(1);
  }

  const { monitorId, query, name, message, priority } = parsed;

  console.log('🛠️  Atualizando monitor no Datadog');
  console.log(`🆔 Monitor ID: ${monitorId}\n`);

  try {
    const creds = getCredentials();
    const monitor = await fetchMonitor(monitorId, creds);

    console.log('📌 Monitor atual:', monitor.name);
    console.log('🔄 Query antiga:', monitor.query, '\n');

    let tags = Array.isArray(monitor.tags) ? [...monitor.tags] : [];

    if (priority) {
      const normalizedPriority = (() => {
        const trimmed = priority.trim().toLowerCase();
        if (!trimmed) {
          throw new Error('Prioridade informada é vazia.');
        }

        const value = trimmed.startsWith('p') ? trimmed.slice(1) : trimmed;
        if (!/^[0-5]$/.test(value)) {
          throw new Error(`Prioridade inválida: ${priority}. Utilize valores entre P0 e P5.`);
        }
        return `p${value}`;
      })();

      tags = tags.filter(tag => !tag.toLowerCase().startsWith('priority:'));
      tags.push(`priority:${normalizedPriority}`);
    }

    const payload = {
      name: name || monitor.name,
      type: monitor.type,
      query: query || monitor.query,
      message: message || monitor.message,
      options: monitor.options,
      tags
    };

    const updated = await updateMonitor(monitorId, payload, creds);

    console.log('✅ Monitor atualizado com sucesso!');
    console.log('🆕 Query:', updated.query);
  } catch (error) {
    console.error('❌ Falha ao atualizar monitor:', error.message);
    process.exitCode = 1;
  }
}

main();


