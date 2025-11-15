#!/usr/bin/env node
/**
 * Script para verificar o tratamento de erros implementado no workflow
 * Uso: node scripts/verify-workflow-error-handling.js
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

function verifyErrorHandling(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    return { error: 'Workflow não possui spec ou steps válidos' };
  }

  const steps = spec.steps;
  const criticalSteps = ['List_EC2_instances', 'Restart_Tomcat', 'GetCommandInvocation'];
  
  const verification = {
    totalSteps: steps.length,
    stepsWithErrorHandling: [],
    stepsWithoutErrorHandling: [],
    errorHandlingSteps: [],
    summary: {
      total: 0,
      withErrorHandling: 0,
      withoutErrorHandling: 0,
      errorNotificationSteps: 0
    }
  };

  steps.forEach(step => {
    const stepName = step.name;
    const isErrorHandlingStep = stepName.startsWith('Error_Notification_') || 
                                 stepName.startsWith('Error_Email_');
    
    if (isErrorHandlingStep) {
      verification.errorHandlingSteps.push({
        name: stepName,
        type: stepName.includes('Notification') ? 'Teams Notification' : 'Email',
        actionId: step.actionId
      });
      verification.summary.errorNotificationSteps++;
    } else if (criticalSteps.includes(stepName)) {
      verification.summary.total++;
      
      // Verificar se tem branch de erro
      const hasErrorBranch = step.outboundEdges?.some(edge => 
        edge.branchName === 'error' || 
        edge.branchName === 'failure' ||
        step.onFailure
      );
      
      if (hasErrorBranch) {
        verification.stepsWithErrorHandling.push({
          name: stepName,
          errorBranches: step.outboundEdges?.filter(e => 
            e.branchName === 'error' || e.branchName === 'failure'
          ) || [],
          onFailure: step.onFailure || null
        });
        verification.summary.withErrorHandling++;
      } else {
        verification.stepsWithoutErrorHandling.push(stepName);
        verification.summary.withoutErrorHandling++;
      }
    }
  });

  return verification;
}

async function main() {
  try {
    console.log('🔍 Verificando tratamento de erros no workflow "MVP - Automation"...');
    console.log('');
    
    const workflow = await getWorkflowByName('MVP - Automation');
    if (!workflow) {
      console.error('❌ Workflow "MVP - Automation" não encontrado');
      process.exit(1);
    }

    const workflowId = workflow.id;
    console.log(`✅ Workflow encontrado: ${workflow.attributes?.name} (ID: ${workflowId})`);
    console.log('');

    const workflowDetails = await getWorkflowDetails(workflowId);
    const verification = verifyErrorHandling(workflowDetails);

    console.log('📊 RESUMO DA VERIFICAÇÃO');
    console.log('═'.repeat(60));
    console.log(`Total de Steps no Workflow: ${verification.totalSteps}`);
    console.log(`Steps Críticos Verificados: ${verification.summary.total}`);
    console.log(`Steps com Tratamento de Erro: ${verification.summary.withErrorHandling} ✅`);
    console.log(`Steps sem Tratamento de Erro: ${verification.summary.withoutErrorHandling} ${verification.summary.withoutErrorHandling > 0 ? '⚠️' : ''}`);
    console.log(`Steps de Notificação de Erro: ${verification.summary.errorNotificationSteps}`);
    console.log('');

    if (verification.stepsWithErrorHandling.length > 0) {
      console.log('✅ STEPS COM TRATAMENTO DE ERRO:');
      console.log('─'.repeat(60));
      verification.stepsWithErrorHandling.forEach(step => {
        console.log(`\n📋 ${step.name}`);
        if (step.errorBranches.length > 0) {
          step.errorBranches.forEach(branch => {
            console.log(`   ✓ Branch de erro: ${branch.branchName} → ${branch.nextStepName}`);
            if (branch.condition) {
              console.log(`     Condição: ${branch.condition}`);
            }
          });
        }
        if (step.onFailure) {
          console.log(`   ✓ onFailure: ${step.onFailure.stepName || 'configurado'}`);
        }
      });
      console.log('');
    }

    if (verification.errorHandlingSteps.length > 0) {
      console.log('📢 STEPS DE NOTIFICAÇÃO DE ERRO:');
      console.log('─'.repeat(60));
      verification.errorHandlingSteps.forEach(step => {
        console.log(`   • ${step.name} (${step.type})`);
      });
      console.log('');
    }

    if (verification.stepsWithoutErrorHandling.length > 0) {
      console.log('⚠️  STEPS SEM TRATAMENTO DE ERRO:');
      console.log('─'.repeat(60));
      verification.stepsWithoutErrorHandling.forEach(stepName => {
        console.log(`   ⚠️  ${stepName}`);
      });
      console.log('');
    }

    // Avaliação final
    console.log('🎯 AVALIAÇÃO FINAL:');
    console.log('═'.repeat(60));
    if (verification.summary.withoutErrorHandling === 0) {
      console.log('✅ EXCELENTE! Todos os steps críticos têm tratamento de erro.');
    } else {
      const percentage = (verification.summary.withErrorHandling / verification.summary.total * 100).toFixed(1);
      console.log(`⚠️  ${percentage}% dos steps críticos têm tratamento de erro.`);
      console.log(`   Recomenda-se adicionar tratamento aos steps restantes.`);
    }
    console.log('');

    console.log('🔗 Links Úteis:');
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

