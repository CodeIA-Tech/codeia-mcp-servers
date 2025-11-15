#!/usr/bin/env node
/**
 * Cria um único monitor P3 específico (para corrigir o que falhou)
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

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

function getCredentials() {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY no .env');
  }

  return { apiKey, appKey, site };
}

function fixQuery(query) {
  if (!query) return query;
  
  if (query.includes('sum(last_5m):') && query.includes('sum(last_15m):') && query.includes('>') && query.includes('*')) {
    const parts = query.split('>');
    if (parts.length === 2) {
      const leftSide = parts[0].trim();
      const rightSide = parts[1].trim();
      
      const leftMatch = leftSide.match(/sum\(last_5m\):([^}]+})/);
      const rightMatch = rightSide.match(/sum\(last_15m\):([^}]+})/);
      
      if (leftMatch && rightMatch) {
        const metric = leftMatch[1];
        const multiplierMatch = rightSide.match(/\*\s*(\d+\.?\d*)/);
        const multiplier = multiplierMatch ? multiplierMatch[1] : '1.5';
        
        const fixedQuery = `(sum(last_5m):${metric}.as_count() / default_zero(sum(last_15m):${metric}.as_count())) > ${multiplier}`;
        return fixedQuery;
      }
    }
  }
  
  return query;
}

async function main() {
  const creds = getCredentials();
  
  // Query corrigida para o monitor de crescimento de tráfego
  // Usa uma abordagem diferente: monitora se o tráfego atual está acima de um threshold absoluto
  // que representa 50% acima da média esperada
  const name = '[PORTO] [P3] Crescimento anormal de tráfego - motor-porto-tomcat';
  // Query simplificada: monitora tráfego muito alto (indicando crescimento anormal)
  // O threshold deve ser ajustado baseado no tráfego normal do serviço
  const fixedQuery = 'sum(last_5m):sum:trace.servlet.request.hits{service:motor-porto-tomcat,env:prd}.as_count() > 15000';
  
  console.log('Query corrigida:', fixedQuery);
  console.log('\nCriando monitor...\n');
  
  // Carrega template
  const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', 'Template-DatadogMonitors-Porto-p1p2.md');
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  // Adapta template
  let message = template
    .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, 'Tráfego com Variação!')
    .replace(/Usuários insatisfeitos com a performance\./g, 'Serviço com variação de tráfego, monitoramento preventivo.')
    .replace(/P2 - Experiência Degradada\./g, 'P3 - Médio')
    .replace(/motor-porto-tomcat/g, 'motor-porto-tomcat')
    .replace(/APDEX do Motor de Porto/g, 'Tráfego com Variação - motor-porto-tomcat')
    .replace(/Motor de Porto/g, 'motor-porto-tomcat');
  
  const payload = {
    type: 'query alert',
    query: fixedQuery,
    name: name,
    message: message,
    tags: [
      'service:motor-porto-tomcat',
      'env:prd',
      'team:thor-delivery',
      'campaing:portoseguro',
      'acionamento:porto',
      'priority:p3',
      'created-by:observability',
      'integrated-by:script',
      'category:traffic'
    ],
    options: {
      thresholds: {
        critical: 15000,
        critical_recovery: 12000,
        warning: 13000,
        warning_recovery: 11000
      },
      notify_audit: false,
      notify_no_data: false,
      renotify_interval: 0,
      evaluation_delay: 60
    }
  };
  
  const url = `https://api.${creds.site}/api/v1/monitor`;
  const response = await fetch(url, {
    method: 'POST',
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
    console.error('❌ Erro:', text);
    process.exit(1);
  }
  
  console.log('✅ Monitor criado com sucesso!');
  console.log(`   ID: ${data.id}`);
  console.log(`   URL: https://app.${creds.site}/monitors/${data.id}`);
}

main();

