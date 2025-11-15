#!/usr/bin/env node
/**
 * Script para adicionar tratamento de erros ao workflow "MVP - Automation"
 * Uso: node scripts/update-workflow-with-error-handling.js
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

function addErrorHandlingToWorkflow(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    throw new Error('Workflow não possui spec ou steps válidos');
  }

  const steps = [...spec.steps];
  const newSteps = [];
  const stepMap = new Map();

  // Primeiro, criar mapa de steps existentes
  steps.forEach(step => {
    stepMap.set(step.name, step);
    newSteps.push(JSON.parse(JSON.stringify(step))); // Deep copy
  });

  // Encontrar steps que precisam de tratamento de erro
  const criticalSteps = [
    'List_EC2_instances',
    'Restart_Tomcat',
    'GetCommandInvocation'
  ];

  // Adicionar steps de tratamento de erro
  const errorHandlingSteps = [];
  let errorStepCounter = 1;

  // Função para criar step de notificação de erro
  const createErrorNotificationStep = (failedStepName, stepIndex) => {
    const errorStepName = `Error_Notification_${failedStepName}`;
    return {
      name: errorStepName,
      actionId: 'com.datadoghq.msteams.sendSimpleMessage',
      parameters: [
        {
          name: 'channelOrUser',
          value: {
            channelId: '19:CR3LJTb29KGknm_IZBu8Qv72vXMf6iAwBbxRdwL8KT81@thread.tacv2',
            option: 'channel'
          }
        },
        {
          name: 'message',
          value: `🚨 **ERRO NO WORKFLOW MVP - Automation**\n\n❌ Step que falhou: **${failedStepName}**\n\n⚠️ O workflow foi interrompido devido a uma falha.\n\nPor favor, verifique:\n- A configuração do step\n- A conectividade com os serviços\n- Os logs do Datadog para mais detalhes\n\n🔗 [Ver Workflow no Datadog](https://app.${DATADOG_SITE}/workflows)\n\n**Detalhes do Erro:**\n{{ Steps.${failedStepName}.error }}`
        },
        {
          name: 'teamId',
          value: '7a92f536-abb9-45fe-9a2d-8483a4a6b63e'
        },
        {
          name: 'tenantId',
          value: 'c7e9b473-39b6-4e27-b9bf-29b284dcdb3f'
        }
      ],
      display: {
        bounds: {
          x: -400 + (stepIndex * 50),
          y: 600 + (stepIndex * 100)
        }
      }
    };
  };

  // Função para criar step de email de erro
  const createErrorEmailStep = (failedStepName, stepIndex) => {
    const errorEmailStepName = `Error_Email_${failedStepName}`;
    return {
      name: errorEmailStepName,
      actionId: 'com.datadoghq.email.send',
      parameters: [
        {
          name: 'subject',
          value: `🚨 ERRO: Workflow MVP - Automation - Falha em ${failedStepName}`
        },
        {
          name: 'to',
          value: 'marcos.cianci@vertem.digital'
        },
        {
          name: 'message',
          value: `Olá,\n\n🚨 **ERRO NO WORKFLOW MVP - Automation**\n\n❌ Step que falhou: **${failedStepName}**\n\n⚠️ O workflow foi interrompido devido a uma falha.\n\n**Detalhes:**\n- Step: ${failedStepName}\n- Erro: {{ Steps.${failedStepName}.error }}\n- Data/Hora: {{ Workflow.startedAt }}\n\nPor favor, verifique a configuração e os logs.\n\n🔗 [Ver no Datadog](https://app.${DATADOG_SITE}/workflows)`
        }
      ],
      display: {
        bounds: {
          x: -400 + (stepIndex * 50),
          y: 700 + (stepIndex * 100)
        }
      }
    };
  };

  // Atualizar steps existentes para incluir branches de erro
  const updatedSteps = newSteps.map((step, index) => {
    const updatedStep = JSON.parse(JSON.stringify(step));
    
    // Se for um step crítico, adicionar branch de erro
    if (criticalSteps.includes(step.name)) {
      const errorNotificationStep = createErrorNotificationStep(step.name, index);
      const errorEmailStep = createErrorEmailStep(step.name, index);
      
      // Adicionar steps de erro à lista
      errorHandlingSteps.push(errorNotificationStep);
      errorHandlingSteps.push(errorEmailStep);
      
      // Adicionar branch de erro ao step atual
      if (!updatedStep.outboundEdges) {
        updatedStep.outboundEdges = [];
      }
      
      // Adicionar branch de sucesso (main) se não existir
      const hasMainBranch = updatedStep.outboundEdges.some(e => e.branchName === 'main');
      if (!hasMainBranch && updatedStep.outboundEdges.length > 0) {
        // Manter branch existente como main
        updatedStep.outboundEdges[0].branchName = 'main';
      }
      
      // Adicionar branch de erro (Datadog usa onFailure ou condições específicas)
      // Primeiro, garantir que o branch principal existe
      const mainBranch = updatedStep.outboundEdges.find(e => e.branchName === 'main') || 
                         updatedStep.outboundEdges[0];
      
      // Adicionar branch de erro usando onFailure
      updatedStep.onFailure = {
        stepName: errorNotificationStep.name
      };
      
      // Alternativamente, adicionar como outboundEdge com condição de erro
      // Se onFailure não for suportado, usar branchName 'error' ou 'failure'
      if (!updatedStep.onFailure) {
        updatedStep.outboundEdges.push({
          nextStepName: errorNotificationStep.name,
          branchName: 'error',
          condition: '{{ Steps.' + step.name + '.status }} === "error"'
        });
      }
      
      // Conectar notificação de erro com email de erro
      errorNotificationStep.outboundEdges = [{
        nextStepName: errorEmailStep.name,
        branchName: 'main'
      }];
      
      // Email de erro é o último step (não tem outbound edges)
    }
    
    return updatedStep;
  });

  // Adicionar todos os steps de tratamento de erro
  const allSteps = [...updatedSteps, ...errorHandlingSteps];

  // Atualizar spec
  const updatedSpec = {
    ...spec,
    steps: allSteps
  };

  return updatedSpec;
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

    console.log('🛠️  Adicionando tratamento de erros...');
    const updatedSpec = addErrorHandlingToWorkflow(workflowDetails);
    
    console.log(`✅ Spec atualizado com ${updatedSpec.steps.length} steps (incluindo tratamento de erros)`);
    console.log('');

    // Mostrar preview das mudanças
    console.log('📊 Mudanças que serão aplicadas:');
    console.log('');
    const criticalSteps = ['List_EC2_instances', 'Restart_Tomcat', 'GetCommandInvocation'];
    criticalSteps.forEach(stepName => {
      console.log(`   ✓ Adicionado tratamento de erro para: ${stepName}`);
      console.log(`     - Notificação no Teams em caso de falha`);
      console.log(`     - Email de alerta em caso de falha`);
    });
    console.log('');

    // Confirmar antes de atualizar (em produção, você pode querer um prompt)
    console.log('🚀 Atualizando workflow no Datadog...');
    const result = await updateWorkflow(workflowId, updatedSpec);
    
    console.log('');
    console.log('✅ Workflow atualizado com sucesso!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   • Workflow ID: ${workflowId}`);
    console.log(`   • Total de steps: ${updatedSpec.steps.length}`);
    console.log(`   • Steps de tratamento de erro: ${updatedSpec.steps.length - workflowDetails.data?.attributes?.spec?.steps?.length || 0}`);
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

