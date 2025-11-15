#!/usr/bin/env node
/**
 * Script para padronizar nomes dos steps do workflow "MVP - Automation"
 * Uso: node scripts/standardize-workflow-steps-names.js
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

function standardizeStepName(name) {
  // Padronizar para PascalCase com underscores
  // Exemplos:
  // "List_EC2_instances" -> "List_EC2_Instances"
  // "Generate_detailed_message" -> "Generate_Detailed_Message"
  // "Info_Message" -> "Info_Message" (já está ok)
  // "Restart_Tomcat" -> "Restart_Tomcat" (já está ok)
  // "Message_Status_Tomcat" -> "Message_Status_Tomcat" (já está ok)
  // "GetCommandInvocation" -> "Get_Command_Invocation"
  // "Error_Notification_GetCommandInvocation" -> "Error_Notification_Get_Command_Invocation"
  // "JavaScript" -> "JavaScript" (manter como está, é um nome próprio)
  
  // Nomes próprios que devem ser mantidos como estão
  const properNouns = ['JavaScript', 'EC2', 'AWS', 'API', 'JSON', 'HTML', 'Tomcat', 'Teams'];
  
  // Verificar se é um nome próprio completo
  if (properNouns.includes(name)) {
    return name;
  }
  
  // Converter para o padrão
  // Primeiro, adicionar underscores antes de maiúsculas (exceto a primeira letra)
  // Isso converte camelCase para formato com underscores
  let standardized = name.replace(/([a-z])([A-Z])/g, '$1_$2');
  
  // Dividir por underscores
  let parts = standardized.split('_').filter(p => p.length > 0);
  
  // Verificar cada parte: se contém camelCase interno, precisa ser dividida
  parts = parts.flatMap(part => {
    // Se a parte contém camelCase (letra minúscula seguida de maiúscula), dividir
    if (/[a-z][A-Z]/.test(part)) {
      // Dividir por camelCase
      return part.replace(/([a-z])([A-Z])/g, '$1_$2').split('_').filter(p => p.length > 0);
    }
    return [part];
  });
  
  // Converter cada parte para PascalCase
  const pascalParts = parts.map(part => {
    part = part.trim();
    if (part.length === 0) return '';
    
    // Verificar se é um nome próprio
    const upperPart = part.toUpperCase();
    if (properNouns.some(noun => upperPart === noun || part === noun)) {
      return part;
    }
    
    // Converter para PascalCase
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });
  
  const standardizedName = pascalParts.join('_');
  
  // Se o resultado for igual ao nome original, retornar como está
  if (standardizedName === name) {
    return name;
  }
  
  return standardizedName;
}

function standardizeWorkflowSteps(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    throw new Error('Workflow não possui spec ou steps válidos');
  }

  const steps = spec.steps;
  
  // Criar mapeamento de nomes antigos para novos
  const nameMapping = new Map();
  
  steps.forEach(step => {
    const oldName = step.name;
    const newName = standardizeStepName(oldName);
    if (oldName !== newName) {
      nameMapping.set(oldName, newName);
    }
  });
  
  // Padronizar nomes dos steps
  const standardizedSteps = steps.map(step => {
    const standardizedStep = JSON.parse(JSON.stringify(step));
    const newName = standardizeStepName(step.name);
    standardizedStep.name = newName;
    
    // Atualizar referências em outboundEdges
    if (standardizedStep.outboundEdges) {
      standardizedStep.outboundEdges = standardizedStep.outboundEdges.map(edge => {
        const mappedName = nameMapping.get(edge.nextStepName);
        if (mappedName) {
          return {
            ...edge,
            nextStepName: mappedName
          };
        }
        // Se não está no mapeamento, padronizar também
        return {
          ...edge,
          nextStepName: standardizeStepName(edge.nextStepName)
        };
      });
    }
    
    // Atualizar referências em onFailure
    if (standardizedStep.onFailure && standardizedStep.onFailure.stepName) {
      const mappedName = nameMapping.get(standardizedStep.onFailure.stepName);
      if (mappedName) {
        standardizedStep.onFailure.stepName = mappedName;
      } else {
        standardizedStep.onFailure.stepName = standardizeStepName(standardizedStep.onFailure.stepName);
      }
    }
    
    return standardizedStep;
  });
  
  // Atualizar referências em triggers
  const standardizedTriggers = spec.triggers?.map(trigger => {
    if (trigger.startStepNames) {
      return {
        ...trigger,
        startStepNames: trigger.startStepNames.map(stepName => {
          const mappedName = nameMapping.get(stepName);
          return mappedName || standardizeStepName(stepName);
        })
      };
    }
    return trigger;
  }) || spec.triggers;
  
  // Atualizar referências em parâmetros que podem conter nomes de steps
  standardizedSteps.forEach(step => {
    if (step.parameters) {
      step.parameters = step.parameters.map(param => {
        if (typeof param.value === 'string') {
          // Substituir referências a steps no formato {{ Steps.NomeStep }}
          let updatedValue = param.value;
          nameMapping.forEach((newName, oldName) => {
            const regex = new RegExp(`\\{\\{\\s*Steps\\.${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
            updatedValue = updatedValue.replace(regex, `{{ Steps.${newName}`);
          });
          
          // Também substituir referências no formato $.Steps.NomeStep
          nameMapping.forEach((newName, oldName) => {
            const regex = new RegExp(`\\$\\.Steps\\.${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
            updatedValue = updatedValue.replace(regex, `$.Steps.${newName}`);
          });
          
          if (updatedValue !== param.value) {
            return { ...param, value: updatedValue };
          }
        }
        return param;
      });
    }
  });
  
  // Atualizar spec
  const updatedSpec = {
    ...spec,
    steps: standardizedSteps,
    triggers: standardizedTriggers
  };

  return { updatedSpec, nameMapping };
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

    console.log('🛠️  Padronizando nomes dos steps...');
    const { updatedSpec, nameMapping } = standardizeWorkflowSteps(workflowDetails);
    
    if (nameMapping.size === 0) {
      console.log('✅ Todos os nomes dos steps já estão padronizados!');
      return;
    }
    
    console.log(`✅ Spec atualizado`);
    console.log('');

    // Mostrar preview das mudanças
    console.log('📊 Mudanças que serão aplicadas:');
    console.log('');
    nameMapping.forEach((newName, oldName) => {
      console.log(`   "${oldName}" → "${newName}"`);
    });
    console.log('');

    // Confirmar antes de atualizar
    console.log('🚀 Atualizando workflow no Datadog...');
    const result = await updateWorkflow(workflowId, updatedSpec);
    
    console.log('');
    console.log('✅ Workflow atualizado com sucesso!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   • Workflow ID: ${workflowId}`);
    console.log(`   • Total de steps: ${updatedSpec.steps.length}`);
    console.log(`   • Steps renomeados: ${nameMapping.size}`);
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

