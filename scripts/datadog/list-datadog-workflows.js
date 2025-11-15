#!/usr/bin/env node
/**
 * Script para listar e analisar workflows do Datadog
 * Uso: node scripts/list-datadog-workflows.js [nome-do-workflow]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar .env se existir
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      const value = values.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const DATADOG_APP_KEY = process.env.DATADOG_APP_KEY;
const DATADOG_SITE = process.env.DATADOG_SITE || 'datadoghq.com';
const DATADOG_API_BASE_V1 = `https://api.${DATADOG_SITE}/api/v1`;
const DATADOG_API_BASE_V2 = `https://api.${DATADOG_SITE}/api/v2`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

function datadogRequest(method, path, body = null, useV2 = false) {
  return new Promise((resolve, reject) => {
    const baseUrl = useV2 ? DATADOG_API_BASE_V2 : DATADOG_API_BASE_V1;
    const url = new URL(`${baseUrl}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ data: JSON.parse(data), statusCode: res.statusCode });
          } catch (e) {
            resolve({ data: data, statusCode: res.statusCode });
          }
        } else {
          reject(new Error(`Erro da API: ${res.statusCode} - ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function listWorkflows() {
  const endpoints = [
    { path: '/workflows', v2: false, name: 'v1 workflows' },
    { path: '/workflows', v2: true, name: 'v2 workflows' },
    { path: '/automations', v2: false, name: 'v1 automations' },
    { path: '/automations', v2: true, name: 'v2 automations' },
    { path: '/service_catalog/workflows', v2: false, name: 'service catalog workflows' },
    { path: '/service_catalog/workflows', v2: true, name: 'v2 service catalog workflows' },
    { path: '/incidents/workflows', v2: false, name: 'incident workflows' },
    { path: '/incidents/workflows', v2: true, name: 'v2 incident workflows' }
  ];

  const errors = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Tentando endpoint: ${endpoint.name}...`);
      const response = await datadogRequest('GET', endpoint.path, null, endpoint.v2);
      console.log(`✅ Endpoint encontrado: ${endpoint.name}`);
      return { ...response, endpoint: endpoint.name };
    } catch (error) {
      errors.push({ endpoint: endpoint.name, error: error.message });
      // Continuar tentando
    }
  }

  // Se nenhum endpoint funcionou, mostrar todos os erros
  console.error('\n❌ Nenhum endpoint de workflows funcionou. Erros:');
  errors.forEach(({ endpoint, error }) => {
    console.error(`   ${endpoint}: ${error}`);
  });
  
  throw new Error('Não foi possível encontrar a API de workflows. Verifique a documentação do Datadog.');
}

function getWorkflowByName(name, workflowsResponse) {
  try {
    const workflows = workflowsResponse.data || workflowsResponse;
    
    // Extrair lista de workflows de diferentes estruturas possíveis
    let workflowsList = [];
    if (Array.isArray(workflows)) {
      workflowsList = workflows;
    } else if (workflows.data && Array.isArray(workflows.data)) {
      workflowsList = workflows.data;
    } else if (workflows.workflows && Array.isArray(workflows.workflows)) {
      workflowsList = workflows.workflows;
    } else if (workflows.items && Array.isArray(workflows.items)) {
      workflowsList = workflows.items;
    }
    
    // Buscar workflow pelo nome (case-insensitive, parcial)
    const normalizedName = name.toLowerCase().trim();
    return workflowsList.find(w => {
      const workflowName = (w.attributes?.name || w.name || '').toLowerCase().trim();
      return workflowName === normalizedName || 
             workflowName.includes(normalizedName) || 
             normalizedName.includes(workflowName);
    });
  } catch (error) {
    throw error;
  }
}

async function getWorkflowDetails(workflowId) {
  try {
    // Tentar buscar detalhes do workflow
    const response = await datadogRequest('GET', `/workflows/${workflowId}`, null, true);
    return response.data;
  } catch (error) {
    // Se não conseguir, retornar null
    return null;
  }
}

function formatWorkflow(workflow, details = null) {
  if (!workflow) return null;

  const workflowData = workflow.attributes || workflow;
  const detailsData = details?.attributes || details || {};
  
  return {
    id: workflow.id || workflowData.id,
    name: workflowData.name || workflow.name,
    description: workflowData.description || workflow.description || '(sem descrição)',
    handle: workflowData.handle || detailsData.handle,
    status: workflowData.status || detailsData.status || 'unknown',
    created: workflowData.createdAt || workflowData.created || detailsData.createdAt,
    modified: workflowData.updatedAt || workflowData.modified || detailsData.updatedAt,
    createdBy: workflow.relationships?.createdBy?.data?.id,
    lastUpdatedBy: workflow.relationships?.lastUpdatedBy?.data?.id,
    ownedBy: workflow.relationships?.ownedBy?.data?.id,
    lastInstance: workflow.relationships?.lastInstance?.data?.id,
    favorite: workflowData.favorite || false,
    creationSource: workflowData.creationSource,
    triggerTypes: workflowData.triggerTypes || detailsData.triggerTypes || [],
    specVersionId: workflowData.specVersionId || detailsData.specVersionId,
    tags: workflowData.tags || detailsData.tags || [],
    triggers: detailsData.triggers || workflowData.triggers || [],
    actions: detailsData.actions || workflowData.actions || [],
    steps: detailsData.steps || workflowData.steps || [],
    definition: detailsData.definition || workflowData.definition,
    fullData: workflow,
    detailsData: details
  };
}

async function main() {
  const workflowNames = process.argv.slice(2);
  
  try {
    console.log('🔍 Buscando workflows no Datadog...');
    console.log(`📍 Site: ${DATADOG_SITE}`);
    console.log('');

    // Primeiro, buscar todos os workflows
    console.log('📋 Buscando workflows no Datadog...');
    const workflowsResponse = await listWorkflows();
    console.log(`✅ Endpoint usado: ${workflowsResponse.endpoint}`);
    console.log('');

    const workflows = workflowsResponse.data || workflowsResponse;
    let workflowsList = [];
    
    // Extrair lista de workflows de diferentes estruturas possíveis
    if (Array.isArray(workflows)) {
      workflowsList = workflows;
    } else if (workflows.data && Array.isArray(workflows.data)) {
      workflowsList = workflows.data;
    } else if (workflows.workflows && Array.isArray(workflows.workflows)) {
      workflowsList = workflows.workflows;
    } else if (workflows.items && Array.isArray(workflows.items)) {
      workflowsList = workflows.items;
    } else {
      // Se não encontrou lista, tentar exibir o que veio
      console.log('⚠️  Estrutura de resposta não reconhecida. Exibindo dados brutos:');
      console.log(JSON.stringify(workflows, null, 2));
      return;
    }

    if (workflowsList.length === 0) {
      console.log('📭 Nenhum workflow encontrado');
      return;
    }

    console.log(`📊 Total de workflows encontrados: ${workflowsList.length}`);
    console.log('');

    if (workflowNames.length > 0) {
      // Buscar workflows específicos
      for (const name of workflowNames) {
        console.log(`📋 Buscando workflow: "${name}"`);
        const workflow = getWorkflowByName(name, workflowsResponse);
        if (workflow) {
          // Buscar detalhes do workflow
          const workflowId = workflow.id || workflow.attributes?.id;
          console.log(`   Buscando detalhes do workflow (ID: ${workflowId})...`);
          const details = await getWorkflowDetails(workflowId);
          
          const formatted = formatWorkflow(workflow, details);
          console.log('');
          console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
          console.log(`│ Workflow: ${formatted.name}`);
          console.log('├─────────────────────────────────────────────────────────────────────────────┤');
          console.log(`│ ID: ${formatted.id}`);
          if (formatted.handle) console.log(`│ Handle: ${formatted.handle}`);
          console.log(`│ Status: ${formatted.status || 'N/A'}`);
          console.log(`│ Descrição: ${formatted.description}`);
          if (formatted.created) {
            const createdDate = new Date(formatted.created);
            console.log(`│ Criado: ${createdDate.toLocaleString('pt-BR')} (${createdDate.toLocaleDateString('pt-BR')})`);
          }
          if (formatted.modified) {
            const modifiedDate = new Date(formatted.modified);
            console.log(`│ Modificado: ${modifiedDate.toLocaleString('pt-BR')} (${modifiedDate.toLocaleDateString('pt-BR')})`);
          }
          if (formatted.triggerTypes && formatted.triggerTypes.length > 0) {
            console.log(`│ Tipo de Trigger: ${formatted.triggerTypes.join(', ')}`);
          }
          if (formatted.creationSource) {
            console.log(`│ Fonte de Criação: ${formatted.creationSource}`);
          }
          if (formatted.favorite) {
            console.log(`│ ⭐ Favorito: Sim`);
          }
          if (formatted.tags && formatted.tags.length > 0) {
            console.log(`│ Tags: ${formatted.tags.join(', ')}`);
          }
          if (formatted.lastInstance) {
            console.log(`│ Última Instância: ${formatted.lastInstance}`);
          }
          if (formatted.triggers && formatted.triggers.length > 0) {
            console.log(`│ Triggers: ${formatted.triggers.length} trigger(s)`);
            formatted.triggers.forEach((trigger, idx) => {
              console.log(`│   ${idx + 1}. ${JSON.stringify(trigger)}`);
            });
          }
          if (formatted.actions && formatted.actions.length > 0) {
            console.log(`│ Actions: ${formatted.actions.length} ação(ões)`);
            formatted.actions.forEach((action, idx) => {
              console.log(`│   ${idx + 1}. ${JSON.stringify(action)}`);
            });
          }
          if (formatted.steps && formatted.steps.length > 0) {
            console.log(`│ Steps: ${formatted.steps.length} step(s)`);
          }
          console.log('└─────────────────────────────────────────────────────────────────────────────┘');
          console.log('');
          console.log('📄 Dados completos (JSON):');
          console.log(JSON.stringify(formatted.fullData, null, 2));
          if (details) {
            console.log('');
            console.log('📄 Dados detalhados (JSON):');
            console.log(JSON.stringify(details, null, 2));
          }
          console.log('');
        } else {
          console.log(`❌ Workflow "${name}" não encontrado`);
          console.log(`💡 Workflows disponíveis: ${workflowsList.map(w => w.attributes?.name || w.name || 'Sem nome').join(', ')}`);
        }
      }
    } else {
      // Listar todos os workflows
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      console.log('│ Workflows do Datadog                                                       │');
      console.log('├─────────────────────────────────────────────────────────────────────────────┤');
      
      workflowsList.forEach((workflow, index) => {
        const formatted = formatWorkflow(workflow);
        const status = formatted.status === 'enabled' ? '✅' : formatted.status === 'disabled' ? '🔴' : '⚠️';
        const name = (formatted.name || 'Sem nome').substring(0, 50).padEnd(50);
        console.log(`│ ${index + 1}. ${status} ${name} ${formatted.status || 'unknown'}`.padEnd(85) + ' │');
      });
      
      console.log('└─────────────────────────────────────────────────────────────────────────────┘');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('');
    console.error('💡 Nota: A API de workflows do Datadog pode variar.');
    console.error('   Se os workflows não aparecerem, verifique:');
    console.error('   1. Se você tem permissões para acessar workflows');
    console.error('   2. Se a feature de workflows está habilitada na sua conta');
    console.error('   3. A versão da API do Datadog');
    process.exit(1);
  }
}

main();

