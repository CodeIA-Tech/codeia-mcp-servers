#!/usr/bin/env node
/**
 * Corrige os monitores P3 criados para usar o serviço correto portoseguromiddlewareapprd
 * ao invés de motor-porto-tomcat
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
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

/**
 * Atualiza um monitor no Datadog
 */
async function updateMonitor(monitorId, creds, updates) {
  const url = `https://api.${creds.site}/api/v1/monitor/${monitorId}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'DD-API-KEY': creds.apiKey,
      'DD-APPLICATION-KEY': creds.appKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
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

/**
 * Busca um monitor por ID
 */
async function getMonitor(monitorId, creds) {
  const url = `https://api.${creds.site}/api/v1/monitor/${monitorId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'DD-API-KEY': creds.apiKey,
      'DD-APPLICATION-KEY': creds.appKey
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

/**
 * Substitui motor-porto-tomcat por portoseguromiddlewareapprd em strings
 */
function replaceService(str) {
  if (!str) return str;
  return str
    .replace(/motor-porto-tomcat/g, 'portoseguromiddlewareapprd')
    .replace(/Motor de Porto/g, 'portoseguromiddlewareapprd')
    .replace(/Motor de Porto/g, 'portoseguromiddlewareapprd');
}

async function main() {
  console.log('🔧 Corrigindo monitores P3 para usar o serviço portoseguromiddlewareapprd...\n');

  const creds = getCredentials();
  
  // IDs dos monitores criados anteriormente
  const monitorIds = [
    236774894, // Taxa de erro 5xx moderada
    236774902, // Latência P50 elevada
    236774904, // Latência P75 elevada
    236774905, // GC Minor time elevado
    236775988  // Crescimento anormal de tráfego
  ];

  const results = {
    success: [],
    errors: []
  };

  for (let i = 0; i < monitorIds.length; i++) {
    const monitorId = monitorIds[i];
    console.log(`[${i + 1}/${monitorIds.length}] Atualizando monitor ID: ${monitorId}`);
    
    try {
      // Busca o monitor atual
      const currentMonitor = await getMonitor(monitorId, creds);
      console.log(`   Nome atual: ${currentMonitor.name}`);
      
      // Prepara atualizações
      const updates = {
        name: replaceService(currentMonitor.name),
        query: replaceService(currentMonitor.query),
        message: replaceService(currentMonitor.message),
        tags: currentMonitor.tags.map(tag => replaceService(tag))
      };
      
      // Atualiza o monitor
      const updated = await updateMonitor(monitorId, creds, updates);
      
      results.success.push({
        id: monitorId,
        oldName: currentMonitor.name,
        newName: updated.name,
        url: `https://app.${creds.site}/monitors/${monitorId}`
      });
      
      console.log(`   ✅ Atualizado com sucesso!`);
      console.log(`   Novo nome: ${updated.name}\n`);
      
    } catch (error) {
      results.errors.push({
        id: monitorId,
        error: error.message
      });
      console.log(`   ❌ Erro: ${error.message}\n`);
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));
  console.log(`✅ Atualizados com sucesso: ${results.success.length}`);
  console.log(`❌ Erros: ${results.errors.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Monitores atualizados:');
    results.success.forEach(r => {
      console.log(`   - ${r.oldName}`);
      console.log(`     → ${r.newName}`);
      console.log(`     ID: ${r.id}`);
      console.log(`     URL: ${r.url}\n`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach(r => {
      console.log(`   - Monitor ID ${r.id}: ${r.error}\n`);
    });
  }
}

main();

