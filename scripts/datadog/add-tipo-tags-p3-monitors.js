#!/usr/bin/env node
/**
 * Adiciona tags de tipo (aplicação/infraestrutura) aos monitores P3
 * do serviço portoseguromiddlewareapprd
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
 * Determina se o monitor é de aplicação ou infraestrutura baseado no nome
 */
function determineTipo(monitorName) {
  const nameLower = monitorName.toLowerCase();
  
  // Infraestrutura: CPU, memória, disco, rede, pods, containers, kubernetes, JVM, GC, heap, threads
  const infraKeywords = [
    'cpu', 'memória', 'memory', 'disco', 'disk', 'network', 'packet', 
    'pod', 'container', 'kubernetes', 'jvm', 'gc', 'heap', 'thread', 
    'file descriptor', 'oom', 'crash', 'saturation', 'hpa', 'node',
    'cluster', 'namespace', 'kube'
  ];
  
  // Aplicação: erro, latência, tráfego, apdex, disponibilidade, database, query, connection
  const appKeywords = [
    'erro', 'error', 'latência', 'latency', 'tráfego', 'traffic', 
    'apdex', 'disponibilidade', 'availability', 'database', 'query', 
    'connection', 'timeout', '5xx', '4xx', 'p50', 'p75', 'p95', 'p99',
    'sli', 'slo', 'trace', 'request', 'response'
  ];
  
  // Verifica primeiro infraestrutura (mais específico)
  for (const keyword of infraKeywords) {
    if (nameLower.includes(keyword)) {
      return 'infraestrutura';
    }
  }
  
  // Depois verifica aplicação
  for (const keyword of appKeywords) {
    if (nameLower.includes(keyword)) {
      return 'aplicacao';
    }
  }
  
  // Default: se não conseguir determinar, assume aplicação
  return 'aplicacao';
}

/**
 * Busca todos os monitores do serviço portoseguromiddlewareapprd com prioridade P3
 */
async function searchMonitors(creds) {
  const url = `https://api.${creds.site}/api/v1/monitor/search?query=service:portoseguromiddlewareapprd%20priority:p3`;
  
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
    // Se a busca falhar, retorna os IDs conhecidos dos monitores P3
    console.log(`⚠️  Busca retornou erro ${response.status}, usando IDs conhecidos dos monitores P3`);
    return [
      { id: 236774894 },
      { id: 236774902 },
      { id: 236774904 },
      { id: 236774905 },
      { id: 236775988 },
      { id: 53170510 }
    ];
  }

  return data.monitors || [];
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

async function main() {
  console.log('🏷️  Adicionando tags de tipo (aplicação/infraestrutura) aos monitores P3...\n');
  console.log('📋 Serviço: portoseguromiddlewareapprd\n');

  const creds = getCredentials();
  
  // Busca todos os monitores P3 do serviço
  console.log('🔍 Buscando monitores P3 do serviço portoseguromiddlewareapprd...');
  const monitors = await searchMonitors(creds);
  console.log(`✅ ${monitors.length} monitores encontrados\n`);

  if (monitors.length === 0) {
    console.log('⚠️  Nenhum monitor P3 encontrado para o serviço portoseguromiddlewareapprd');
    return;
  }

  const results = {
    success: [],
    errors: []
  };

  for (let i = 0; i < monitors.length; i++) {
    const monitorInfo = monitors[i];
    const monitorId = monitorInfo.id;
    
    console.log(`[${i + 1}/${monitors.length}] Processando monitor ID: ${monitorId}`);
    
    try {
      // Busca o monitor completo
      const currentMonitor = await getMonitor(monitorId, creds);
      console.log(`   Nome: ${currentMonitor.name}`);
      
      // Determina o tipo
      const tipo = determineTipo(currentMonitor.name);
      console.log(`   Tipo determinado: ${tipo}`);
      
      // Prepara as tags atualizadas
      const currentTags = currentMonitor.tags || [];
      
      // Remove tags de tipo existentes se houver
      const tagsWithoutTipo = currentTags.filter(tag => 
        !tag.startsWith('tipo:') && 
        !tag.startsWith('type:')
      );
      
      // Adiciona a nova tag de tipo
      const newTags = [...tagsWithoutTipo, `tipo:${tipo}`];
      
      // Prepara atualizações
      const updates = {
        tags: newTags
      };
      
      // Atualiza o monitor
      await updateMonitor(monitorId, creds, updates);
      
      results.success.push({
        id: monitorId,
        name: currentMonitor.name,
        tipo: tipo,
        url: `https://app.${creds.site}/monitors/${monitorId}`
      });
      
      console.log(`   ✅ Tag adicionada: tipo:${tipo}\n`);
      
    } catch (error) {
      results.errors.push({
        id: monitorId,
        name: monitorInfo.name || `Monitor ${monitorId}`,
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
    
    // Agrupa por tipo
    const porTipo = {
      aplicacao: [],
      infraestrutura: []
    };
    
    results.success.forEach(r => {
      porTipo[r.tipo].push(r);
    });
    
    if (porTipo.aplicacao.length > 0) {
      console.log(`\n📱 Aplicação (${porTipo.aplicacao.length}):`);
      porTipo.aplicacao.forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     ID: ${r.id}`);
        console.log(`     URL: ${r.url}\n`);
      });
    }
    
    if (porTipo.infraestrutura.length > 0) {
      console.log(`\n🖥️  Infraestrutura (${porTipo.infraestrutura.length}):`);
      porTipo.infraestrutura.forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     ID: ${r.id}`);
        console.log(`     URL: ${r.url}\n`);
      });
    }
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach(r => {
      console.log(`   - ${r.name} (ID: ${r.id}): ${r.error}\n`);
    });
  }
}

main();

