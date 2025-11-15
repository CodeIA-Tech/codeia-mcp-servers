#!/usr/bin/env node
/**
 * Script para atualizar a mensagem do step Info_Message no workflow "MVP - Automation"
 * Uso: node scripts/update-info-message-workflow.js
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
const DATADOG_API_BASE_V2 = `https://api.${DATADOG_SITE}/api/v2`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

function datadogRequest(method, path, body = null, useV2 = false) {
  return new Promise((resolve, reject) => {
    const baseUrl = useV2 ? DATADOG_API_BASE_V2 : `https://api.${DATADOG_SITE}/api/v1`;
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
          reject(new Error(`Erro da API: ${res.statusCode} - ${data.substring(0, 500)}`));
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

async function getWorkflowByName(name) {
  try {
    const response = await datadogRequest('GET', '/workflows', null, true);
    const workflows = response.data?.data || [];
    
    const workflow = workflows.find(w => {
      const workflowName = (w.attributes?.name || w.name || '').toLowerCase().trim();
      return workflowName === name.toLowerCase().trim() || 
             workflowName.includes(name.toLowerCase().trim());
    });
    
    return workflow || null;
  } catch (error) {
    throw error;
  }
}

async function getWorkflowDetails(workflowId) {
  try {
    const response = await datadogRequest('GET', `/workflows/${workflowId}`, null, true);
    return response.data;
  } catch (error) {
    throw error;
  }
}

function updateInfoMessageStep(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    throw new Error('Workflow não possui spec ou steps válidos');
  }

  const steps = spec.steps;
  
  // Encontrar o step Info_Message
  const infoMessageStep = steps.find(step => step.name === 'Info_Message');
  
  if (!infoMessageStep) {
    throw new Error('Step Info_Message não encontrado no workflow');
  }

  // Criar nova mensagem amigável
  // A instância vem do step Generate_Detailed_Message
  // O horário será formatado usando JavaScript no step Generate_Detailed_Message ou podemos usar a variável do workflow
  const newMessage = `🔄 **Notificação de Reinicialização de Serviço**

Olá, equipe! 👋

Informamos que será realizada uma reinicialização automática do serviço Tomcat na seguinte instância:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**⏰ Horário previsto:** {{ Workflow.startedAt }}

**🔧 Ação:** Reinicialização automática do serviço Tomcat via AWS Systems Manager

Esta ação faz parte do processo automatizado de manutenção. O serviço será reiniciado e estará disponível novamente em alguns minutos.

Qualquer dúvida ou necessidade, entre em contato com a equipe de DevOps.

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`;

  // Atualizar o parâmetro message
  const updatedStep = JSON.parse(JSON.stringify(infoMessageStep));
  updatedStep.parameters = updatedStep.parameters.map(param => {
    if (param.name === 'message') {
      return {
        ...param,
        value: newMessage
      };
    }
    return param;
  });

  // Atualizar o step no array de steps
  const updatedSteps = steps.map(step => {
    if (step.name === 'Info_Message') {
      return updatedStep;
    }
    return step;
  });

  // Atualizar spec
  const updatedSpec = {
    ...spec,
    steps: updatedSteps
  };

  return { updatedSpec, oldMessage: infoMessageStep.parameters.find(p => p.name === 'message')?.value || '', newMessage };
}

async function updateWorkflow(workflowId, updatedSpec) {
  try {
    // Buscar workflow atual para manter outros atributos
    const currentWorkflow = await getWorkflowDetails(workflowId);
    const currentAttributes = currentWorkflow.data?.attributes || currentWorkflow.attributes || {};
    
    // Preparar payload de atualização
    const updatePayload = {
      data: {
        type: 'workflows',
        id: workflowId,
        attributes: {
          ...currentAttributes,
          spec: updatedSpec
        }
      }
    };

    console.log('📝 Atualizando workflow...');
    const response = await datadogRequest('PATCH', `/workflows/${workflowId}`, updatePayload, true);
    return response;
  } catch (error) {
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Buscando workflow "MVP - Automation"...');
    
    const workflow = await getWorkflowByName('MVP - Automation');
    if (!workflow) {
      console.error('❌ Workflow "MVP - Automation" não encontrado');
      process.exit(1);
    }

    const workflowId = workflow.id;
    console.log(`✅ Workflow encontrado: ${workflow.attributes?.name} (ID: ${workflowId})`);
    console.log('');

    console.log('📋 Buscando detalhes do workflow...');
    const workflowDetails = await getWorkflowDetails(workflowId);
    console.log('✅ Detalhes obtidos');
    console.log('');

    console.log('🛠️  Atualizando mensagem do step Info_Message...');
    const { updatedSpec, oldMessage, newMessage } = updateInfoMessageStep(workflowDetails);
    
    console.log('✅ Mensagem atualizada');
    console.log('');

    // Mostrar preview das mudanças
    console.log('📊 Mudanças que serão aplicadas:');
    console.log('');
    console.log('📝 Mensagem anterior:');
    console.log('─'.repeat(60));
    console.log(oldMessage.substring(0, 200) + (oldMessage.length > 200 ? '...' : ''));
    console.log('');
    console.log('📝 Nova mensagem:');
    console.log('─'.repeat(60));
    console.log(newMessage);
    console.log('');

    // Confirmar antes de atualizar
    console.log('🚀 Atualizando workflow no Datadog...');
    const result = await updateWorkflow(workflowId, updatedSpec);
    
    console.log('');
    console.log('✅ Workflow atualizado com sucesso!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   • Workflow ID: ${workflowId}`);
    console.log(`   • Step atualizado: Info_Message`);
    console.log(`   • Instância: {{ Steps.Generate_Detailed_Message.data }}`);
    console.log(`   • Horário: {{ Workflow.startedAt }}`);
    console.log('');
    console.log('🔗 Links:');
    console.log(`   • Ver workflow: https://app.${DATADOG_SITE}/workflows/${workflowId}`);
    console.log('');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

