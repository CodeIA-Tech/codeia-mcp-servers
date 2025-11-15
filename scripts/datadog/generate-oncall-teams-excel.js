#!/usr/bin/env node
/**
 * Gerador de Planilha para Estruturação de Times (Datadog OnCall + Teams)
 *
 * Cria uma planilha Excel consolidando:
 *  - Times do Datadog (ownership, escopo, tags)
 *  - Escalas de plantão (schedules OnCall)
 *  - Políticas de escalonamento
 *  - Canais do Microsoft Teams
 *  - Regras de roteamento (tags → políticas → canais)
 *
 * Objetivo: facilitar a implementação do modelo de priorização Vertem
 * no Datadog OnCall e alinhar com os canais de comunicação do Teams.
 */

import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datadogTeams = [
  {
    'Team Name': 'Vertem SRE & Infra',
    'Descrição': 'Equipe responsável por confiabilidade, infraestrutura cloud e serviços core.',
    'Owner / Role': 'Coordenador(a) SRE/Infra',
    'Escopo': 'Infraestrutura AWS, Kubernetes, bancos de dados e observabilidade.',
    'Tags de Serviços': 'team:sre, resource_type:infra, env:prod',
    'OnCall Associado': 'OnCall-SRE-Primario, OnCall-SRE-Secundario',
    'Canais Teams': '#alertas-prod-infra, #alertas-prod-aplicacao',
    'Observações': 'Responsável por revisar monitores P1/P2 e suportar squads 24x7.'
  },
  {
    'Team Name': 'Vertem Aplicações',
    'Descrição': 'Time transversal cobrindo aplicações críticas e integrações business.',
    'Owner / Role': 'Lead SRE + Team Leader Dev',
    'Escopo': 'APIs core, motor-porto-tomcat, integrações de pagamento e parceiros.',
    'Tags de Serviços': 'team:apps, resource_type:app, env:prod',
    'OnCall Associado': 'OnCall-Aplicacao-* (por squad)',
    'Canais Teams': '#alertas-prod-aplicacao',
    'Observações': 'Acompanha Golden Signals (latência, erros) e apoio a squads.'
  },
  {
    'Team Name': 'Parceiro Tivit',
    'Descrição': 'Parceiro NOC 24x7 responsável pela camada de infraestrutura gerenciada.',
    'Owner / Role': 'Ponto Focal Tivit',
    'Escopo': 'Camada de rede, servidores gerenciados, VPN, conectividade.',
    'Tags de Serviços': 'provider:tivit, resource_type:infra, env:prod',
    'OnCall Associado': 'OnCall-Tivit',
    'Canais Teams': '#alertas-tivit',
    'Observações': 'Recebe alertas P1/P2 de infra; Vertem escalona se SLA não cumprido.'
  },
  {
    'Team Name': 'Squad Motor-Porto',
    'Descrição': 'Squad responsável pelo motor-porto-tomcat e serviços associados.',
    'Owner / Role': 'Team Leader Motor-Porto',
    'Escopo': 'Servico motor-porto-tomcat, APIs Java, dependências Tomcat.',
    'Tags de Serviços': 'service:motor-porto-tomcat, squad:motor-porto',
    'OnCall Associado': 'OnCall-Aplicacao-MotorPorto',
    'Canais Teams': '#alertas-prod-aplicacao',
    'Observações': 'Suporte 09h–22h; fora da janela escalona para SRE 24x7.'
  },
  {
    'Team Name': 'Squad Integrações Externas',
    'Descrição': 'Responsável por integrações externas e APIs de parceiros.',
    'Owner / Role': 'Team Leader Integrações',
    'Escopo': 'APIs terceiros, filas SQS, webhooks externos.',
    'Tags de Serviços': 'squad:integracoes, integration:external',
    'OnCall Associado': 'OnCall-Aplicacao-Integracoes',
    'Canais Teams': '#alertas-prod-aplicacao',
    'Observações': 'Mantém visibilidade de dependências externas e SLAs.'
  },
  {
    'Team Name': 'Squad Pagamentos',
    'Descrição': 'Gestão de meios de pagamento, antifraude e conciliação.',
    'Owner / Role': 'Team Leader Pagamentos',
    'Escopo': 'Serviços checkout, billing, antifraude, conciliação financeira.',
    'Tags de Serviços': 'squad:pagamentos, service:checkout',
    'OnCall Associado': 'OnCall-Aplicacao-Pagamentos',
    'Canais Teams': '#alertas-prod-aplicacao',
    'Observações': 'Integra com gateways externos; monitora transações críticas.'
  }
];

