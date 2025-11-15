#!/usr/bin/env node
/**
 * Cria o monitor de disponibilidade P2 que falhou
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
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

loadEnv();

const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
const site = process.env.DATADOG_SITE || 'datadoghq.com';

// Carrega template
const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', 'Template-dd-portoseguromiddlewareapprd-p1p2.md');
const template = fs.readFileSync(templatePath, 'utf-8');

const message = template
  .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, 'Disponibilidade Abaixo do Esperado!')
  .replace(/Usuários insatisfeitos com a performance\./g, 'Serviço com disponibilidade abaixo do esperado.')
  .replace(/APDEX do Motor de Porto/g, 'Disponibilidade Abaixo do Esperado - portoseguromiddlewareapprd')
  .replace(/Motor de Porto/g, 'portoseguromiddlewareapprd');

// Query corrigida - usa avg ao invés de sum para evitar problemas
const query = 'avg(last_1h):(sum:trace.servlet.request.errors{service:portoseguromiddlewareapprd,env:prd}.as_count() / default_zero(sum:trace.servlet.request.hits{service:portoseguromiddlewareapprd,env:prd}.as_count())) * 100 > 2';

const payload = {
  type: 'query alert',
  query: query,
  name: '[PORTO] [P2] Disponibilidade abaixo de 98% - portoseguromiddlewareapprd',
  message: message,
  tags: [
    'service:portoseguromiddlewareapprd',
    'env:prd',
    'team:thor-delivery',
    'campaing:portoseguro',
    'acionamento:porto',
    'priority:p2',
    'tipo:aplicacao',
    'created-by:observability',
    'integrated-by:script'
  ],
  options: {
    thresholds: {
      critical: 2,
      critical_recovery: 1,
      warning: 1,
      warning_recovery: 0.5
    },
    notify_audit: false,
    notify_no_data: false,
    renotify_interval: 0,
    evaluation_delay: 60
  }
};

async function createMonitor() {
  const url = `https://api.${site}/api/v1/monitor`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
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
    console.error('❌ Erro:', text);
    process.exit(1);
  }
  
  console.log('✅ Monitor criado com sucesso!');
  console.log(`   ID: ${data.id}`);
  console.log(`   URL: https://app.${site}/monitors/${data.id}`);
}

createMonitor().catch(console.error);

