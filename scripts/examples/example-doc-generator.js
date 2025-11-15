#!/usr/bin/env node
/**
 * Exemplo de uso do Documentation Generator
 */

import DocGenerator from './doc-generator.js';
import { promises as fs } from 'fs';

async function createSOPExample() {
  console.log('📝 Gerando exemplo de SOP...');
  
  const generator = new DocGenerator();
  
  const doc = generator.generateDoc({
    title: 'SOP - Deploy de Aplicação em Produção',
    version: '2.0.0',
    author: 'Equipe SRE - Vertem',
    status: 'Ativo',
    objective: 'Definir o procedimento padrão para deploy seguro de aplicações em ambiente de produção.',
    scope: 'Este SOP aplica-se a todos os deploys de aplicações backend e frontend nos ambientes de produção AWS e on-premises.',
    tableOfContents: generator.generateTableOfContents(DocGenerator.templates.sop.sections),
    customContent: {
      MAIN_SECTION_TITLE: 'Procedimento de Deploy',
      MAIN_CONTENT: `
### 3.1 Pré-Deploy

- [ ] Code review aprovado
- [ ] Testes automatizados passando (100%)
- [ ] Documentação atualizada
- [ ] Backup do ambiente atual

### 3.2 Deploy

1. **Comunicar** no Slack #deployments
2. **Criar** tag de release no Git
3. **Executar** pipeline de CI/CD
4. **Monitorar** métricas durante deploy
5. **Validar** healthchecks

### 3.3 Pós-Deploy

- [ ] Smoke tests executados
- [ ] Métricas normais
- [ ] Logs sem erros críticos
- [ ] Comunicar sucesso
`,
      TEAM_1: 'SRE',
      RESPONSIBILITIES_TEAM_1: `
- Executar deploy seguindo SOP
- Monitorar métricas durante processo
- Realizar rollback se necessário
- Documentar problemas encontrados
`,
      TEAM_2: 'Desenvolvimento',
      RESPONSIBILITIES_TEAM_2: `
- Garantir qualidade do código
- Participar de code reviews
- Estar disponível durante deploy
- Corrigir bugs identificados
`,
      PROCESS_DESCRIPTION: `
### Fluxo do Processo

\`\`\`
1. Preparação
   ↓
2. Validação (QA)
   ↓
3. Aprovação (Tech Lead)
   ↓
4. Deploy (SRE)
   ↓
5. Validação (Smoke Tests)
   ↓
6. Monitoramento (15 min)
\`\`\`
`,
      METRICS: `
- **Deployment Frequency:** Diária
- **Lead Time for Changes:** < 24h
- **MTTR:** < 1h
- **Change Failure Rate:** < 5%
`,
      REVIEW_FREQUENCY_1: 'Mensal',
      REVIEW_RESPONSIBLE_1: 'Coordenador SRE',
      REVIEW_ACTIVITY_1: 'Revisar métricas de deploy',
      REVIEW_FREQUENCY_2: 'Trimestral',
      REVIEW_RESPONSIBLE_2: 'Time SRE + Dev',
      REVIEW_ACTIVITY_2: 'Atualizar procedimento',
      REFERENCES: `
- [DORA Metrics](https://www.devops-research.com/research.html)
- [Deployment Best Practices](https://aws.amazon.com/builders-library/)
- [Blue-Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
`,
      TEAM_NAME: 'Equipe SRE Vertem',
      CHANGES: 'Versão inicial do SOP',
      NEXT_REVIEW: 'Fevereiro 2025'
    }
  });

  await generator.saveDoc(doc, 'SOP-DEPLOY-PRODUCAO.md');
}

async function createRunbookExample() {
  console.log('📘 Gerando exemplo de Runbook...');
  
  const generator = new DocGenerator();
  
  const doc = generator.generateDoc({
    title: 'Runbook - Troubleshooting API Gateway',
    version: '1.0.0',
    author: 'Equipe SRE - Vertem',
    status: 'Ativo',
    objective: 'Guia de troubleshooting para problemas comuns no API Gateway.',
    scope: 'API Gateway em produção (AWS)',
    customContent: {
      MAIN_SECTION_TITLE: 'Troubleshooting',
      MAIN_CONTENT: `
### Problema 1: Alta Latência

**Sintomas:**
- Latência P95 > 2000ms
- Clientes reportando lentidão

**Diagnóstico:**
\`\`\`bash
# Verificar métricas no Datadog
aws cloudwatch get-metric-statistics --metric-name Latency

# Verificar logs
aws logs tail /aws/apigateway/prod --follow
\`\`\`

**Solução:**
1. Identificar endpoint específico
2. Verificar caches
3. Analisar queries do database
4. Considerar scaling

### Problema 2: Erros 5xx

**Sintomas:**
- Taxa de erro > 5%
- Logs com stack traces

**Diagnóstico:**
\`\`\`bash
# Verificar logs de erro
kubectl logs -l app=api-gateway --tail=100
\`\`\`
`,
      TEAM_NAME: 'Equipe SRE',
      TEAM_1: 'SRE',
      TEAM_2: 'Desenvolvimento',
      RESPONSIBILITIES_TEAM_1: 'Executar troubleshooting',
      RESPONSIBILITIES_TEAM_2: 'Corrigir bugs identificados',
      PROCESS_DESCRIPTION: 'Seguir procedimentos descritos acima',
      METRICS: 'MTTR < 1h para P1/P2',
      REVIEW_FREQUENCY_1: 'Mensal',
      REVIEW_RESPONSIBLE_1: 'SRE',
      REVIEW_ACTIVITY_1: 'Atualizar troubleshooting',
      REVIEW_FREQUENCY_2: 'Trimestral',
      REVIEW_RESPONSIBLE_2: 'SRE + Dev',
      REVIEW_ACTIVITY_2: 'Revisar procedimentos',
      REFERENCES: 'Documentação AWS API Gateway',
      CHANGES: 'Versão inicial',
      NEXT_REVIEW: 'Fevereiro 2025'
    }
  });

  await generator.saveDoc(doc, 'RUNBOOK-API-GATEWAY.md');
}

async function main() {
  console.log('📚 Gerador de Documentação - Exemplos\n');
  
  try {
    await createSOPExample();
    await createRunbookExample();
    
    console.log('\n✅ Exemplos gerados com sucesso!');
    console.log('\n📂 Documentos gerados:');
    console.log('   • docs/SOP-DEPLOY-PRODUCAO.md');
    console.log('   • docs/RUNBOOK-API-GATEWAY.md');
    console.log('\n📖 Templates disponíveis:');
    console.log('   • SOP - Standard Operating Procedure');
    console.log('   • Runbook - Troubleshooting Guide');
    console.log('   • Policy - Políticas e Diretrizes');
    console.log('   • Architecture - Documentação de Arquitetura\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