const onCallSchedules = [
  {
    'Schedule Name': 'OnCall-SRE-Primario',
    'Cobertura': '24x7',
    'Janela / Turno': 'Rotação semanal (segunda 09h → segunda 09h), escalas 12h/12h opcionais.',
    'Participantes': 'Analistas SRE Pleno/Sênior + Coordenador(a) SRE/Infra',
    'Escopo': 'P1/P2 de infra e aplicação após escalonamento. Bridge com Tivit.',
    'Prioridades Atendidas': 'P1, P2 (qualquer horário)',
    'Escalonamento Posterior': 'Escala para OnCall-SRE-Secundario após 10 minutos sem ACK.',
    'Observações': 'Garantir contato telefônico configurado e verificado mensalmente.'
  },
  {
    'Schedule Name': 'OnCall-SRE-Secundario',
    'Cobertura': '24x7 (backup)',
    'Janela / Turno': 'Cobertura espelhada ao primário, atuando como backup.',
    'Participantes': 'SRE Seniors + Diretoria (apenas notificação crítica).',
    'Escopo': 'Recebe alertas quando primário não confirma.',
    'Prioridades Atendidas': 'P1 (10 min), P2 (30 min)',
    'Escalonamento Posterior': 'Aciona Diretoria via Teams/telefone.',
    'Observações': 'Base para War Room; realizar testes trimestrais de escalonamento.'
  },
  {
    'Schedule Name': 'OnCall-Aplicacao-MotorPorto',
    'Cobertura': 'Seg–Sex 09h–22h (horário estendido).',
    'Janela / Turno': 'Escala diária (turnos 09h–15h / 15h–22h).',
    'Participantes': 'Dev on-call do squad + Tech Lead.',
    'Escopo': 'Incidentes aplicação motor-porto-tomcat (P1/P2/P3).',
    'Prioridades Atendidas': 'P1 (imediato), P2 (dentro da janela), P3 via Teams.',
    'Escalonamento Posterior': 'Fora da janela: redireciona para OnCall-SRE-Primario.',
    'Observações': 'Manter documentação de rotinas e credenciais rotacionadas.'
  },
  {
    'Schedule Name': 'OnCall-Aplicacao-Integracoes',
    'Cobertura': 'Seg–Sex 09h–22h.',
    'Janela / Turno': 'Even split 09h–16h / 16h–22h.',
    'Participantes': 'Desenvolvedores integrações + SRE de suporte.',
    'Escopo': 'APIs externos, filas, jobs assíncronos.',
    'Prioridades Atendidas': 'P1/P2 (horário comercial), P3 via Teams.',
    'Escalonamento Posterior': 'Aciona SRE Primário após 15 min sem ACK.',
    'Observações': 'Registrar contatos externos críticos (fornecedores).'
  },
  {
    'Schedule Name': 'OnCall-Aplicacao-Pagamentos',
    'Cobertura': 'Seg–Sex 09h–22h + sábados 10h–18h (janela financeira).',
    'Janela / Turno': 'Revezamento diário.',
    'Participantes': 'Time Pagamentos + Lead Dev.',
    'Escopo': 'Checkout, billing, antifraude.',
    'Prioridades Atendidas': 'P1/P2 (janela ativa), P3/P4 via Teams e backlog.',
    'Escalonamento Posterior': 'SRE Primário (15 min) → SRE Secundário (30 min).',
    'Observações': 'Comunicar campanha de alto volume com antecedência.'
  },
  {
    'Schedule Name': 'OnCall-Tivit',
    'Cobertura': '24x7 (NOC).',
    'Janela / Turno': 'Escalas internas Tivit (não gerenciadas por Vertem).',
    'Participantes': 'Tivit NOC + especialistas conforme plantão.',
    'Escopo': 'Infraestrutura sob contrato (rede, servidores, storage).',
    'Prioridades Atendidas': 'P1, P2 (infra).',
    'Escalonamento Posterior': 'Aciona Vertem SRE caso SLA de resposta exceda 15 min.',
    'Observações': 'Integração via webhook (Zabbix → Datadog) + Teams #alertas-tivit.'
  }
];

