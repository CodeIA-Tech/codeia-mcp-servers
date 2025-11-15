#!/usr/bin/env node
/**
 * Gerador de Diagrama AWS para motor-porto-tomcat
 * 
 * Usa ícones oficiais da AWS no draw.io
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DiagramGeneratorAWS from './diagram-generator-aws.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
const site = process.env.DATADOG_SITE || 'datadoghq.com';

async function queryMetrics(query, from, to) {
  return new Promise((resolve, reject) => {
    const url = `https://api.${site}/api/v1/query?from=${from}&to=${to}&query=${encodeURIComponent(query)}`;
    
    const options = {
      headers: {
        'DD-API-KEY': apiKey,
        'DD-APPLICATION-KEY': appKey,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function discoverArchitecture() {
  console.log('🔍 Descobrindo arquitetura do motor-porto-tomcat...\n');
  
  const now = Math.floor(Date.now() / 1000);
  const oneWeekAgo = now - (7 * 24 * 60 * 60);
  
  const architecture = {
    services: [],
    databases: [],
    caches: [],
    queues: [],
    external: [],
    dependencies: []
  };
  
  // Descobrir serviços
  console.log('📊 Buscando serviços ativos...');
  const servicesQuery = await queryMetrics(
    'avg:trace.servlet.request.hits{*}by{service}',
    oneWeekAgo,
    now
  );
  
  if (servicesQuery.series) {
    const serviceNames = new Set();
    servicesQuery.series.forEach(series => {
      const serviceTag = series.tag_set?.find(t => t.startsWith('service:'));
      if (serviceTag) {
        serviceNames.add(serviceTag.replace('service:', ''));
      }
    });
    
    console.log(`   ✅ Encontrados: ${serviceNames.size} serviços`);
    serviceNames.forEach(name => console.log(`      • ${name}`));
    
    serviceNames.forEach(name => {
      architecture.services.push({
        id: name,
        name: name,
        type: 'service',
        language: name.includes('tomcat') ? 'java' : 'unknown',
        env: 'prod'
      });
    });
  }
  
  // Buscar databases
  console.log('\n💾 Buscando databases...');
  const dbQuery = await queryMetrics(
    'avg:trace.sql.query.duration{*}by{service,db.instance}',
    oneWeekAgo,
    now
  );
  
  if (dbQuery.series) {
    const databases = new Map();
    dbQuery.series.forEach(series => {
      const dbTag = series.tag_set?.find(t => t.startsWith('db.instance:'));
      const serviceTag = series.tag_set?.find(t => t.startsWith('service:'));
      
      if (dbTag && serviceTag) {
        const dbName = dbTag.replace('db.instance:', '');
        const serviceName = serviceTag.replace('service:', '');
        
        if (!databases.has(dbName)) {
          databases.set(dbName, new Set());
        }
        databases.get(dbName).add(serviceName);
      }
    });
    
    console.log(`   ✅ Encontrados: ${databases.size} databases`);
    databases.forEach((services, dbName) => {
      console.log(`      • ${dbName}`);
      architecture.databases.push({
        id: dbName,
        name: dbName,
        type: 'database',
        env: 'prod'
      });
      
      services.forEach(serviceName => {
        architecture.dependencies.push({
          from: serviceName,
          to: dbName,
          type: 'sql'
        });
      });
    });
  }
  
  // Buscar Redis/Cache
  console.log('\n🗄️  Buscando caches...');
  const cacheQuery = await queryMetrics(
    'avg:trace.redis.command.duration{*}by{service,redis.instance}',
    oneWeekAgo,
    now
  );
  
  if (cacheQuery.series && cacheQuery.series.length > 0) {
    const caches = new Map();
    cacheQuery.series.forEach(series => {
      const redisTag = series.tag_set?.find(t => t.startsWith('redis.instance:'));
      const serviceTag = series.tag_set?.find(t => t.startsWith('service:'));
      
      if (redisTag && serviceTag) {
        const cacheName = redisTag.replace('redis.instance:', '');
        const serviceName = serviceTag.replace('service:', '');
        
        if (!caches.has(cacheName)) {
          caches.set(cacheName, new Set());
        }
        caches.get(cacheName).add(serviceName);
      }
    });
    
    console.log(`   ✅ Encontrados: ${caches.size} caches`);
    caches.forEach((services, cacheName) => {
      console.log(`      • ${cacheName}`);
      architecture.caches.push({
        id: cacheName,
        name: `ElastiCache-${cacheName}`,
        type: 'cache',
        env: 'prod'
      });
      
      services.forEach(serviceName => {
        architecture.dependencies.push({
          from: serviceName,
          to: `ElastiCache-${cacheName}`,
          type: 'cache'
        });
      });
    });
  }
  
  return architecture;
}

async function main() {
  console.log('🏗️  Gerador de Diagrama AWS - motor-porto-tomcat\n');
  console.log('🎨 Usando ícones oficiais da AWS!\n');
  
  try {
    // Descobrir arquitetura
    const architecture = await discoverArchitecture();
    
    // Criar diretório de saída
    const outputDir = path.join(__dirname, '../diagrams');
    await fs.promises.mkdir(outputDir, { recursive: true });
    
    // Salvar JSON
    const jsonPath = path.join(outputDir, 'motor-porto-aws-architecture.json');
    await fs.promises.writeFile(jsonPath, JSON.stringify(architecture, null, 2));
    console.log(`\n📄 Arquitetura salva: ${jsonPath}`);
    
    // Gerar diagramas com ícones AWS
    console.log('\n🎨 Gerando diagramas com ícones AWS...');
    const diagramGen = new DiagramGeneratorAWS({
      width: 1800,
      height: 1200
    });
    
    // HTML
    const htmlPath = path.join(outputDir, 'motor-porto-aws-architecture.html');
    await diagramGen.saveDiagram(architecture, htmlPath, 'html');
    
    // draw.io
    const drawioPath = path.join(outputDir, 'motor-porto-aws-architecture.drawio');
    await diagramGen.saveDiagram(architecture, drawioPath, 'drawio');
    
    console.log('\n✅ Diagramas com ícones AWS gerados com sucesso!');
    console.log('\n📂 Arquivos gerados:');
    console.log(`   • ${htmlPath}`);
    console.log(`   • ${drawioPath}`);
    console.log(`   • ${jsonPath}`);
    
    console.log('\n📊 Resumo da Arquitetura:');
    console.log(`   • Serviços: ${architecture.services.length}`);
    console.log(`   • Databases: ${architecture.databases.length}`);
    console.log(`   • Caches: ${architecture.caches.length}`);
    console.log(`   • Dependências: ${architecture.dependencies.length}`);
    
    console.log('\n🌐 Visualizar:');
    console.log(`   node scripts/serve-report.js 8080`);
    console.log(`   http://localhost:8080/diagrams/motor-porto-aws-architecture.html`);
    
    console.log('\n✏️  Editar no draw.io:');
    console.log(`   • Clique em "Editar no draw.io" no HTML`);
    console.log(`   • As bibliotecas AWS já estarão carregadas!`);
    console.log(`   • Ícones: EC2, RDS, ElastiCache, Lambda, ECS, K8s`);
    
    console.log('\n🎨 Adicionar mais ícones no draw.io:');
    console.log(`   • File → Open Library → selecione:`);
    console.log(`     - AWS 19 (mais recente)`);
    console.log(`     - Azure`);
    console.log(`     - Google Cloud Platform`);
    console.log(`     - Kubernetes`);
    console.log(`     - Terraform\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

