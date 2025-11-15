#!/usr/bin/env node
/**
 * Teste da API APM do Datadog
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function testAPI(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = `https://api.${site}${endpoint}`;
    console.log(`\n🔍 Testando: ${method} ${url}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'DD-API-KEY': apiKey,
        'DD-APPLICATION-KEY': appKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        } else {
          console.log(`   Erro: ${data.substring(0, 300)}`);
          resolve({ status: res.statusCode, error: data });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   Erro de conexão: ${err.message}`);
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function main() {
  console.log('🧪 Teste da API APM do Datadog\n');
  console.log(`Site: ${site}`);
  console.log(`API Key: ${apiKey?.substring(0, 10)}...`);
  console.log(`App Key: ${appKey?.substring(0, 10)}...`);
  
  // Teste 1: Listar serviços APM
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 1: Lista de serviços APM');
  
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const servicesResult = await testAPI(
    `/api/v2/apm/config/service-catalog?page[size]=100`,
    'GET'
  );
  
  if (servicesResult.data && servicesResult.data.data) {
    console.log(`   ✅ Encontrados: ${servicesResult.data.data.length} serviços`);
    if (servicesResult.data.data.length > 0) {
      console.log('\n   Serviços encontrados:');
      servicesResult.data.data.forEach(svc => {
        const name = svc.attributes?.schema?.['dd-service'] || svc.id;
        console.log(`   • ${name}`);
        if (name && (name.includes('motor') || name.includes('tomcat'))) {
          console.log(`     🎯 ENCONTRADO: ${name}`);
        }
      });
    }
  }
  
  // Teste 2: Query de traces
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 2: Buscar traces com motor-porto-tomcat');
  
  const tracesResult = await testAPI(
    `/api/v2/traces/analytics?` + 
    `start=${oneWeekAgo}&` +
    `end=${now}&` +
    `query=service:motor-porto-tomcat`,
    'GET'
  );
  
  if (tracesResult.data) {
    console.log(`   Resposta recebida`);
    if (tracesResult.data.data) {
      console.log(`   Dados: ${JSON.stringify(tracesResult.data.data).substring(0, 200)}`);
    }
  }
  
  // Teste 3: Listar todas as tags de service
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 3: Listar tags "service"');
  
  const tagsResult = await testAPI(
    `/api/v1/search?q=tags:service:*`,
    'GET'
  );
  
  if (tagsResult.data && tagsResult.data.results) {
    console.log(`   ✅ Encontradas: ${tagsResult.data.results.services?.length || 0} tags de serviço`);
    if (tagsResult.data.results.services) {
      console.log('\n   Serviços encontrados:');
      tagsResult.data.results.services.slice(0, 30).forEach(name => {
        console.log(`   • ${name}`);
        if (name.includes('motor') || name.includes('tomcat')) {
          console.log(`     🎯 ENCONTRADO: ${name}`);
        }
      });
    }
  }
  
  // Teste 4: Metrics query
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 4: Query de métricas APM');
  
  const metricsResult = await testAPI(
    `/api/v1/query?` +
    `from=${Math.floor(oneWeekAgo/1000)}&` +
    `to=${Math.floor(now/1000)}&` +
    `query=avg:trace.servlet.request.hits{*}by{service}`,
    'GET'
  );
  
  if (metricsResult.data && metricsResult.data.series) {
    console.log(`   ✅ Encontradas: ${metricsResult.data.series.length} séries`);
    if (metricsResult.data.series.length > 0) {
      console.log('\n   Serviços com traces:');
      metricsResult.data.series.forEach(series => {
        const service = series.tag_set?.find(t => t.startsWith('service:'));
        if (service) {
          const serviceName = service.replace('service:', '');
          console.log(`   • ${serviceName}`);
          if (serviceName.includes('motor') || serviceName.includes('tomcat')) {
            console.log(`     🎯 ENCONTRADO: ${serviceName}`);
          }
        }
      });
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);

