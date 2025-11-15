#!/usr/bin/env node
/**
 * Script para simplificar o workflow mantendo validação e retry
 * Uso: node scripts/simplify-workflow-retry.js
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

function simplifyWorkflow(workflowData) {
  const spec = workflowData.data?.attributes?.spec || workflowData.attributes?.spec;
  if (!spec || !spec.steps) {
    throw new Error('Workflow não possui spec ou steps válidos');
  }

  const steps = [...spec.steps];
  
  // Encontrar steps relevantes
  const restartTomcatStep = steps.find(s => s.name === 'Restart_Tomcat');
  const getCommandInvocationStep = steps.find(s => s.name === 'GetCommandInvocation' || s.name === 'Get_Command_Invocation');
  const messageStatusStep = steps.find(s => s.name === 'Message_Status_Tomcat');
  
  if (!restartTomcatStep || !getCommandInvocationStep) {
    throw new Error('Steps Restart_Tomcat ou GetCommandInvocation não encontrados');
  }

  const getCommandInvocationStepName = getCommandInvocationStep.name;

  // Criar step simplificado que combina validação e decisão de retry (versão inicial)
  const validateAndRetryStep = {
    name: 'Validate_And_Retry',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat após restart inicial'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat após restart inicial
const commandOutput = $.Steps.${getCommandInvocationStepName}.output || {};
const statusCommand = commandOutput.StandardOutputContent || '';
const tomcatActive = statusCommand.trim() === 'active';

// Primeira tentativa
const retryCount = 0;
const maxRetries = 3;

// Se Tomcat está ativo, sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: 'Tomcat reiniciado com sucesso',
    shouldRetry: false
  };
}

// Se Tomcat não está ativo, precisa retry
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount + 1,
  maxRetries: maxRetries,
  shouldRetry: true,
  message: 'Tomcat não subiu. Iniciando retry...'
};`
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 600
      }
    }
  };

  // Criar versão de validação para após retry (evita múltiplas conexões)
  const validateAfterRetryStep = {
    name: 'Validate_After_Retry',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat após retry'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat após retry
const output = $.Steps.Get_Check_Retry_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Obter contador de retry do step anterior
const previousData = $.Steps.Validate_And_Retry?.data || { retryCount: 1 };
let retryCount = previousData.retryCount || 1;
const maxRetries = 3;

// Se Tomcat está ativo após retry, sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: \`Tomcat reiniciado com sucesso após \${retryCount} tentativa(s)\`,
    shouldRetry: false
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
    message: \`Tomcat não subiu. Tentativa \${retryCount}/\${maxRetries}\`
  };
}

// Se esgotou todas as tentativas
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  maxRetries: maxRetries,
  shouldRetry: false,
  message: 'Tomcat não subiu após todas as tentativas'
};`
      }
    ],
    display: {
      bounds: {
        x: 300,
        y: 800
      }
    }
  };

  // Criar step para extrair IDs das instâncias do List_EC2_instances
  const extractInstanceIdsStep = {
    name: 'Extract_Instance_Ids',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Extrai IDs das instâncias EC2 do step List_EC2_instances'
      },
      {
        name: 'script',
        value: `// Extrair IDs das instâncias do List_EC2_instances
const instances = $.Steps.List_EC2_instances.instances || [];
const targetTag = 'motor-porto-tomcat';

// Filtrar instâncias que têm a tag service=motor-porto-tomcat
const matchingInstances = instances.filter(instance => {
  return instance.Tags && instance.Tags.some(tag => tag.Key === 'service' && tag.Value === targetTag);
});

// Extrair apenas os InstanceIds
const instanceIds = matchingInstances.map(instance => instance.InstanceId).filter(id => id);

return instanceIds.length > 0 ? instanceIds : [];`
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 400
      }
    }
  };

  // Criar step simplificado que verifica status e reinicia se necessário (primeiro retry)
  const checkAndRetryStep = {
    name: 'Check_And_Retry_Tomcat',
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
        value: '{{ Steps.Extract_Instance_Ids.data }}'
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl is-active tomcat || (systemctl restart tomcat && sleep 5 && systemctl is-active tomcat)'
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

  // Step para obter resultado do check/retry
  const getCheckRetryResultStep = {
    name: 'Get_Check_Retry_Result',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Check_And_Retry_Tomcat.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 120,
        y: 650
      }
    }
  };

  // Step simplificado de validação final
  const finalValidationStep = {
    name: 'Final_Validation',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Validação final do status do Tomcat'
      },
      {
        name: 'script',
        value: `// Validação final do status
const output = $.Steps.Get_Check_Retry_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Obter dados de retry
const retryData = $.Steps.Validate_And_Retry?.data || { retryCount: 0 };
const retryCount = retryData.retryCount || 0;

if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: retryCount > 0 ? \`Tomcat reiniciado com sucesso após \${retryCount} tentativa(s)\` : 'Tomcat reiniciado com sucesso'
  };
}

return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  message: 'Tomcat não subiu após todas as tentativas'
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

  // Step de notificação de retry simplificado
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

O serviço Tomcat não subiu após a reinicialização. Será realizada uma nova tentativa automática:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativa:** {{ Steps.Validate_And_Retry.data.retryCount }}/{{ Steps.Validate_And_Retry.data.maxRetries }}

**📊 Status:** {{ Steps.Validate_And_Retry.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_And_Retry.data.message }}

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
        y: 700
      }
    }
  };

  // Step de notificação de falha final (após primeira tentativa)
  const failureNotificationStep = {
    name: 'Failure_Notification',
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

**🔄 Tentativas realizadas:** {{ Steps.Final_Validation.data.retryCount }}/3

**📊 Status final:** {{ Steps.Final_Validation.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Final_Validation.data.message }}

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
        y: 900
      }
    }
  };

  // Atualizar fluxo: Restart_Tomcat → GetCommandInvocation → Extract_Instance_Ids → Validate_And_Retry
  restartTomcatStep.outboundEdges = [{
    nextStepName: getCommandInvocationStepName,
    branchName: 'main'
  }];

  getCommandInvocationStep.outboundEdges = [{
    nextStepName: 'Extract_Instance_Ids',
    branchName: 'main'
  }];

  extractInstanceIdsStep.outboundEdges = [{
    nextStepName: 'Validate_And_Retry',
    branchName: 'main'
  }];

  // Validate_And_Retry decide: sucesso, retry ou falha
  validateAndRetryStep.outboundEdges = [
    {
      nextStepName: 'Check_And_Retry_Tomcat',
      branchName: 'retry',
      condition: '{{ Steps.Validate_And_Retry.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Success_Message_Status_Tomcat',
      branchName: 'success',
      condition: '{{ Steps.Validate_And_Retry.data.success }} === true'
    },
    {
      nextStepName: 'Failure_Notification',
      branchName: 'failure',
      condition: '{{ Steps.Validate_And_Retry.data.shouldRetry }} === false && {{ Steps.Validate_And_Retry.data.success }} === false'
    }
  ];

  // Se precisa retry: Check_And_Retry_Tomcat → Get_Check_Retry_Result → Retry_Notification → Validate_And_Retry (loop)
  checkAndRetryStep.outboundEdges = [{
    nextStepName: 'Get_Check_Retry_Result',
    branchName: 'main'
  }];

  getCheckRetryResultStep.outboundEdges = [{
    nextStepName: 'Retry_Notification',
    branchName: 'main'
  }];

  // Criar step de retry adicional (para loops subsequentes)
  const retryTomcatStep = {
    name: 'Retry_Tomcat',
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
        value: '{{ Steps.Extract_Instance_Ids.data }}'
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl is-active tomcat || (systemctl restart tomcat && sleep 5 && systemctl is-active tomcat)'
          ]
        }
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 700
      }
    }
  };

  const getRetryResultStep = {
    name: 'Get_Retry_Result',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Retry_Tomcat.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 850
      }
    }
  };

  // Criar versão de validação para loops subsequentes
  const validateRetryLoopStep = {
    name: 'Validate_Retry_Loop',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat após retry no loop'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat após retry no loop
const output = $.Steps.Get_Retry_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Obter contador de retry
const previousData = $.Steps.Validate_After_Retry?.data || { retryCount: 1 };
let retryCount = previousData.retryCount || 1;
const maxRetries = 3;

// Se Tomcat está ativo após retry, sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: \`Tomcat reiniciado com sucesso após \${retryCount} tentativa(s)\`,
    shouldRetry: false
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
    message: \`Tomcat não subiu. Tentativa \${retryCount}/\${maxRetries}\`
  };
}

// Se esgotou todas as tentativas
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  maxRetries: maxRetries,
  shouldRetry: false,
  message: 'Tomcat não subiu após todas as tentativas'
};`
      }
    ],
    display: {
      bounds: {
        x: 500,
        y: 1000
      }
    }
  };

  getRetryResultStep.outboundEdges = [{
    nextStepName: 'Validate_Retry_Loop',
    branchName: 'main'
  }];

  // Validate_Retry_Loop decide após retry no loop
  validateRetryLoopStep.outboundEdges = [
    {
      nextStepName: 'Success_Message_After_Retry_Loop',
      branchName: 'success',
      condition: '{{ Steps.Validate_Retry_Loop.data.success }} === true'
    },
    {
      nextStepName: 'Retry_Notification_Loop',
      branchName: 'retry',
      condition: '{{ Steps.Validate_Retry_Loop.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Failure_After_Retry_Loop',
      branchName: 'failure',
      condition: '{{ Steps.Validate_Retry_Loop.data.shouldRetry }} === false && {{ Steps.Validate_Retry_Loop.data.success }} === false'
    }
  ];
  
  // Criar versões separadas dos steps finais
  const successMessageAfterRetryStep = {
    name: 'Success_Message_After_Retry',
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

**🔧 Status:** Reinicialização concluída após {{ Steps.Validate_After_Retry.data.retryCount }} tentativa(s)

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
        x: 500,
        y: 900
      }
    }
  };

  const failureAfterRetryStep = {
    name: 'Failure_After_Retry',
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

**🔄 Tentativas realizadas:** {{ Steps.Validate_After_Retry.data.retryCount }}/{{ Steps.Validate_After_Retry.data.maxRetries }}

**📊 Status final:** {{ Steps.Validate_After_Retry.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_After_Retry.data.message }}

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
        x: 500,
        y: 1100
      }
    }
  };

  // Criar versões separadas para evitar múltiplas conexões
  const retryNotificationLoopStep = {
    name: 'Retry_Notification_Loop',
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
        value: `⚠️ **Retry de Reinicialização do Tomcat (Loop)**

Olá, equipe! 👋

O serviço Tomcat não subiu após a reinicialização. Será realizada uma nova tentativa automática:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativa:** {{ Steps.Validate_Retry_Loop.data.retryCount }}/{{ Steps.Validate_Retry_Loop.data.maxRetries }}

**📊 Status:** {{ Steps.Validate_Retry_Loop.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_Retry_Loop.data.message }}

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
        y: 1000
      }
    }
  };

  const successMessageAfterRetryLoopStep = {
    name: 'Success_Message_After_Retry_Loop',
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
        value: `✅ **Status da Reinicialização do Serviço Tomcat (Após Retry Loop)**

Olá, equipe! 👋

Informamos o status da reinicialização automática do serviço Tomcat após retry no loop:

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**⏰ Horário da operação:** {{ Workflow.startedAt }}

**🔧 Status:** Reinicialização concluída após {{ Steps.Validate_Retry_Loop.data.retryCount }} tentativa(s)

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
        y: 900
      }
    }
  };

  const failureAfterRetryLoopStep = {
    name: 'Failure_After_Retry_Loop',
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
        value: `🚨 **FALHA: Tomcat não subiu após múltiplas tentativas (Loop)**

Olá, equipe! 👋

⚠️ **ATENÇÃO:** O serviço Tomcat não subiu após todas as tentativas de reinicialização.

**📦 Instância:** {{ Steps.Generate_Detailed_Message.data }}

**🔄 Tentativas realizadas:** {{ Steps.Validate_Retry_Loop.data.retryCount }}/{{ Steps.Validate_Retry_Loop.data.maxRetries }}

**📊 Status final:** {{ Steps.Validate_Retry_Loop.data.tomcatStatus }}

**💬 Mensagem:** {{ Steps.Validate_Retry_Loop.data.message }}

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
        y: 1100
      }
    }
  };

  // Configurar conexões
  retryNotificationStep.outboundEdges = [{
    nextStepName: 'Retry_Tomcat',
    branchName: 'main'
  }];

  retryTomcatStep.outboundEdges = [{
    nextStepName: 'Get_Retry_Result',
    branchName: 'main'
  }];

  // Get_Retry_Result aponta para Validate_After_Retry (primeira vez após retry)
  // Get_Retry_Result_Loop aponta para Validate_Retry_Loop (loops subsequentes)
  getRetryResultStep.outboundEdges = [{
    nextStepName: 'Validate_After_Retry',
    branchName: 'main'
  }];

  // Criar versão separada do Retry_Tomcat para o loop
  const retryTomcatLoopStep = {
    name: 'Retry_Tomcat_Loop',
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
        value: '{{ Steps.Extract_Instance_Ids.data }}'
      },
      {
        name: 'parameters',
        value: {
          commands: [
            'systemctl is-active tomcat || (systemctl restart tomcat && sleep 5 && systemctl is-active tomcat)'
          ]
        }
      }
    ],
    display: {
      bounds: {
        x: 700,
        y: 700
      }
    }
  };

  const getRetryResultLoopStep = {
    name: 'Get_Retry_Result_Loop',
    actionId: 'com.datadoghq.aws.system_manager.getCommand',
    connectionLabel: 'INTEGRATION_AWS',
    parameters: [
      {
        name: 'region',
        value: 'us-east-1'
      },
      {
        name: 'commandId',
        value: '{{ Steps.Retry_Tomcat_Loop.command.CommandId }}'
      }
    ],
    display: {
      bounds: {
        x: 700,
        y: 850
      }
    }
  };

  retryNotificationLoopStep.outboundEdges = [{
    nextStepName: 'Retry_Tomcat_Loop',
    branchName: 'main'
  }];

  retryTomcatLoopStep.outboundEdges = [{
    nextStepName: 'Get_Retry_Result_Loop',
    branchName: 'main'
  }];

  getRetryResultLoopStep.outboundEdges = [{
    nextStepName: 'Validate_Retry_Loop',
    branchName: 'main'
  }];

  // Validate_Retry_Loop decide após retry no loop
  validateRetryLoopStep.outboundEdges = [
    {
      nextStepName: 'Success_Message_After_Retry_Loop',
      branchName: 'success',
      condition: '{{ Steps.Validate_Retry_Loop.data.success }} === true'
    },
    {
      nextStepName: 'Retry_Notification_Loop',
      branchName: 'retry',
      condition: '{{ Steps.Validate_Retry_Loop.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Failure_After_Retry_Loop',
      branchName: 'failure',
      condition: '{{ Steps.Validate_Retry_Loop.data.shouldRetry }} === false && {{ Steps.Validate_Retry_Loop.data.success }} === false'
    }
  ];

  // Validate_After_Retry decide após retry (primeira vez)
  validateAfterRetryStep.outboundEdges = [
    {
      nextStepName: 'Success_Message_After_Retry',
      branchName: 'success',
      condition: '{{ Steps.Validate_After_Retry.data.success }} === true'
    },
    {
      nextStepName: 'Retry_Notification',
      branchName: 'retry',
      condition: '{{ Steps.Validate_After_Retry.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Failure_After_Retry',
      branchName: 'failure',
      condition: '{{ Steps.Validate_After_Retry.data.shouldRetry }} === false && {{ Steps.Validate_After_Retry.data.success }} === false'
    }
  ];
  
  // Criar versão de validação específica para primeira vez após Check_And_Retry
  const validateAfterCheckRetryStep = {
    name: 'Validate_After_Check_Retry',
    actionId: 'com.datadoghq.datatransformation.func',
    parameters: [
      {
        name: 'description',
        value: 'Valida status do Tomcat após Check_And_Retry'
      },
      {
        name: 'script',
        value: `// Verificar status do Tomcat após Check_And_Retry
const output = $.Steps.Get_Check_Retry_Result.output || {};
const statusOutput = output.StandardOutputContent || '';
const tomcatActive = statusOutput.trim() === 'active';

// Primeira tentativa de retry
const retryCount = 1;
const maxRetries = 3;

// Se Tomcat está ativo após retry, sucesso
if (tomcatActive) {
  return {
    success: true,
    tomcatStatus: 'active',
    retryCount: retryCount,
    message: \`Tomcat reiniciado com sucesso após \${retryCount} tentativa\`,
    shouldRetry: false
  };
}

// Se Tomcat não está ativo e ainda há tentativas
if (!tomcatActive && retryCount < maxRetries) {
  return {
    success: false,
    tomcatStatus: 'inactive',
    retryCount: retryCount + 1,
    maxRetries: maxRetries,
    shouldRetry: true,
    message: \`Tomcat não subiu. Tentativa \${retryCount + 1}/\${maxRetries}\`
  };
}

// Se esgotou todas as tentativas
return {
  success: false,
  tomcatStatus: 'inactive',
  retryCount: retryCount,
  maxRetries: maxRetries,
  shouldRetry: false,
  message: 'Tomcat não subiu após todas as tentativas'
};`
      }
    ],
    display: {
      bounds: {
        x: 300,
        y: 800
      }
    }
  };

  // Get_Check_Retry_Result vai para Validate_After_Check_Retry
  getCheckRetryResultStep.outboundEdges = [{
    nextStepName: 'Validate_After_Check_Retry',
    branchName: 'main'
  }];

  // Validate_After_Check_Retry decide
  validateAfterCheckRetryStep.outboundEdges = [
    {
      nextStepName: 'Success_Message_After_Retry',
      branchName: 'success',
      condition: '{{ Steps.Validate_After_Check_Retry.data.success }} === true'
    },
    {
      nextStepName: 'Retry_Notification',
      branchName: 'retry',
      condition: '{{ Steps.Validate_After_Check_Retry.data.shouldRetry }} === true'
    },
    {
      nextStepName: 'Failure_After_Retry',
      branchName: 'failure',
      condition: '{{ Steps.Validate_After_Check_Retry.data.shouldRetry }} === false && {{ Steps.Validate_After_Check_Retry.data.success }} === false'
    }
  ];

  // Success_Message_Status_Tomcat e Failure_Notification são finais (sem outbound edges)

  // Criar Success_Message_Status_Tomcat (manter o que já existe ou criar novo)
  let successMessageStep = messageStatusStep;
  if (!successMessageStep || successMessageStep.name !== 'Message_Status_Tomcat') {
    // Se não encontrou, criar novo
    successMessageStep = {
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
{{ Steps.${getCommandInvocationStepName}.command }}

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
          y: 700
        }
      }
    };
  } else {
    // Atualizar o step existente para usar novo nome
    successMessageStep = JSON.parse(JSON.stringify(messageStatusStep));
    successMessageStep.name = 'Success_Message_Status_Tomcat';
  }

  // Filtrar steps - remover os steps de validação/retry complexos que criamos antes
  const stepsToRemove = [
    'Init_Retry_Counter',
    'Check_Tomcat_Status',
    'Get_Check_Status_Result',
    'Validate_Status_And_Retry',
    'Update_Retry_Counter',
    'Retry_Restart_Tomcat',
    'Get_Retry_Restart_Command',
    'Retry_Check_Tomcat_Status',
    'Retry_Get_Check_Status_Result',
    'Retry_Validate_Status_And_Retry',
    'Retry_Update_Retry_Counter',
    'Retry_Notification_2',
    'Retry_Message_Status_Tomcat',
    'Retry_Final_Failure_Notification',
    'Final_Failure_Notification',
    'JavaScript' // Remover JavaScript que não é mais usado
  ];

  const filteredSteps = steps.filter(step => {
    // Manter steps originais importantes
    const importantSteps = [
      'List_EC2_Instances',
      'Generate_Detailed_Message',
      'Info_Message',
      'Restart_Tomcat',
      getCommandInvocationStepName
    ];
    
    if (importantSteps.includes(step.name)) {
      return true;
    }
    
    // Manter steps de erro
    if (step.name.startsWith('Error_')) {
      return true;
    }
    
    // Remover steps de validação/retry complexos
    return !stepsToRemove.includes(step.name);
  });

  // Atualizar steps existentes
  const updatedSteps = filteredSteps.map(step => {
    if (step.name === 'Restart_Tomcat') return restartTomcatStep;
    if (step.name === getCommandInvocationStepName) return getCommandInvocationStep;
    if (step.name === 'Message_Status_Tomcat') return successMessageStep;
    return step;
  });

  // Adicionar novos steps simplificados
  const newSteps = [
    extractInstanceIdsStep,
    validateAndRetryStep,
    validateAfterCheckRetryStep,
    validateAfterRetryStep,
    validateRetryLoopStep,
    checkAndRetryStep,
    getCheckRetryResultStep,
    retryTomcatStep,
    getRetryResultStep,
    retryTomcatLoopStep,
    getRetryResultLoopStep,
    retryNotificationStep,
    retryNotificationLoopStep,
    failureNotificationStep,
    failureAfterRetryStep,
    failureAfterRetryLoopStep,
    successMessageAfterRetryStep,
    successMessageAfterRetryLoopStep,
    successMessageStep
  ];

  // Combinar, removendo duplicatas
  const stepNames = new Set();
  const allSteps = [];
  
  updatedSteps.forEach(step => {
    if (!stepNames.has(step.name)) {
      stepNames.add(step.name);
      allSteps.push(step);
    }
  });
  
  newSteps.forEach(step => {
    if (!stepNames.has(step.name)) {
      stepNames.add(step.name);
      allSteps.push(step);
    } else {
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

  return { updatedSpec, removedCount: steps.length - allSteps.length };
}

async function updateWorkflow(workflowId, updatedSpec) {
  try {
    const currentWorkflow = await getWorkflowDetails(workflowId);
    const currentAttributes = currentWorkflow.data?.attributes || currentWorkflow.attributes || {};
    
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
    const currentStepCount = workflowDetails.data?.attributes?.spec?.steps?.length || 0;
    console.log(`✅ Detalhes obtidos (${currentStepCount} steps atuais)`);
    console.log('');

    console.log('🛠️  Simplificando workflow...');
    const { updatedSpec, removedCount } = simplifyWorkflow(workflowDetails);
    
    const newStepCount = updatedSpec.steps.length;
    console.log(`✅ Workflow simplificado`);
    console.log(`   • Steps removidos: ${removedCount}`);
    console.log(`   • Steps finais: ${newStepCount}`);
    console.log(`   • Redução: ${((removedCount / currentStepCount) * 100).toFixed(1)}%`);
    console.log('');

    console.log('📊 Novo fluxo simplificado:');
    console.log('   1. Restart_Tomcat → GetCommandInvocation');
    console.log('   2. GetCommandInvocation → Extract_Instance_Ids');
    console.log('   3. Extract_Instance_Ids → Validate_And_Retry');
    console.log('   3. Validate_And_Retry →');
    console.log('      - Se sucesso: Success_Message_Status_Tomcat');
    console.log('      - Se precisa retry: Check_And_Retry_Tomcat → Get_Check_Retry_Result → Validate_After_Retry');
    console.log('   4. Validate_After_Retry →');
    console.log('      - Se sucesso: Success_Message_After_Retry');
    console.log('      - Se precisa mais retry: Retry_Notification → Check_And_Retry_Tomcat (loop)');
    console.log('      - Se falha final: Failure_After_Retry');
    console.log('');

    console.log('🚀 Atualizando workflow no Datadog...');
    const result = await updateWorkflow(workflowId, updatedSpec);
    
    console.log('');
    console.log('✅ Workflow simplificado com sucesso!');
    console.log('');
    console.log('📋 Resumo:');
    console.log(`   • Workflow ID: ${workflowId}`);
    console.log(`   • Steps antes: ${currentStepCount}`);
    console.log(`   • Steps depois: ${newStepCount}`);
    console.log(`   • Steps removidos: ${removedCount}`);
    console.log(`   • Funcionalidades mantidas:`);
    console.log(`     ✓ Validação do status do Tomcat`);
    console.log(`     ✓ Retry automático (até 3 tentativas)`);
    console.log(`     ✓ Notificações de retry, sucesso e falha`);
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

