#!/usr/bin/env node
/**
 * Cria monitores P2 no Datadog a partir da planilha Excel
 * Usa a aba Build_Monitors e o template Template-dd-portoseguromiddlewareapprd-p1p2.md
 * 
 * Uso: node scripts/datadog/create-p2-monitors-portoseguromiddlewareapprd.js
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
  
  // Tenta Build_Monitors_1 primeiro, depois Build_Monitors
  const sheetName = workbook.SheetNames.includes('Build_Monitors_1') 
    ? 'Build_Monitors_1' 
    : workbook.SheetNames.includes('Build_Monitors')
    ? 'Build_Monitors'
    : null;
  
  if (!sheetName) {
    throw new Error(`Aba 'Build_Monitors_1' ou 'Build_Monitors' não encontrada. Abas disponíveis: ${workbook.SheetNames.join(', ')}`);
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return data;
}

/**
 * Filtra monitores P2
 */
function filterMonitorsP2(monitors) {
  return monitors.filter(monitor => {
    const priority = (monitor.Prioridade || monitor.Priority || monitor.prioridade || '').toString().toUpperCase().trim();
    return priority === 'P2';
  });
}

/**
 * Lê o template Template-dd-portoseguromiddlewareapprd-p1p2.md
 */
function loadTemplate() {
  const templatePath = path.join(__dirname, '..', '..', 'assets', 'templates', 'datadog', 'Template-dd-portoseguromiddlewareapprd-p1p2.md');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template não encontrado: ${templatePath}`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Determina o tipo do monitor (aplicação ou infraestrutura)
 */
function determineTipo(monitorName) {
  const nameLower = monitorName.toLowerCase();
  
  // Infraestrutura: CPU, memória, disco, rede, pods, containers, kubernetes, JVM, GC, heap, threads
  const infraKeywords = [
    'cpu', 'memória', 'memory', 'disco', 'disk', 'network', 'packet', 
    'pod', 'container', 'kubernetes', 'jvm', 'gc', 'heap', 'thread', 
    'file descriptor', 'oom', 'crash', 'saturation', 'hpa', 'node',
    'cluster', 'namespace', 'kube'
  ];
  
  // Verifica infraestrutura primeiro
  for (const keyword of infraKeywords) {
    if (nameLower.includes(keyword)) {
      return 'infraestrutura';
    }
  }
  
  // Default: aplicação
  return 'aplicacao';
}

/**
 * Adapta o template para o monitor específico P2
 */
function adaptTemplate(template, monitor) {
  const service = 'portoseguromiddlewareapprd';
  const titulo = monitor.Titulo || monitor.Título || monitor.Title || monitor.Name || '';
  const priority = 'P2';
  
  // Determina o tipo de alerta baseado no título
  let alertType = 'Monitoramento de Atenção';
  let impacto = 'Serviço requerendo atenção.';
  let severidade = 'P2 - Experiência Degradada';
  
  const tituloLower = titulo.toLowerCase();
  
  if (tituloLower.includes('erro') || tituloLower.includes('error') || tituloLower.includes('5xx') || tituloLower.includes('disponibilidade') || tituloLower.includes('4xx')) {
    alertType = 'Taxa de Erro Elevada';
    impacto = 'Serviço com taxa de erros elevada, degradação significativa.';
  } else if (tituloLower.includes('latência') || tituloLower.includes('latency') || tituloLower.includes('p95') || tituloLower.includes('p99') || tituloLower.includes('p50') || tituloLower.includes('p75')) {
    alertType = 'Latência Elevada';
    impacto = 'Serviço com latência elevada, degradação significativa.';
  } else if (tituloLower.includes('tráfego') || tituloLower.includes('traffic') || tituloLower.includes('down') || tituloLower.includes('sem dados') || tituloLower.includes('queda') || tituloLower.includes('crescimento')) {
    alertType = 'Tráfego Anormal';
    impacto = 'Serviço com tráfego anormal, possível degradação.';
  } else if (tituloLower.includes('cpu') || tituloLower.includes('memória') || tituloLower.includes('memory') || tituloLower.includes('disco') || tituloLower.includes('disk') || tituloLower.includes('packet') || tituloLower.includes('network')) {
    alertType = 'Recurso de Infraestrutura Elevado';
    impacto = 'Recurso de infraestrutura elevado, degradação significativa.';
  } else if (tituloLower.includes('heap') || tituloLower.includes('thread') || tituloLower.includes('gc') || tituloLower.includes('jvm') || tituloLower.includes('file')) {
    alertType = 'JVM com Recursos Elevados';
    impacto = 'JVM com recursos elevados, degradação significativa.';
  } else if (tituloLower.includes('database') || tituloLower.includes('query') || tituloLower.includes('connection')) {
    alertType = 'Database com Problemas';
    impacto = 'Database com problemas, degradação significativa.';
  } else if (tituloLower.includes('pod') || tituloLower.includes('crash') || tituloLower.includes('oom') || tituloLower.includes('kubernetes')) {
    alertType = 'Kubernetes - Estado Requer Atenção';
    impacto = 'Recursos Kubernetes requerendo atenção.';
  }

  let message = template
    .replace(/Apdex Baixo \(Satisfação do Usuário\)!/g, `${alertType}!`)
    .replace(/Usuários insatisfeitos com a performance\./g, impacto)
    .replace(/P2 - Experiência Degradada\./g, severidade)
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
 * Corrige queries inválidas
 */
function fixQuery(query) {
  if (!query) return query;
  
  // Corrige queries que comparam duas agregações diretamente
  if (query.includes('sum(last_5m):') && query.includes('sum(last_15m):') && query.includes('>') && query.includes('*')) {
    const parts = query.split('>');
    if (parts.length === 2) {
      const leftSide = parts[0].trim();
      const rightSide = parts[1].trim();
      
      const leftMatch = leftSide.match(/sum\(last_5m\):([^}]+})/);
      const rightMatch = rightSide.match(/sum\(last_15m\):([^}]+})/);
      
      if (leftMatch && rightMatch) {
        const metric = leftMatch[1];
        const multiplierMatch = rightSide.match(/\*\s*(\d+\.?\d*)/);
        const multiplier = multiplierMatch ? multiplierMatch[1] : '1.5';
        
        // Para queries de crescimento, usa threshold absoluto
        // O threshold deve ser ajustado baseado no tráfego normal
        return `sum(last_5m):${metric}.as_count() > 15000`;
      }
    }
  }
  
  return query;
}

/**
 * Cria um monitor no Datadog
 */
async function createMonitor(monitor, template, creds) {
  const name = monitor.Titulo || monitor.Título || monitor.Title || monitor.Name || 'Monitor sem nome';
  let query = monitor.Query || monitor.query || '';
  const type = monitor.Type || monitor.type || 'query alert';
  const priority = 'P2';
  const service = 'portoseguromiddlewareapprd';
  
  if (!query) {
    throw new Error(`Monitor "${name}" não possui query definida`);
  }
  
  // Corrige query se necessário
  query = fixQuery(query);
  
  // Substitui motor-porto-tomcat por portoseguromiddlewareapprd na query
  query = query.replace(/motor-porto-tomcat/g, service);

  // Parse thresholds
  const thresholdsStr = monitor['Thresholds (JSON)'] || monitor.Thresholds || monitor.thresholds || '{}';
  const thresholds = parseThresholds(thresholdsStr);
  
  // Determina tipo
  const tipo = determineTipo(name);
  
  // Tags
  let tags = [];
  if (monitor['Tags Sugeridas'] || monitor.Tags) {
    const tagsStr = monitor['Tags Sugeridas'] || monitor.Tags || '';
    tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
  } else {
    tags = [
      `service:${service}`,
      `env:prd`,
      `team:thor-delivery`,
      `campaing:portoseguro`,
      `acionamento:porto`,
      `priority:p2`,
      `tipo:${tipo}`,
      `created-by:observability`,
      `integrated-by:script`
    ];

    // Adiciona categoria se existir
    const categoria = monitor.Categoria || monitor.Category || monitor.categoria || '';
    if (categoria) {
      tags.push(`category:${categoria.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }
  
  // Garante que a tag tipo está presente
  const hasTipoTag = tags.some(t => t.startsWith('tipo:'));
  if (!hasTipoTag) {
    tags.push(`tipo:${tipo}`);
  }
  
  // Garante que service está correto
  tags = tags.filter(t => !t.startsWith('service:'));
  tags.push(`service:${service}`);

  // Adapta template
  const message = adaptTemplate(template, monitor);

  // Monta payload
  const payload = {
    type: type,
    query: query,
    name: name.replace(/motor-porto-tomcat/g, service),
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
  console.log(`📊 Criando monitores P2 para portoseguromiddlewareapprd a partir da planilha Excel...\n`);

  try {
    // Carrega credenciais
    const creds = getCredentials();
    console.log(`✅ Credenciais carregadas (Site: ${creds.site})\n`);

    // Lê planilha
    const excelPath = path.join(__dirname, '..', '..', 'docs', 'assets', 'Vertem-Datadog-Monitors.xlsx');
    console.log(`📖 Lendo planilha: ${excelPath}`);
    const monitors = readExcelFile(excelPath);
    console.log(`✅ ${monitors.length} linhas encontradas na planilha\n`);

    // Filtra monitores P2
    const filteredMonitors = filterMonitorsP2(monitors);
    console.log(`🔍 Filtrados ${filteredMonitors.length} monitores P2\n`);

    if (filteredMonitors.length === 0) {
      console.log(`⚠️  Nenhum monitor P2 encontrado na planilha`);
      return;
    }

    // Carrega template
    console.log(`📄 Carregando template Template-dd-portoseguromiddlewareapprd-p1p2.md...`);
    const template = loadTemplate();
    console.log('✅ Template carregado\n');

    // Cria monitores
    console.log(`🚀 Criando monitores P2 no Datadog...\n`);
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
        const tipo = determineTipo(name);
        
        results.success.push({
          name,
          id: created.id,
          tipo: tipo,
          url: `https://app.${creds.site}/monitors/${created.id}`
        });
        console.log(`   ✅ Criado com sucesso! ID: ${created.id}`);
        console.log(`   🏷️  Tipo: ${tipo}`);
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
      // Agrupa por tipo
      const porTipo = {
        aplicacao: [],
        infraestrutura: []
      };
      
      results.success.forEach(r => {
        porTipo[r.tipo].push(r);
      });
      
      if (porTipo.aplicacao.length > 0) {
        console.log(`\n📱 Aplicação (${porTipo.aplicacao.length}):`);
        porTipo.aplicacao.forEach(r => {
          console.log(`   - ${r.name}`);
          console.log(`     ID: ${r.id}`);
          console.log(`     URL: ${r.url}\n`);
        });
      }
      
      if (porTipo.infraestrutura.length > 0) {
        console.log(`\n🖥️  Infraestrutura (${porTipo.infraestrutura.length}):`);
        porTipo.infraestrutura.forEach(r => {
          console.log(`   - ${r.name}`);
          console.log(`     ID: ${r.id}`);
          console.log(`     URL: ${r.url}\n`);
        });
      }
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

