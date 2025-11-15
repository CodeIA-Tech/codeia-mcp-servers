#!/usr/bin/env node
/**
 * Cria monitores no Datadog a partir de uma planilha Excel
 * Filtra monitores P1 para o serviço motor-porto-tomcat
 * 
 * Uso: node scripts/datadog/create-monitors-from-excel.js
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

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

function getCredentials() {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais não encontradas. Defina DD_API_KEY e DD_APP_KEY no .env');
  }

  return { apiKey, appKey, site };
}

/**
 * Lê a planilha Excel e retorna os dados da aba Build_Monitors
 */
function readExcelFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  
  if (!workbook.SheetNames.includes('Build_Monitors')) {
    throw new Error(`Aba 'Build_Monitors' não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`);
  }

  const worksheet = workbook.Sheets['Build_Monitors'];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return data;
}

/**
 * Filtra monitores por prioridade para motor-porto-tomcat
 */
function filterMonitorsByPriority(monitors, priorityFilter = 'P1') {
  return monitors.filter(monitor => {
    const service = (monitor.Service || monitor.service || '').toLowerCase();
    const priority = (monitor.Prioridade || monitor.Priority || monitor.prioridade || '').toString().toUpperCase().trim();
    
    return service.includes('motor-porto-tomcat') && priority === priorityFilter.toUpperCase();
  });
}

/**
 * Lê o template de mensagem baseado na prioridade
 */
function loadTemplate(priority = 'P1') {
  const priorityUpper = priority.toUpperCase();
  let templateName;
  
  if (priorityUpper === 'P1' || priorityUpper === 'P2') {
    templateName = 'Template - Monitors Datadog - P1P2.md';
  } else if (priorityUpper === 'P3' || priorityUpper === 'P4' || priorityUpper === 'P5') {
    templateName = 'Template - Monitors Datadog - P3P4P5.md';
  } else {
    // Default para P1P2
    templateName = 'Template - Monitors Datadog - P1P2.md';
  }
  
  const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', templateName);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Adapta o template para o monitor específico
 */
function adaptTemplate(template, monitor) {
  const service = monitor.Service || monitor.service || 'motor-porto-tomcat';
  const titulo = monitor.Titulo || monitor.Título || monitor.Title || monitor.Name || '';
  const priority = (monitor.Prioridade || monitor.Priority || monitor.prioridade || 'P1').toString().toUpperCase().trim();
  const isP3P4P5 = ['P3', 'P4', 'P5'].includes(priority);
  
  // Determina o tipo de alerta baseado no título
  let alertType = 'Apdex Baixo';
  let impacto = 'Usuários insatisfeitos com a performance.';
  let severidade;
  
  if (priority === 'P1') {
    severidade = 'P1 - Crítico';
  } else if (priority === 'P2') {
    severidade = 'P2 - Experiência Degradada';
  } else if (priority === 'P3') {
    severidade = 'P3 - Médio';
  } else if (priority === 'P4') {
    severidade = 'P4 - Baixo';
  } else {
    severidade = 'P5 - Informativo';
  }
  
  const tituloLower = titulo.toLowerCase();
  
  if (tituloLower.includes('erro') || tituloLower.includes('error') || tituloLower.includes('5xx') || tituloLower.includes('disponibilidade') || tituloLower.includes('4xx')) {
    if (priority === 'P1') {
      alertType = 'Taxa de Erro Crítica';
      impacto = 'Serviço com alta taxa de erros, afetando disponibilidade.';
    } else if (priority === 'P2') {
      alertType = 'Taxa de Erro Elevada';
      impacto = 'Serviço com taxa de erros elevada, degradação significativa.';
    } else {
      alertType = 'Taxa de Erro Moderada';
      impacto = 'Serviço com taxa de erros moderada, atenção preventiva.';
    }
  } else if (tituloLower.includes('latência') || tituloLower.includes('latency') || tituloLower.includes('p95') || tituloLower.includes('p99') || tituloLower.includes('p50') || tituloLower.includes('p75')) {
    if (priority === 'P1') {
      alertType = 'Latência Crítica';
      impacto = 'Serviço com latência muito alta, degradando experiência do usuário.';
    } else if (priority === 'P2') {
      alertType = 'Latência Elevada';
      impacto = 'Serviço com latência elevada, degradação significativa.';
    } else {
      alertType = 'Latência Moderada';
      impacto = 'Serviço com latência moderada, atenção preventiva.';
    }
  } else if (tituloLower.includes('tráfego') || tituloLower.includes('traffic') || tituloLower.includes('down') || tituloLower.includes('sem dados') || tituloLower.includes('queda') || tituloLower.includes('crescimento')) {
    if (priority === 'P1') {
      alertType = 'Tráfego Anormal ou Indisponibilidade';
      impacto = 'Serviço com tráfego muito baixo ou indisponível.';
    } else if (priority === 'P2') {
      alertType = 'Tráfego Anormal';
      impacto = 'Serviço com tráfego anormal, possível degradação.';
    } else {
      alertType = 'Tráfego com Variação';
      impacto = 'Serviço com variação de tráfego, monitoramento preventivo.';
    }
  } else if (tituloLower.includes('cpu') || tituloLower.includes('memória') || tituloLower.includes('memory') || tituloLower.includes('disco') || tituloLower.includes('disk') || tituloLower.includes('packet') || tituloLower.includes('network')) {
    if (priority === 'P1') {
      alertType = 'Recurso de Infraestrutura Crítico';
      impacto = 'Recurso de infraestrutura em estado crítico, risco de indisponibilidade.';
    } else if (priority === 'P2') {
      alertType = 'Recurso de Infraestrutura Elevado';
      impacto = 'Recurso de infraestrutura elevado, degradação significativa.';
    } else {
      alertType = 'Recurso de Infraestrutura Moderado';
      impacto = 'Recurso de infraestrutura moderado, atenção preventiva.';
    }
  } else if (tituloLower.includes('heap') || tituloLower.includes('thread') || tituloLower.includes('gc') || tituloLower.includes('jvm') || tituloLower.includes('file')) {
    if (priority === 'P1') {
      alertType = 'JVM em Estado Crítico';
      impacto = 'JVM com recursos esgotados, risco de indisponibilidade.';
    } else if (priority === 'P2') {
      alertType = 'JVM com Recursos Elevados';
      impacto = 'JVM com recursos elevados, degradação significativa.';
    } else {
      alertType = 'JVM com Recursos Moderados';
      impacto = 'JVM com recursos moderados, atenção preventiva.';
    }
  } else if (tituloLower.includes('database') || tituloLower.includes('query') || tituloLower.includes('connection')) {
    if (priority === 'P1') {
      alertType = 'Database Crítico';
      impacto = 'Database com problemas críticos, afetando disponibilidade.';
    } else if (priority === 'P2') {
      alertType = 'Database com Problemas';
      impacto = 'Database com problemas, degradação significativa.';
    } else {
      alertType = 'Database com Atenção';
      impacto = 'Database requerendo atenção, monitoramento preventivo.';
    }
  }

  let message = template
    .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, `${alertType}!`)
    .replace(/Usuários insatisfeitos com a performance\./g, impacto)
    .replace(/P2 - Experiência Degradada\./g, severidade)
    .replace(/motor-porto-tomcat/g, service)
    .replace(/APDEX do Motor de Porto/g, `${alertType} - ${service}`)
    .replace(/Motor de Porto/g, service);

  return message;
}

