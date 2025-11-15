#!/usr/bin/env node
/**
 * Teste da API do Datadog para verificar serviços disponíveis
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

async function testAPI(endpoint, apiVersion = 'v2') {
  return new Promise((resolve, reject) => {
    const url = `https://api.${site}/api/${apiVersion}/${endpoint}`;
    console.log(`\n🔍 Testando: ${url}`);
    
    const options = {
      headers: {
        'DD-API-KEY': apiKey,
        'DD-APPLICATION-KEY': appKey,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
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
          console.log(`   Erro: ${data.substring(0, 200)}`);
          resolve({ status: res.statusCode, error: data });
        }
      });
    }).on('error', (err) => {
      console.log(`   Erro de conexão: ${err.message}`);
      reject(err);
    });
  });
}

async function main() {
  console.log('🧪 Teste da API do Datadog APM\n');
  console.log(`Site: ${site}`);
  console.log(`API Key: ${apiKey?.substring(0, 10)}...`);
  console.log(`App Key: ${appKey?.substring(0, 10)}...`);
  
  // Teste 1: API v2 services
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 1: Listando serviços (API v2)');
  const services = await testAPI('services?filter[env]=prod', 'v2');
  
  if (services.data && services.data.data) {
    console.log(`   ✅ Encontrados: ${services.data.data.length} serviços`);
    if (services.data.data.length > 0) {
      console.log('\n   Serviços encontrados:');
      services.data.data.slice(0, 10).forEach(svc => {
        const name = svc.attributes?.name || svc.id;
        const env = svc.attributes?.env || 'N/A';
        console.log(`   • ${name} (env: ${env})`);
      });
    }
  } else {
    console.log('   ⚠️  Nenhum serviço encontrado');
  }
  
  // Teste 2: API v1 services
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Teste 2: Listando serviços (API v1)');
  const servicesV1 = await testAPI('services?env=prod', 'v1');
  
  if (servicesV1.data) {
    if (Array.isArray(servicesV1.data)) {
      console.log(`   ✅ Encontrados: ${servicesV1.data.length} serviços`);
      if (servicesV1.data.length > 0) {
        console.log('\n   Serviços encontrados:');
        servicesV1.data.slice(0, 10).forEach(name => {
          console.log(`   • ${name}`);
          if (name.includes('motor') || name.includes('tomcat')) {
            console.log(`     🎯 ENCONTRADO: ${name}`);
          }
        });
      }
    }
  }
  
  // Teste 3: Buscar motor-porto-tomcat
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔎 Teste 3: Buscando "motor-porto-tomcat"');
  
  // Tentar diferentes variações de ambiente
  const envs = ['prod', 'prd', 'production'];
  for (const env of envs) {
    console.log(`\n   Testando env: ${env}`);
    const result = await testAPI(`services?env=${env}`, 'v1');
    if (result.data && Array.isArray(result.data)) {
      const motorServices = result.data.filter(name => 
        name.includes('motor') || name.includes('tomcat') || name.includes('porto')
      );
      if (motorServices.length > 0) {
        console.log(`   ✅ Encontrados em "${env}":`);
        motorServices.forEach(name => {
          console.log(`      • ${name}`);
        });
      } else {
        console.log(`   ⚠️  Nenhum serviço "motor" encontrado em "${env}"`);
      }
    }
  }
  
  // Teste 4: Listar todos os serviços de todos os ambientes
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Teste 4: Listando TODOS os serviços (sem filtro de env)');
  const allServices = await testAPI('services', 'v1');
  
  if (allServices.data && Array.isArray(allServices.data)) {
    console.log(`   ✅ Total de serviços: ${allServices.data.length}`);
    
    // Buscar motor-porto-tomcat
    const motorServices = allServices.data.filter(name => 
      name.includes('motor') || name.includes('tomcat') || name.includes('porto')
    );
    
    if (motorServices.length > 0) {
      console.log(`\n   🎯 Serviços relacionados ao motor-porto-tomcat:`);
      motorServices.forEach(name => {
        console.log(`      • ${name}`);
      });
    } else {
      console.log(`\n   ⚠️  Nenhum serviço "motor" ou "tomcat" encontrado`);
      console.log(`\n   Primeiros 20 serviços (para referência):`);
      allServices.data.slice(0, 20).forEach(name => {
        console.log(`      • ${name}`);
      });
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);

