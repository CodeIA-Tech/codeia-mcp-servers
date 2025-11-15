#!/usr/bin/env node
/**
 * Busca monitores no Datadog utilizando a API de search.
 * Uso: node scripts/datadog-monitor-search.js "service:motor-porto-tomcat priority:p3"
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

async function searchMonitors(query) {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY (ou DATADOG_API_KEY / DATADOG_APP_KEY) no .env');
  }

  const url = `https://api.${site}/api/v1/monitor/search?query=${encodeURIComponent(query)}`;
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
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.error('Uso: node scripts/datadog-monitor-search.js "<query>"');
    process.exit(1);
  }

  try {
    console.log(`🔎 Buscando monitores com query: ${query}\n`);
    const result = await searchMonitors(query);

    if (!result?.monitors || result.monitors.length === 0) {
      console.log('Nenhum monitor encontrado.');
      return;
    }

    result.monitors.forEach(monitor => {
      console.log('—'.repeat(60));
      console.log(`ID: ${monitor.id}`);
      console.log(`Título: ${monitor.name}`);
      console.log(`Tipo: ${monitor.type}`);
      console.log(`Status: ${monitor.status}`);
      console.log(`Tags: ${monitor.tags.join(', ')}`);
    });
    console.log('—'.repeat(60));
    console.log(`\nTotal: ${result.count}`);
  } catch (error) {
    console.error('❌ Falha ao buscar monitores:', error.message);
    process.exit(1);
  }
}

main();