const escalationPolicies = [
  {
    'Policy Name': 'EP-Aplicacao-P1',
    'Descrição': 'Escalonamento crítico para incidentes P1 em aplicações.',
    'Steps': [
      '1) OnCall-Aplicacao-<Squad> (imediato, call + push)',
      '2) OnCall-SRE-Primario (10 min sem ACK → call + SMS)',
      '3) OnCall-SRE-Secundario + Diretoria (30 min → call + Teams)'
    ].join('\n'),
    'Tempo entre Steps': '0 / 10 / 30 minutos',
    'Canais Teams': '#alertas-prod-aplicacao, #diretoria-alertas',
    'Notificações': 'Call, SMS, Push, Teams, Email resumo após recuperação',
    'Observações': 'Garantir war room automático (Teams) em abertura de P1.'
  },
  {
    'Policy Name': 'EP-Aplicacao-P2',
    'Descrição': 'Escalonamento para incidentes P2 em aplicações (horário comercial + estendido).',
    'Steps': [
      '1) OnCall-Aplicacao-<Squad> (push + Teams)',
      '2) OnCall-SRE-Primario (15 min sem ACK)',
      '3) OnCall-SRE-Secundario (60 min) + Lead SRE'
    ].join('\n'),
    'Tempo entre Steps': '0 / 15 / 60 minutos',
    'Canais Teams': '#alertas-prod-aplicacao',
    'Notificações': 'Push, Teams, Email diário',
    'Observações': 'Fora da janela (22h–09h) converter em P1 e seguir EP-Aplicacao-P1.'
  },
  {
    'Policy Name': 'EP-Infra-P1',
    'Descrição': 'Escalonamento crítico para incidentes P1 de infraestrutura.',
    'Steps': [
      '1) Webhook → Tivit (imediato) + Teams #alertas-tivit',
      '2) OnCall-SRE-Primario (15 min se SLA Tivit não cumprido)',
      '3) OnCall-SRE-Secundario + Diretor (30 min)'
    ].join('\n'),
    'Tempo entre Steps': '0 / 15 / 30 minutos',
    'Canais Teams': '#alertas-tivit, #alertas-prod-infra',
    'Notificações': 'Webhook Tivit, Call/SMS, Teams',
    'Observações': 'Registro de evidências em ticket compartilhado Vertem ↔ Tivit.'
  },
  {
    'Policy Name': 'EP-Infra-P2',
    'Descrição': 'Escalonamento para incidentes P2 de infraestrutura (SLA horário comercial).',
    'Steps': [
      '1) Webhook → Tivit (imediato)',
      '2) OnCall-SRE-Primario (30 min se sem ACK)',
      '3) Lead SRE + Coordenador Infra (60 min)'
    ].join('\n'),
    'Tempo entre Steps': '0 / 30 / 60 minutos',
    'Canais Teams': '#alertas-tivit, #alertas-prod-infra',
    'Notificações': 'Teams, Email com resumo diário',
    'Observações': 'Após 22h, apenas incidentes P1 geram call; P2 vira notificação discreta.'
  },
  {
    'Policy Name': 'EP-Comunicacao-Status',
    'Descrição': 'Comunicação executiva para diretoria e stakeholders.',
    'Steps': [
      '1) Lead SRE envia resumo (Teams #diretoria-alertas + Email)',
      '2) Coordenador SRE informa tempo estimado de recuperação',
      '3) Diretor aciona comitê se impacto > 60 min'
    ].join('\n'),
    'Tempo entre Steps': 'Abertura / 30 min / 60 min',
    'Canais Teams': '#diretoria-alertas',
    'Notificações': 'Teams, Email',
    'Observações': 'Usado em paralelo às políticas P1/P2 quando impacto alto.'
  }
];

