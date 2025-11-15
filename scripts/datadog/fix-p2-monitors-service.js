#!/usr/bin/env node
/**
 * Corrige os monitores P2 criados para usar o serviço correto portoseguromiddlewareapprd
 * e corrige as queries dos monitores que falharam
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

/**
 * Substitui motor-porto-tomcat por portoseguromiddlewareapprd em strings
 */
function replaceService(str) {
  if (!str) return str;
  return str.replace(/motor-porto-tomcat/g, 'portoseguromiddlewareapprd');
}

/**
 * Corrige queries problemáticas
 */
function fixProblematicQuery(query, monitorName) {
  if (!query) return query;
  
  const nameLower = monitorName.toLowerCase();
  
  // Query de queda de tráfego - usa threshold absoluto
  if (nameLower.includes('queda') && nameLower.includes('tráfego')) {
    return 'sum(last_10m):sum:trace.servlet.request.hits{service:portoseguromiddlewareapprd,env:prd}.as_count() < 5000';
  }
  
  // Query de disponibilidade - corrige divisão por zero
  if (nameLower.includes('disponibilidade')) {
    return 'sum(last_1h):sum:trace.servlet.request.errors{service:portoseguromiddlewareapprd,env:prd}.as_count() / default_zero(sum(last_1h):sum:trace.servlet.request.hits{service:portoseguromiddlewareapprd,env:prd}.as_count()) * 100 > 2';
  }
  
  return query;
}

async function main() {
  console.log('🔧 Corrigindo monitores P2 para usar o serviço portoseguromiddlewareapprd...\n');

  const creds = getCredentials();
  
  // IDs dos monitores P2 criados
  const monitorIds = [
    236816453, // Taxa de erro 5xx elevada
    236816454, // Taxa de erro 4xx muito elevada
    236816455, // Erros de timeout
    236816456, // Latência P95 muito elevada
    236816459, // Latência P99 muito elevada
    236816460, // Tráfego muito alto
    236816462, // CPU muito alto
    236816469, // Memória muito alta
    236816470, // Disco muito alto
    236816488, // Packet loss elevado
    236816489, // JVM Heap Memory muito alto
    236816491, // File descriptors elevado
    236816494, // Queries lentas no database
    236816500  // Connection pool esgotado
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

  // Agora cria os 2 monitores que falharam
  console.log('\n🔧 Criando monitores que falharam anteriormente...\n');
  
  const failedMonitors = [
    {
      name: '[PORTO] [P2] Queda moderada de tráfego - portoseguromiddlewareapprd',
      query: 'sum(last_10m):sum:trace.servlet.request.hits{service:portoseguromiddlewareapprd,env:prd}.as_count() < 5000',
      thresholds: { critical: 5000, critical_recovery: 7000, warning: 6000, warning_recovery: 8000 }
    },
    {
      name: '[PORTO] [P2] Disponibilidade abaixo de 98% - portoseguromiddlewareapprd',
      query: 'sum(last_1h):sum:trace.servlet.request.errors{service:portoseguromiddlewareapprd,env:prd}.as_count() / default_zero(sum(last_1h):sum:trace.servlet.request.hits{service:portoseguromiddlewareapprd,env:prd}.as_count()) * 100 > 2',
      thresholds: { critical: 2, critical_recovery: 1, warning: 1, warning_recovery: 0.5 }
    }
  ];

  // Carrega template
  const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', 'Template-dd-portoseguromiddlewareapprd-p1p2.md');
  const template = fs.readFileSync(templatePath, 'utf-8');

  for (let i = 0; i < failedMonitors.length; i++) {
    const monitor = failedMonitors[i];
    console.log(`[${i + 1}/${failedMonitors.length}] Criando: ${monitor.name}`);
    
    try {
      // Adapta template
      const nameLower = monitor.name.toLowerCase();
      let alertType = 'Monitoramento de Atenção';
      let impacto = 'Serviço requerendo atenção.';
      
      if (nameLower.includes('queda') || nameLower.includes('tráfego')) {
        alertType = 'Tráfego Anormal';
        impacto = 'Serviço com tráfego anormal, possível degradação.';
      } else if (nameLower.includes('disponibilidade')) {
        alertType = 'Disponibilidade Abaixo do Esperado';
        impacto = 'Serviço com disponibilidade abaixo do esperado.';
      }
      
      const message = template
        .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, `${alertType}!`)
        .replace(/Usuários insatisfeitos com a performance\./g, impacto)
        .replace(/APDEX do Motor de Porto/g, `${alertType} - portoseguromiddlewareapprd`)
        .replace(/Motor de Porto/g, 'portoseguromiddlewareapprd');
      
      const payload = {
        type: 'query alert',
        query: monitor.query,
        name: monitor.name,
        message: message,
        tags: [
          'service:portoseguromiddlewareapprd',
          'env:prd',
          'team:thor-delivery',
          'campaing:portoseguro',
          'acionamento:porto',
          'priority:p2',
          `tipo:${nameLower.includes('cpu') || nameLower.includes('memória') || nameLower.includes('disco') ? 'infraestrutura' : 'aplicacao'}`,
          'created-by:observability',
          'integrated-by:script'
        ],
        options: {
          thresholds: monitor.thresholds,
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
        throw new Error(`Erro ${response.status}: ${text}`);
      }
      
      results.success.push({
        id: data.id,
        oldName: monitor.name,
        newName: monitor.name,
        url: `https://app.${creds.site}/monitors/${data.id}`
      });
      
      console.log(`   ✅ Criado com sucesso! ID: ${data.id}\n`);
      
    } catch (error) {
      results.errors.push({
        name: monitor.name,
        error: error.message
      });
      console.log(`   ❌ Erro: ${error.message}\n`);
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO');
  console.log('='.repeat(60));
  console.log(`✅ Atualizados/Criados com sucesso: ${results.success.length}`);
  console.log(`❌ Erros: ${results.errors.length}`);
  
  if (results.success.length > 0) {
    console.log('\n✅ Monitores processados:');
    results.success.forEach(r => {
      console.log(`   - ${r.newName}`);
      console.log(`     ID: ${r.id}`);
      console.log(`     URL: ${r.url}\n`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach(r => {
      console.log(`   - ${r.name || `Monitor ID ${r.id}`}: ${r.error}\n`);
    });
  }
}

main();

