#!/usr/bin/env node
/**
 * Script para adicionar validação do status do Tomcat e lógica de retry
 * no workflow "MVP - Automation"
 * Uso: node scripts/add-tomcat-validation-retry.js
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

function addTomcatValidationAndRetry(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    throw new Error('Workflow não possui spec ou steps válidos');
  }

  const steps = [...spec.steps];
  
  // Encontrar os steps relevantes (usar nomes reais do workflow)
  const restartTomcatStep = steps.find(s => s.name === 'Restart_Tomcat');
  const getCommandInvocationStep = steps.find(s => s.name === 'GetCommandInvocation' || s.name === 'Get_Command_Invocation');
  const javascriptStep = steps.find(s => s.name === 'JavaScript');
  const messageStatusStep = steps.find(s => s.name === 'Message_Status_Tomcat');
  
  if (!restartTomcatStep || !getCommandInvocationStep) {
    throw new Error(`Steps não encontrados. Restart_Tomcat: ${!!restartTomcatStep}, GetCommandInvocation: ${!!getCommandInvocationStep}`);
  }
  
  // Usar o nome real do step
  const getCommandInvocationStepName = getCommandInvocationStep.name;

  // Criar step para inicializar contador de tentativas
  const initRetryCounterStep = {
    name: 'Init_Retry_Counter',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Inicializa contador de tentativas de restart'
      },
      {
        name: 'script',
        value: '// Inicializar contador de tentativas\nreturn { retryCount: 0, maxRetries: 3 };'
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 300
      }
    }
  };

  // Criar step para verificar status do Tomcat
  const checkTomcatStatusStep = {
    name: 'Check_Tomcat_Status',
    actionId: 'com.datadoghq.aws.system_manager.sendCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'documentName',
        value: 'AWS-RunShellScript'
      },
      {
        name: 'instanceIds',
        value: ['{{ Steps.Generate_Detailed_Message.data }}']
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl is-active tomcat || echo "inactive"'
          ]
        }
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 500
      }
    }
  };

  // Criar step para obter resultado do check de status
  const getCheckStatusResultStep = {
    name: 'Get_Check_Status_Result',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Check_Tomcat_Status.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 650
      }
    }
  };

  // Criar step para validar status e decidir próxima ação
  const validateStatusAndRetryStep = {
    name: 'Validate_Status_And_Retry',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat e decide se precisa retry'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat
const output = $.Steps.Get_Check_Status_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Obter contador atual - verificar se já existe (de retries anteriores)
let retryCount = 0;
let maxRetries = 3;

// Tentar obter do Init_Retry_Counter se existir
if ($.Steps.Init_Retry_Counter && $.Steps.Init_Retry_Counter.data) {
  const initData = $.Steps.Init_Retry_Counter.data;
  retryCount = initData.retryCount || 0;
  maxRetries = initData.maxRetries || 3;
}

// Se não encontrou, tentar do Update_Retry_Counter (se já houve retry)
if ($.Steps.Update_Retry_Counter && $.Steps.Update_Retry_Counter.data) {
  const updateData = $.Steps.Update_Retry_Counter.data;
  retryCount = updateData.retryCount || retryCount;
  maxRetries = updateData.maxRetries || maxRetries;
}

// Se Tomcat está ativo, retornar sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: 'Tomcat está rodando corretamente'
  };
}

// Se Tomcat não está ativo e ainda há tentativas
if (!tomcatActive && retryCount < maxRetries) {
  retryCount++;
  return {
    success: false,
    tomcatStatus: 'inactive',
    retryCount: retryCount,
    maxRetries: maxRetries,
    shouldRetry: true,
    message: \`Tomcat não está ativo. Tentativa \${retryCount}/\${maxRetries}\`
  };
}

// Se esgotou todas as tentativas
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  maxRetries: maxRetries,
  shouldRetry: false,
  message: 'Tomcat não subiu após todas as tentativas. Falha na reinicialização.'
};`
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 800
      }
    }
  };

  // Criar step para atualizar contador de retry
  const updateRetryCounterStep = {
    name: 'Update_Retry_Counter',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Atualiza contador de tentativas'
      },
      {
        name: 'script',
        value: `// Atualizar contador de retry
const validation = $.Steps.Validate_Status_And_Retry.data;
return {
  retryCount: validation.retryCount,
  maxRetries: validation.maxRetries,
  shouldRetry: validation.shouldRetry
};`
      }
    ],
    display: {
      bounds: {
        x: 300,
        y: 950
      }
    }
  };

  // Criar step de notificação de retry
  const retryNotificationStep = {
    name: 'Retry_Notification',
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
        value: `⚠️ **Retry de Reinicialização do Tomcat**

Olá, equipe! 👋

O serviço Tomcat não subiu após a reinicialização. Será realizada uma nova tentativa:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativa:** {{ Steps.Validate_Status_And_Retry.data.retryCount }}/{{ Steps.Validate_Status_And_Retry.data.maxRetries }}

**📊 Status atual:** {{ Steps.Validate_Status_And_Retry.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_Status_And_Retry.data.message }}

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: 300,
        y: 1100
      }
    }
  };

  // Criar step de notificação de falha final
  const finalFailureNotificationStep = {
    name: 'Final_Failure_Notification',
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
        value: `🚨 **FALHA: Tomcat não subiu após múltiplas tentativas**

Olá, equipe! 👋

⚠️ **ATENÇÃO:** O serviço Tomcat não subiu após todas as tentativas de reinicialização.

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativas realizadas:** {{ Steps.Validate_Status_And_Retry.data.retryCount }}/{{ Steps.Validate_Status_And_Retry.data.maxRetries }}

**📊 Status final:** {{ Steps.Validate_Status_And_Retry.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_Status_And_Retry.data.message }}

**⚠️ Ação necessária:** Intervenção manual pode ser necessária.

Por favor, verifique:
- Logs do sistema
- Status da instância EC2
- Configuração do serviço Tomcat

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: -200,
        y: 1100
      }
    }
  };

  // Atualizar o fluxo do workflow
  // 1. Após Restart_Tomcat, ir para Get_Command_Invocation
  // 2. Após Get_Command_Invocation, ir para Init_Retry_Counter
  // 3. Após Init_Retry_Counter, ir para Check_Tomcat_Status
  // 4. Após Check_Tomcat_Status, ir para Get_Check_Status_Result
  // 5. Após Get_Check_Status_Result, ir para Validate_Status_And_Retry
  // 6. Validate_Status_And_Retry pode ir para:
  //    - Se shouldRetry: Update_Retry_Counter -> Retry_Notification -> Restart_Tomcat (loop)
  //    - Se success: Message_Status_Tomcat
  //    - Se failure final: Final_Failure_Notification

  // Estratégia: Não fazer loop direto. Em vez disso, criar uma estrutura que evita múltiplas conexões
  // O fluxo será: Restart_Tomcat → GetCommandInvocation → (validação) → se precisa retry, criar novo comando de restart
  
  // Atualizar Restart_Tomcat - manter conexão com GetCommandInvocation
  restartTomcatStep.outboundEdges = [{
    nextStepName: getCommandInvocationStepName,
    branchName: 'main'
  }];

  // Atualizar GetCommandInvocation - conectar com Init_Retry_Counter
  // Remover conexão com JavaScript para evitar múltiplas conexões
  getCommandInvocationStep.outboundEdges = [{
    nextStepName: 'Init_Retry_Counter',
    branchName: 'main'
  }];
  
  // JavaScript step não será mais usado no fluxo principal (podemos removê-lo ou deixá-lo desconectado)
  // Se quiser manter, podemos deixá-lo sem conexões ou remover do workflow

  initRetryCounterStep.outboundEdges = [{
    nextStepName: 'Check_Tomcat_Status',
    branchName: 'main'
  }];

  // Configurar Check_Tomcat_Status
  checkTomcatStatusStep.outboundEdges = [{
    nextStepName: 'Get_Check_Status_Result',
    branchName: 'main'
  }];

  // Configurar Get_Check_Status_Result
  getCheckStatusResultStep.outboundEdges = [{
    nextStepName: 'Validate_Status_And_Retry',
    branchName: 'main'
  }];

  // Criar step de sucesso separado para evitar múltiplas conexões no Message_Status_Tomcat
  const successMessageStatusStep = {
    name: 'Success_Message_Status_Tomcat',
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
        value: `✅ **Status da Reinicialização do Serviço Tomcat**

Olá, equipe! 👋

Informamos o status da reinicialização automática do serviço Tomcat:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**⏰ Horário da operação:** {{ Workflow.startedAt }}

**🔧 Status:** Reinicialização concluída

**📋 Detalhes do comando executado:**
{{ Steps.GetCommandInvocation.command }}

O serviço Tomcat foi reiniciado com sucesso na instância acima. A instância deve estar disponível e operacional.

Se houver algum problema ou dúvida, entre em contato com a equipe de DevOps.

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: -200,
        y: 900
      }
    }
  };

  // Configurar Validate_Status_And_Retry com branches condicionais (usando step separado)
  // Se precisa retry, vai direto para Update_Retry_Counter (sem Retry_Notification intermediário)
  validateStatusAndRetryStep.outboundEdges = [
    {
      nextStepName: 'Update_Retry_Counter',
      branchName: 'retry',
      condition: '{{ Steps.Validate_Status_And_Retry.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Success_Message_Status_Tomcat',
      branchName: 'success',
      condition: '{{ Steps.Validate_Status_And_Retry.data.success }} === true'
    },
    {
      nextStepName: 'Final_Failure_Notification',
      branchName: 'failure',
      condition: '{{ Steps.Validate_Status_And_Retry.data.shouldRetry }} === false && {{ Steps.Validate_Status_And_Retry.data.success }} === false'
    }
  ];

  // Configurar Update_Retry_Counter
  updateRetryCounterStep.outboundEdges = [{
    nextStepName: 'Retry_Notification',
    branchName: 'main'
  }];

  // Criar step de restart adicional para retry (evita múltiplas conexões de entrada)
  const retryRestartTomcatStep = {
    name: 'Retry_Restart_Tomcat',
    actionId: 'com.datadoghq.aws.system_manager.sendCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'documentName',
        value: 'AWS-RunShellScript'
      },
      {
        name: 'instanceIds',
        value: ['{{ Steps.Generate_Detailed_Message.data }}']
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl restart tomcat'
          ]
        }
      }
    ],
    display: {
      bounds: {
        x: 300,
        y: 1250
      }
    }
  };

  // Step para obter resultado do retry restart
  const getRetryRestartCommandStep = {
    name: 'Get_Retry_Restart_Command',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Retry_Restart_Tomcat.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 300,
        y: 1400
      }
    }
  };

  // Configurar Retry_Notification está sendo configurado acima

  // Configurar Retry_Restart_Tomcat
  retryRestartTomcatStep.outboundEdges = [{
    nextStepName: 'Get_Retry_Restart_Command',
    branchName: 'main'
  }];

  // Criar step intermediário para retry check (evita múltiplas conexões)
  const retryCheckTomcatStatusStep = {
    name: 'Retry_Check_Tomcat_Status',
    actionId: 'com.datadoghq.aws.system_manager.sendCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'documentName',
        value: 'AWS-RunShellScript'
      },
      {
        name: 'instanceIds',
        value: ['{{ Steps.Generate_Detailed_Message.data }}']
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl is-active tomcat || echo "inactive"'
          ]
        }
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 1400
      }
    }
  };

  const retryGetCheckStatusResultStep = {
    name: 'Retry_Get_Check_Status_Result',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Retry_Check_Tomcat_Status.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 1550
      }
    }
  };

  // Configurar Get_Retry_Restart_Command - vai para Retry_Check_Tomcat_Status (não para Check_Tomcat_Status)
  getRetryRestartCommandStep.outboundEdges = [{
    nextStepName: 'Retry_Check_Tomcat_Status',
    branchName: 'main'
  }];

  // Configurar Retry_Check_Tomcat_Status
  retryCheckTomcatStatusStep.outboundEdges = [{
    nextStepName: 'Retry_Get_Check_Status_Result',
    branchName: 'main'
  }];

  // Criar versões separadas dos steps finais para evitar múltiplas conexões
  const retryMessageStatusStep = {
    name: 'Retry_Message_Status_Tomcat',
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
        value: `✅ **Status da Reinicialização do Serviço Tomcat (Após Retry)**

Olá, equipe! 👋

Informamos o status da reinicialização automática do serviço Tomcat após retry:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**⏰ Horário da operação:** {{ Workflow.startedAt }}

**🔧 Status:** Reinicialização concluída após {{ Steps.Retry_Validate_Status_And_Retry.data.retryCount }} tentativa(s)

**📋 Detalhes do comando executado:**
{{ Steps.Get_Retry_Restart_Command.command }}

O serviço Tomcat foi reiniciado com sucesso na instância acima. A instância deve estar disponível e operacional.

Se houver algum problema ou dúvida, entre em contato com a equipe de DevOps.

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: 700,
        y: 1700
      }
    }
  };

  const retryUpdateRetryCounterStep = {
    name: 'Retry_Update_Retry_Counter',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Atualiza contador de tentativas para retry'
      },
      {
        name: 'script',
        value: `// Atualizar contador de retry após primeira tentativa
const validation = $.Steps.Retry_Validate_Status_And_Retry.data;
return {
  retryCount: validation.retryCount,
  maxRetries: validation.maxRetries,
  shouldRetry: validation.shouldRetry
};`
      }
    ],
    display: {
      bounds: {
        x: 700,
        y: 1850
      }
    }
  };

  const retryFinalFailureNotificationStep = {
    name: 'Retry_Final_Failure_Notification',
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
        value: `🚨 **FALHA: Tomcat não subiu após múltiplas tentativas (Retry)**

Olá, equipe! 👋

⚠️ **ATENÇÃO:** O serviço Tomcat não subiu após todas as tentativas de reinicialização (incluindo retries).

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativas realizadas:** {{ Steps.Retry_Validate_Status_And_Retry.data.retryCount }}/{{ Steps.Retry_Validate_Status_And_Retry.data.maxRetries }}

**📊 Status final:** {{ Steps.Retry_Validate_Status_And_Retry.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Retry_Validate_Status_And_Retry.data.message }}

**⚠️ Ação necessária:** Intervenção manual pode ser necessária.

Por favor, verifique:
- Logs do sistema
- Status da instância EC2
- Configuração do serviço Tomcat

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: 700,
        y: 2000
      }
    }
  };

  // Criar versão de validação para retry (evita múltiplas conexões de entrada)
  const retryValidateStatusAndRetryStep = {
    name: 'Retry_Validate_Status_And_Retry',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat após retry e decide próxima ação'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat após retry
const output = $.Steps.Retry_Get_Check_Status_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Obter contador atual do Update_Retry_Counter
let retryCount = 0;
let maxRetries = 3;

if ($.Steps.Update_Retry_Counter && $.Steps.Update_Retry_Counter.data) {
  const updateData = $.Steps.Update_Retry_Counter.data;
  retryCount = updateData.retryCount || 0;
  maxRetries = updateData.maxRetries || 3;
}

// Se Tomcat está ativo, retornar sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: 'Tomcat está rodando corretamente após retry'
  };
}

// Se Tomcat não está ativo e ainda há tentativas
if (!tomcatActive && retryCount < maxRetries) {
  retryCount++;
  return {
    success: false,
    tomcatStatus: 'inactive',
    retryCount: retryCount,
    maxRetries: maxRetries,
    shouldRetry: true,
    message: \`Tomcat não está ativo após retry. Tentativa \${retryCount}/\${maxRetries}\`
  };
}

// Se esgotou todas as tentativas
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  maxRetries: maxRetries,
  shouldRetry: false,
  message: 'Tomcat não subiu após todas as tentativas. Falha na reinicialização.'
};`
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 1700
      }
    }
  };

  // Configurar Retry_Get_Check_Status_Result - vai para Retry_Validate_Status_And_Retry
  retryGetCheckStatusResultStep.outboundEdges = [{
    nextStepName: 'Retry_Validate_Status_And_Retry',
    branchName: 'main'
  }];

  // Configurar Retry_Validate_Status_And_Retry com branches condicionais (usando steps separados)
  retryValidateStatusAndRetryStep.outboundEdges = [
    {
      nextStepName: 'Retry_Update_Retry_Counter',
      branchName: 'retry',
      condition: '{{ Steps.Retry_Validate_Status_And_Retry.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Retry_Message_Status_Tomcat',
      branchName: 'success',
      condition: '{{ Steps.Retry_Validate_Status_And_Retry.data.success }} === true'
    },
    {
      nextStepName: 'Retry_Final_Failure_Notification',
      branchName: 'failure',
      condition: '{{ Steps.Retry_Validate_Status_And_Retry.data.shouldRetry }} === false && {{ Steps.Retry_Validate_Status_And_Retry.data.success }} === false'
    }
  ];

  // Criar versão separada de Retry_Notification para evitar múltiplas conexões
  const retryNotificationStep2 = {
    name: 'Retry_Notification_2',
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
        value: `⚠️ **Retry de Reinicialização do Tomcat (Tentativa 2)**

Olá, equipe! 👋

O serviço Tomcat não subiu após a reinicialização. Será realizada uma nova tentativa:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativa:** {{ Steps.Retry_Update_Retry_Counter.data.retryCount }}/{{ Steps.Retry_Update_Retry_Counter.data.maxRetries }}

**📊 Status atual:** Inativo

**💬 Mensagem:** Nova tentativa de reinicialização será executada

---
_Esta mensagem foi gerada automaticamente pelo workflow MVP - Automation_`
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
        x: 700,
        y: 1250
      }
    }
  };

  // Configurar Retry_Update_Retry_Counter - vai diretamente para Retry_Restart_Tomcat (evita step intermediário)
  retryUpdateRetryCounterStep.outboundEdges = [{
    nextStepName: 'Retry_Restart_Tomcat',
    branchName: 'main'
  }];

  // Remover Retry_Notification_2 da lista de steps (não será usado)
  // Retry_Notification_2 não será mais necessário

  // Retry_Message_Status_Tomcat e Retry_Final_Failure_Notification não têm outbound edges (finais)

  // Final_Failure_Notification não tem outbound edges (final)

  // Atualizar JavaScript step - manter conexão existente (não deve ir para Init_Retry_Counter)
  // O JavaScript step já deve estar conectado ao GetCommandInvocation ou outro step
  // Não vamos modificar suas conexões para evitar múltiplas conexões
  // O fluxo correto é: JavaScript → (algum step) → GetCommandInvocation → Init_Retry_Counter

  // Adicionar novos steps ao array
  const newSteps = [
    initRetryCounterStep,
    checkTomcatStatusStep,
    getCheckStatusResultStep,
    validateStatusAndRetryStep,
    successMessageStatusStep,
    updateRetryCounterStep,
    retryNotificationStep,
    retryRestartTomcatStep,
    getRetryRestartCommandStep,
    retryCheckTomcatStatusStep,
    retryGetCheckStatusResultStep,
    retryValidateStatusAndRetryStep,
    retryUpdateRetryCounterStep,
    // retryNotificationStep2 removido para evitar múltiplas conexões
    retryMessageStatusStep,
    retryFinalFailureNotificationStep,
    finalFailureNotificationStep
  ];

  // Atualizar steps existentes
  const updatedSteps = steps.map(step => {
    if (step.name === 'Restart_Tomcat') return restartTomcatStep;
    if (step.name === 'GetCommandInvocation') return getCommandInvocationStep;
    if (step.name === 'JavaScript') {
      // Manter JavaScript desconectado ou remover conexões
      const updatedJS = JSON.parse(JSON.stringify(step));
      updatedJS.outboundEdges = []; // Remover conexões para evitar múltiplas entradas
      return updatedJS;
    }
    // Message_Status_Tomcat será usado por Validate_Status_And_Retry e Retry_Validate_Status_And_Retry
    // Precisamos criar uma versão separada para evitar múltiplas conexões
    // Mas vamos manter o original e criar uma versão separada no fluxo de retry
    return step;
  });

  // Combinar todos os steps, removendo duplicatas
  const stepNames = new Set();
  const allSteps = [];
  
  // Primeiro, adicionar steps existentes (exceto os que serão substituídos)
  updatedSteps.forEach(step => {
    if (!stepNames.has(step.name)) {
      stepNames.add(step.name);
      allSteps.push(step);
    }
  });
  
  // Depois, adicionar novos steps
  newSteps.forEach(step => {
    if (!stepNames.has(step.name)) {
      stepNames.add(step.name);
      allSteps.push(step);
    } else {
      // Se já existe, substituir pelo novo
      const index = allSteps.findIndex(s => s.name === step.name);
      if (index >= 0) {
        allSteps[index] = step;
      }
    }
  });

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

    console.log('🛠️  Adicionando validação do Tomcat e lógica de retry...');
    const updatedSpec = addTomcatValidationAndRetry(workflowDetails);
    
    console.log(`✅ Spec atualizado com ${updatedSpec.steps.length} steps`);
    console.log('');

    // Mostrar preview das mudanças
    console.log('📊 Novos steps que serão adicionados:');
    console.log('');
    console.log('   ✓ Init_Retry_Counter - Inicializa contador de tentativas');
    console.log('   ✓ Check_Tomcat_Status - Verifica se Tomcat está ativo');
    console.log('   ✓ Get_Check_Status_Result - Obtém resultado da verificação');
    console.log('   ✓ Validate_Status_And_Retry - Valida status e decide próxima ação');
    console.log('   ✓ Update_Retry_Counter - Atualiza contador de tentativas');
    console.log('   ✓ Retry_Notification - Notifica sobre retry');
    console.log('   ✓ Retry_Restart_Tomcat - Executa restart em caso de retry');
    console.log('   ✓ Get_Retry_Restart_Command - Obtém resultado do retry restart');
    console.log('   ✓ Retry_Check_Tomcat_Status - Verifica status após retry');
    console.log('   ✓ Retry_Get_Check_Status_Result - Obtém resultado da verificação após retry');
    console.log('   ✓ Retry_Validate_Status_And_Retry - Valida status após retry');
    console.log('   ✓ Final_Failure_Notification - Notifica falha final');
    console.log('');
    console.log('🔄 Fluxo de execução:');
    console.log('   1. Restart_Tomcat → GetCommandInvocation');
    console.log('   2. GetCommandInvocation → Init_Retry_Counter');
    console.log('   3. Init_Retry_Counter → Check_Tomcat_Status');
    console.log('   4. Check_Tomcat_Status → Get_Check_Status_Result');
    console.log('   5. Get_Check_Status_Result → Validate_Status_And_Retry');
    console.log('   6. Validate_Status_And_Retry →');
    console.log('      - Se sucesso: Success_Message_Status_Tomcat');
    console.log('      - Se precisa retry: Update_Retry_Counter → Retry_Notification → Retry_Restart_Tomcat → Get_Retry_Restart_Command → Retry_Check_Tomcat_Status → Retry_Get_Check_Status_Result → Retry_Validate_Status_And_Retry (loop)');
    console.log('      - Se falha final: Final_Failure_Notification');
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
    console.log(`   • Novos steps adicionados: 16`);
    console.log(`   • Máximo de tentativas: 3`);
    console.log(`   • Validação de status: Habilitada`);
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