const teamsChannels = [
  {
    'Channel': '#alertas-prod-aplicacao',
    'Objetivo': 'Centralizar alertas de produção para aplicações Vertem.',
    'Time Responsável': 'Vertem Aplicações + Squads',
    'Integrações': 'Datadog OnCall (webhook), Datadog Monitors (event stream).',
    'Regras de Uso': 'Utilizar threads por incidente, mencionar @OnCall e responsáveis.',
    'Escalonamento Associado': 'EP-Aplicacao-P1 / EP-Aplicacao-P2',
    'Observações': 'Canal público interno; registrar resumo final ao encerrar incidente.'
  },
  {
    'Channel': '#alertas-prod-infra',
    'Objetivo': 'Alertas de infraestrutura (cloud, rede, banco).',
    'Time Responsável': 'Vertem SRE & Infra',
    'Integrações': 'Datadog OnCall, AWS Health, CloudWatch.',
    'Regras de Uso': 'Registrar ação tomada; mover discussões longas para War Room.',
    'Escalonamento Associado': 'EP-Infra-P1 / EP-Infra-P2',
    'Observações': 'Logs de evidências devem ser anexados ao ticket do incidente.'
  },
  {
    'Channel': '#alertas-tivit',
    'Objetivo': 'Comunicação entre NOC Tivit e Vertem.',
    'Time Responsável': 'Parceiro Tivit + Vertem SRE',
    'Integrações': 'Webhook Zabbix → Teams, Datadog event relay.',
    'Regras de Uso': 'Somente alertas infra; manter registros mínimos (timestamp, ação).',
    'Escalonamento Associado': 'EP-Infra-P1 / EP-Infra-P2',
    'Observações': 'Monitorar SLA de resposta; Vertem assume se Tivit não responde.'
  },
  {
    'Channel': '#diretoria-alertas',
    'Objetivo': 'Atualizações para diretoria durante incidentes críticos.',
    'Time Responsável': 'Lead SRE + Diretoria Vertem',
    'Integrações': 'Resumos automáticos do OnCall (status page, incident bot).',
    'Regras de Uso': 'Somente comunicados oficiais e status reports.',
    'Escalonamento Associado': 'EP-Aplicacao-P1, EP-Infra-P1, EP-Comunicacao-Status',
    'Observações': 'Evitar discussões técnicas; foco em impacto e planos de ação.'
  },
  {
    'Channel': '#war-room-temporario',
    'Objetivo': 'War room temporário criado automaticamente para incidentes P1.',
    'Time Responsável': 'OnCall SRE + Squad impactado',
    'Integrações': 'Bot Datadog OnCall cria canal e adiciona participantes.',
    'Regras de Uso': 'Encerrar canal após incidente; anexar resumo final.',
    'Escalonamento Associado': 'EP-Aplicacao-P1 / EP-Infra-P1',
    'Observações': 'Configurar no OnCall para auto-archive após 7 dias.'
  }
];

const routingRules = [
  {
    'Tag Principal / Filtro': 'priority:p1 AND resource_type:app',
    'Monitor Exemplo': 'Latência P99 motor-porto',
    'Escalation Policy': 'EP-Aplicacao-P1',
    'Schedule Primário': 'OnCall-Aplicacao-MotorPorto',
    'Schedule Backup': 'OnCall-SRE-Primario',
    'Teams Channel': '#alertas-prod-aplicacao',
    'Observações': 'Fora da janela 09h–22h → redirecionar automaticamente para SRE Primário.'
  },
  {
    'Tag Principal / Filtro': 'priority:p2 AND resource_type:app',
    'Monitor Exemplo': 'Erro 5xx >10% API checkout',
    'Escalation Policy': 'EP-Aplicacao-P2',
    'Schedule Primário': 'OnCall-Aplicacao-Pagamentos',
    'Schedule Backup': 'OnCall-SRE-Primario',
    'Teams Channel': '#alertas-prod-aplicacao',
    'Observações': 'Uso de janela; após 22h converter para P1 ou enviar apenas Teams+Email.'
  },
  {
    'Tag Principal / Filtro': 'priority:p1 AND resource_type:infra',
    'Monitor Exemplo': 'CPU 95% hosts core',
    'Escalation Policy': 'EP-Infra-P1',
    'Schedule Primário': 'OnCall-Tivit',
    'Schedule Backup': 'OnCall-SRE-Primario',
    'Teams Channel': '#alertas-prod-infra, #alertas-tivit',
    'Observações': 'Verificar SLA Tivit (15 min); se não houver ACK, escalar automática Vertem.'
  },
  {
    'Tag Principal / Filtro': 'priority:p2 AND resource_type:infra',
    'Monitor Exemplo': 'Lag de replicação DB > 30s',
    'Escalation Policy': 'EP-Infra-P2',
    'Schedule Primário': 'OnCall-Tivit',
    'Schedule Backup': 'OnCall-SRE-Primario (horário comercial)',
    'Teams Channel': '#alertas-prod-infra',
    'Observações': 'Apenas Teams/Email após 22h; revisão diária pelo SRE.'
  },
  {
    'Tag Principal / Filtro': 'priority:p3',
    'Monitor Exemplo': 'Taxa de erros 4xx elevadas',
    'Escalation Policy': 'Sem OnCall (notificação)',
    'Schedule Primário': '—',
    'Schedule Backup': '—',
    'Teams Channel': '#alertas-prod-aplicacao',
    'Observações': 'Somente Teams + Email; revisar em stand-up diário.'
  },
  {
    'Tag Principal / Filtro': 'priority:p1 AND resource_type:infra AND provider:tivit',
    'Monitor Exemplo': 'Link MPLS indisponível',
    'Escalation Policy': 'EP-Infra-P1',
    'Schedule Primário': 'OnCall-Tivit',
    'Schedule Backup': 'OnCall-SRE-Primario',
    'Teams Channel': '#alertas-tivit',
    'Observações': 'Incluir telefone da Tivit em instruções do OnCall.'
  }
];

