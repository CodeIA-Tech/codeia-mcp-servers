#!/usr/bin/env node
/**
 * Atualiza as mensagens dos monitores P3 do serviço portoseguromiddlewareapprd
 * para usar o template Template-dd-portoseguromiddlewareapprd-p3p4p5.md
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
 * Lê o template específico para portoseguromiddlewareapprd P3P4P5
 */
function loadTemplate() {
  const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', 'Template-dd-portoseguromiddlewareapprd-p3p4p5.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Adapta o template para o monitor específico P3
 */
function adaptTemplate(template, monitorName) {
  const service = 'portoseguromiddlewareapprd';
  const titulo = monitorName || '';
  
  // Determina o tipo de alerta baseado no título
  let alertType = 'Monitoramento Preventivo';
  let impacto = 'Serviço requerendo atenção preventiva.';
  let severidade = 'P3 - Médio';
  
  const tituloLower = titulo.toLowerCase();
  
  if (tituloLower.includes('erro') || tituloLower.includes('error') || tituloLower.includes('5xx') || tituloLower.includes('disponibilidade') || tituloLower.includes('4xx')) {
    alertType = 'Taxa de Erro Moderada';
    impacto = 'Serviço com taxa de erros moderada, atenção preventiva.';
  } else if (tituloLower.includes('latência') || tituloLower.includes('latency') || tituloLower.includes('p95') || tituloLower.includes('p99') || tituloLower.includes('p50') || tituloLower.includes('p75')) {
    alertType = 'Latência Moderada';
    impacto = 'Serviço com latência moderada, atenção preventiva.';
  } else if (tituloLower.includes('tráfego') || tituloLower.includes('traffic') || tituloLower.includes('down') || tituloLower.includes('sem dados') || tituloLower.includes('queda') || tituloLower.includes('crescimento')) {
    alertType = 'Tráfego com Variação';
    impacto = 'Serviço com variação de tráfego, monitoramento preventivo.';
  } else if (tituloLower.includes('cpu') || tituloLower.includes('memória') || tituloLower.includes('memory') || tituloLower.includes('disco') || tituloLower.includes('disk') || tituloLower.includes('packet') || tituloLower.includes('network')) {
    alertType = 'Recurso de Infraestrutura Moderado';
    impacto = 'Recurso de infraestrutura moderado, atenção preventiva.';
  } else if (tituloLower.includes('heap') || tituloLower.includes('thread') || tituloLower.includes('gc') || tituloLower.includes('jvm') || tituloLower.includes('file')) {
    alertType = 'JVM com Recursos Moderados';
    impacto = 'JVM com recursos moderados, atenção preventiva.';
  } else if (tituloLower.includes('database') || tituloLower.includes('query') || tituloLower.includes('connection')) {
    alertType = 'Database com Atenção';
    impacto = 'Database requerendo atenção, monitoramento preventivo.';
  } else if (tituloLower.includes('pod') || tituloLower.includes('crash') || tituloLower.includes('oom') || tituloLower.includes('kubernetes')) {
    alertType = 'Kubernetes - Estado Requer Atenção';
    impacto = 'Recursos Kubernetes requerendo atenção preventiva.';
  }

  let message = template
    .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, `${alertType}!`)
    .replace(/Usuários insatisfeitos com a performance\./g, impacto)
    .replace(/P2 - Experiência Degradada\./g, severidade)
    .replace(/APDEX do Motor de Porto/g, `${alertType} - ${service}`)
    .replace(/Motor de Porto/g, service);

  return message;
}

/**
 * Busca todos os monitores do serviço portoseguromiddlewareapprd com prioridade P3
 */
async function searchMonitors(creds) {
  // Usa o endpoint de busca de monitores
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
      { id: 236775988 }
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
  console.log('📝 Atualizando mensagens dos monitores P3 do serviço portoseguromiddlewareapprd...\n');
  console.log('📄 Usando template: Template-dd-portoseguromiddlewareapprd-p3p4p5.md\n');

  const creds = getCredentials();
  
  // Carrega o template específico
  console.log('📄 Carregando template...');
  const template = loadTemplate();
  console.log('✅ Template carregado\n');
  
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
    
    console.log(`[${i + 1}/${monitors.length}] Atualizando monitor ID: ${monitorId}`);
    
    try {
      // Busca o monitor completo para obter o nome completo
      const currentMonitor = await getMonitor(monitorId, creds);
      console.log(`   Nome: ${currentMonitor.name}`);
      
      // Adapta o template para este monitor específico
      const adaptedMessage = adaptTemplate(template, currentMonitor.name);
      
      // Prepara atualizações (mantém tudo igual, apenas atualiza a mensagem)
      const updates = {
        message: adaptedMessage
      };
      
      // Atualiza o monitor
      await updateMonitor(monitorId, creds, updates);
      
      results.success.push({
        id: monitorId,
        name: currentMonitor.name,
        url: `https://app.${creds.site}/monitors/${monitorId}`
      });
      
      console.log(`   ✅ Mensagem atualizada com sucesso!\n`);
      
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
    results.success.forEach(r => {
      console.log(`   - ${r.name}`);
      console.log(`     ID: ${r.id}`);
      console.log(`     URL: ${r.url}\n`);
    });
  }

  if (results.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    results.errors.forEach(r => {
      console.log(`   - ${r.name} (ID: ${r.id}): ${r.error}\n`);
    });
  }
}

main();

