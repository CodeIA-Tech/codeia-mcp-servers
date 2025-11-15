#!/usr/bin/env node
/**
 * Lista os últimos alertas/eventos de um serviço no Datadog
 * 
 * Uso: node scripts/datadog/list-recent-alerts.js <service-name> [hours]
 * Exemplo: node scripts/datadog/list-recent-alerts.js motor-porto-tomcat 24
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

async function fetchEvents(serviceName, hours = 24) {
  loadEnv();
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY no .env');
  }

  // Calcular timestamp de início (últimas X horas)
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (hours * 3600);

  // Buscar eventos relacionados ao serviço
  const url = `https://api.${site}/api/v1/events?start=${startTime}&end=${endTime}&tags=service:${serviceName}&priority=normal,low&sources=monitor,alert`;
  
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return await response.json();
}

async function fetchMonitorGroups(serviceName) {
  loadEnv();
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  // Buscar grupos de monitores (monitor groups) que podem ter alertas recentes
  const url = `https://api.${site}/api/v1/monitor/groups/search?query=service:${serviceName}`;
  
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    // Se não houver grupos, retornar vazio
    return { groups: [] };
  }

  return await response.json();
}

async function fetchMonitorsWithAlerts(serviceName) {
  loadEnv();
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  // Buscar monitores do serviço
  const url = `https://api.${site}/api/v1/monitor/search?query=service:${serviceName}`;
  
  const response = await fetch(url, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  const searchResult = await response.json();
  
  if (!searchResult?.monitors || searchResult.monitors.length === 0) {
    return [];
  }

  // Buscar detalhes dos monitores que estão em alerta
  const monitorsWithDetails = [];
  for (const monitor of searchResult.monitors) {
    try {
      const detailsUrl = `https://api.${site}/api/v1/monitor/${monitor.id}`;
      const detailsResponse = await fetch(detailsUrl, {
        headers: {
          'DD-API-KEY': apiKey,
          'DD-APPLICATION-KEY': appKey,
          'Content-Type': 'application/json'
        }
      });

      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        // Incluir apenas monitores que estão em alerta ou warning
        if (details.overall_state === 'Alert' || details.overall_state === 'Warn' || details.overall_state === 'No Data') {
          monitorsWithDetails.push(details);
        }
      }
    } catch (error) {
      // Ignorar erros individuais
    }
  }

  return monitorsWithDetails;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('pt-BR', { 
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
}

async function main() {
  const serviceName = process.argv[2] || 'motor-porto-tomcat';
  const hours = parseInt(process.argv[3] || '24', 10);

  console.log(`🔍 Buscando alertas recentes para o serviço: ${serviceName}`);
  console.log(`⏰ Período: últimas ${hours} horas\n`);

  try {
    loadEnv();
    const site = process.env.DATADOG_SITE || 'datadoghq.com';

    // Buscar monitores em alerta
    console.log('📊 Buscando monitores em estado de alerta...');
    const monitorsInAlert = await fetchMonitorsWithAlerts(serviceName);
    
    console.log(`✅ ${monitorsInAlert.length} monitores em estado de alerta/warning encontrados\n`);

    if (monitorsInAlert.length === 0) {
      console.log('✅ Nenhum monitor em estado de alerta no momento.\n');
      
      // Tentar buscar eventos recentes mesmo assim
      console.log('📅 Buscando eventos recentes...');
      try {
        const events = await fetchEvents(serviceName, hours);
        if (events?.events && events.events.length > 0) {
          console.log(`\n📋 ${events.events.length} eventos encontrados nas últimas ${hours} horas:\n`);
          events.events.slice(0, 10).forEach((event, idx) => {
            console.log(`${idx + 1}. [${formatTimestamp(event.date_happened)}] ${event.title}`);
            if (event.text) {
              console.log(`   ${event.text.substring(0, 100)}...`);
            }
            console.log(`   Link: https://app.${site}/event/event?id=${event.id}\n`);
          });
        } else {
          console.log(`✅ Nenhum evento encontrado nas últimas ${hours} horas.`);
        }
      } catch (error) {
        console.log(`⚠️  Não foi possível buscar eventos: ${error.message}`);
      }
      return;
    }

    // Exibir monitores em alerta
    console.log('🚨 MONITORES EM ALERTA/WARNING:\n');
    console.log('='.repeat(80));

    monitorsInAlert.forEach((monitor, idx) => {
      const priority = monitor.tags?.find(t => t.toLowerCase().startsWith('priority:'))?.split(':')[1] || 'N/A';
      const state = monitor.overall_state || 'Unknown';
      const stateEmoji = state === 'Alert' ? '🔴' : state === 'Warn' ? '🟡' : '⚪';
      
      console.log(`\n${idx + 1}. ${stateEmoji} ${monitor.name}`);
      console.log(`   ID: ${monitor.id}`);
      console.log(`   Estado: ${state}`);
      console.log(`   Prioridade: ${priority.toUpperCase()}`);
      console.log(`   Tipo: ${monitor.type || 'N/A'}`);
      console.log(`   Link: https://app.${site}/monitors/${monitor.id}`);
      
      if (monitor.message) {
        const messagePreview = monitor.message.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   Mensagem: ${messagePreview}...`);
      }
      
      if (monitor.query) {
        console.log(`   Query: ${monitor.query.substring(0, 100)}...`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Resumo:`);
    console.log(`   Total de monitores em alerta: ${monitorsInAlert.length}`);
    
    const byState = {};
    monitorsInAlert.forEach(m => {
      const state = m.overall_state || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });
    
    console.log(`\n   Por Estado:`);
    Object.entries(byState).forEach(([state, count]) => {
      const emoji = state === 'Alert' ? '🔴' : state === 'Warn' ? '🟡' : '⚪';
      console.log(`     ${emoji} ${state}: ${count}`);
    });

    // Buscar eventos recentes também
    console.log(`\n📅 Buscando eventos recentes (últimas ${hours} horas)...`);
    try {
      const events = await fetchEvents(serviceName, hours);
      if (events?.events && events.events.length > 0) {
        console.log(`\n📋 ${events.events.length} eventos encontrados:\n`);
        events.events.slice(0, 5).forEach((event, idx) => {
          console.log(`${idx + 1}. [${formatTimestamp(event.date_happened)}] ${event.title}`);
          console.log(`   Link: https://app.${site}/event/event?id=${event.id}\n`);
        });
        if (events.events.length > 5) {
          console.log(`   ... e mais ${events.events.length - 5} eventos\n`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Não foi possível buscar eventos: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Erro ao buscar alertas:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