async function generateExcel() {
  console.log('📊 Gerando planilha de times OnCall + Teams...\n');

  const workbook = XLSX.utils.book_new();

  const wsTeams = XLSX.utils.json_to_sheet(datadogTeams);
  wsTeams['!cols'] = [
    { wch: 26 },
    { wch: 60 },
    { wch: 22 },
    { wch: 45 },
    { wch: 40 },
    { wch: 30 },
    { wch: 32 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsTeams, 'Datadog Teams');

  const wsSchedules = XLSX.utils.json_to_sheet(onCallSchedules);
  wsSchedules['!cols'] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 40 },
    { wch: 42 },
    { wch: 55 },
    { wch: 24 },
    { wch: 40 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsSchedules, 'OnCall Schedules');

  const wsPolicies = XLSX.utils.json_to_sheet(escalationPolicies);
  wsPolicies['!cols'] = [
    { wch: 26 },
    { wch: 55 },
    { wch: 70 },
    { wch: 25 },
    { wch: 40 },
    { wch: 32 },
    { wch: 50 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsPolicies, 'Escalation Policies');

  const wsChannels = XLSX.utils.json_to_sheet(teamsChannels);
  wsChannels['!cols'] = [
    { wch: 28 },
    { wch: 55 },
    { wch: 30 },
    { wch: 40 },
    { wch: 50 },
    { wch: 40 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsChannels, 'Teams Channels');

  const wsRouting = XLSX.utils.json_to_sheet(routingRules);
  wsRouting['!cols'] = [
    { wch: 45 },
    { wch: 40 },
    { wch: 26 },
    { wch: 30 },
    { wch: 30 },
    { wch: 35 },
    { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsRouting, 'Routing Rules');

  const outputDir = path.join(__dirname, '../docs');
  await fs.mkdir(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, 'Times-OnCall-Teams.xlsx');
  XLSX.writeFile(workbook, outputFile);

  console.log('✅ Planilha gerada com sucesso!');
  console.log(`📄 Arquivo: ${outputFile}\n`);
  console.log('📋 Abas incluídas:');
  console.log('   1. Datadog Teams');
  console.log('   2. OnCall Schedules');
  console.log('   3. Escalation Policies');
  console.log('   4. Teams Channels');
  console.log('   5. Routing Rules\n');

  return outputFile;
}

async function main() {
  console.log('🎯 Estrutura recomendada para OnCall + Teams Vertem\n');
  console.log('📌 Referências: Priorização de Alertas, fluxos Aplicação/Infra, parceria Tivit.\n');

  try {
    const file = await generateExcel();
    console.log('🚀 Próximos passos sugeridos:');
    console.log('   1. Revisar times e participantes com lideranças.');
    console.log('   2. Configurar schedules e políticas no Datadog OnCall.');
    console.log('   3. Criar/validar canais no Microsoft Teams.');
    console.log('   4. Atualizar documentação (runbooks, PRIORIZACAO-ALERTAS.md).');
    console.log(`   5. Compartilhar a planilha: ${file}\n`);
  } catch (error) {
    console.error('❌ Erro ao gerar planilha:', error.message);
    process.exit(1);
  }
}

main();