/**
 * Converte thresholds da planilha para formato Datadog
 */
function parseThresholds(thresholdsStr) {
  if (!thresholdsStr) {
    return { critical: 0 };
  }

  try {
    // Tenta parsear como JSON
    return JSON.parse(thresholdsStr);
  } catch {
    // Se não for JSON, tenta extrair valores numéricos
    const numbers = thresholdsStr.match(/\d+\.?\d*/g);
    if (numbers && numbers.length > 0) {
      return {
        critical: parseFloat(numbers[0]),
        warning: numbers.length > 1 ? parseFloat(numbers[1]) : undefined
      };
    }
    return { critical: 0 };
  }
}

/**
 * Cria um monitor no Datadog
 */
async function createMonitor(monitor, template, creds) {
  const name = monitor.Titulo || monitor.Título || monitor.Title || monitor.Name || 'Monitor sem nome';
  const query = monitor.Query || monitor.query || '';
  const type = monitor.Type || monitor.type || 'query alert';
  const priority = (monitor.Prioridade || monitor.Priority || monitor.prioridade || 'P1').toString().trim();
  
  if (!query) {
    throw new Error(`Monitor "${name}" não possui query definida`);
  }

  // Parse thresholds
  const thresholdsStr = monitor['Thresholds (JSON)'] || monitor.Thresholds || monitor.thresholds || '{}';
  const thresholds = parseThresholds(thresholdsStr);
  
  // Tags - usa tags sugeridas se existir, senão cria padrão
  let tags = [];
  if (monitor['Tags Sugeridas'] || monitor.Tags) {
    const tagsStr = monitor['Tags Sugeridas'] || monitor.Tags || '';
    tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
  } else {
    tags = [
      `service:motor-porto-tomcat`,
      `env:prd`,
      `team:thor-delivery`,
      `campaing:portoseguro`,
      `acionamento:porto`,
      `priority:${priority.toLowerCase()}`,
      `created-by:observability`,
      `integrated-by:script`
    ];

    // Adiciona categoria se existir
    const categoria = monitor.Categoria || monitor.Category || monitor.categoria || '';
    if (categoria) {
      tags.push(`category:${categoria.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }

  // Adapta template
  const message = adaptTemplate(template, monitor);

  // Monta payload
  const payload = {
    type: type,
    query: query,
    name: name,
    message: message,
    tags: tags,
    options: {
      thresholds: thresholds,
      notify_audit: false,
      notify_no_data: false,
      renotify_interval: 0,
      evaluation_delay: 60
    }
  };

  // Cria monitor
  const url = `https://api.${creds.site}/api/v1/monitor`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'DD-API-KEY': creds.apiKey,
      'DD-APPLICATION-KEY': creds.appKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return data;
}

async function main() {
  // Aceita prioridade como argumento (P1, P2, P3, etc)
  const priorityFilter = process.argv[2] || 'P1';
  const priorityLabel = priorityFilter.toUpperCase();
  
  console.log(`📊 Criando monitores ${priorityLabel} para motor-porto-tomcat a partir da planilha Excel...\n`);

  try {
    // Carrega credenciais
    const creds = getCredentials();
    console.log(`✅ Credenciais carregadas (Site: ${creds.site})\n`);

    // Lê planilha
    const excelPath = path.join(__dirname, '..', '..', 'docs', 'assets', 'Vertem-Datadog-Monitors.xlsx');
    console.log(`📖 Lendo planilha: ${excelPath}`);
    const monitors = readExcelFile(excelPath);
    console.log(`✅ ${monitors.length} linhas encontradas na planilha\n`);

    // Filtra monitores por prioridade
    const filteredMonitors = filterMonitorsByPriority(monitors, priorityFilter);
    console.log(`🔍 Filtrados ${filteredMonitors.length} monitores ${priorityLabel} para motor-porto-tomcat\n`);

    if (filteredMonitors.length === 0) {
      console.log(`⚠️  Nenhum monitor ${priorityLabel} encontrado para motor-porto-tomcat`);
      console.log('💡 Verifique se a planilha contém monitores com:');
      console.log('   - Service contendo "motor-porto-tomcat"');
      console.log(`   - Prioridade = "${priorityLabel}"`);
      return;
    }

    // Carrega template baseado na prioridade
    console.log(`📄 Carregando template de mensagem para ${priorityLabel}...`);
    const template = loadTemplate(priorityFilter);
    console.log('✅ Template carregado\n');

    // Cria monitores
    console.log(`🚀 Criando monitores ${priorityLabel} no Datadog...\n`);
    const results = {
      success: [],
      errors: []
    };

    for (let i = 0; i < filteredMonitors.length; i++) {
      const monitor = filteredMonitors[i];
      const name = monitor.Titulo || monitor.Título || monitor.Title || monitor.Name || `Monitor ${i + 1}`;
      
      console.log(`[${i + 1}/${filteredMonitors.length}] Criando: ${name}`);
      
      try {
        const created = await createMonitor(monitor, template, creds);
        results.success.push({
          name,
          id: created.id,
          url: `https://app.${creds.site}/monitors/${created.id}`
        });
        console.log(`   ✅ Criado com sucesso! ID: ${created.id}`);
        console.log(`   🔗 URL: https://app.${creds.site}/monitors/${created.id}\n`);
      } catch (error) {
        results.errors.push({
          name,
          error: error.message
        });
        console.log(`   ❌ Erro: ${error.message}\n`);
      }
    }

    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO');
    console.log('='.repeat(60));
    console.log(`✅ Criados com sucesso: ${results.success.length}`);
    console.log(`❌ Erros: ${results.errors.length}`);
    
    if (results.success.length > 0) {
      console.log('\n✅ Monitores criados:');
      results.success.forEach(r => {
        console.log(`   - ${r.name}`);
        console.log(`     ID: ${r.id}`);
        console.log(`     URL: ${r.url}\n`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      results.errors.forEach(r => {
        console.log(`   - ${r.name}: ${r.error}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao criar monitores:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

