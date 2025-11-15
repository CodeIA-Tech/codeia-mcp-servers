#!/usr/bin/env node
/**
 * Exemplo de Geração de Diagrama com Dados Simulados
 * 
 * Demonstra a funcionalidade sem precisar de credenciais do Datadog
 */

import DiagramGenerator from '../diagrams/diagram-generator.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dados de exemplo simulando uma arquitetura real
const architectureExample = {
  services: [
    {
      id: 'api-gateway',
      name: 'API Gateway',
      type: 'service',
      language: 'node',
      env: 'prod'
    },
    {
      id: 'auth-service',
      name: 'Auth Service',
      type: 'service',
      language: 'python',
      env: 'prod'
    },
    {
      id: 'user-service',
      name: 'User Service',
      type: 'service',
      language: 'java',
      env: 'prod'
    },
    {
      id: 'order-service',
      name: 'Order Service',
      type: 'service',
      language: 'go',
      env: 'prod'
    },
    {
      id: 'payment-service',
      name: 'Payment Service',
      type: 'service',
      language: 'python',
      env: 'prod'
    },
    {
      id: 'notification-service',
      name: 'Notification Service',
      type: 'service',
      language: 'node',
      env: 'prod'
    }
  ],
  databases: [
    {
      id: 'postgres-main',
      name: 'PostgreSQL Main',
      type: 'database',
      env: 'prod'
    },
    {
      id: 'mongodb-orders',
      name: 'MongoDB Orders',
      type: 'database',
      env: 'prod'
    }
  ],
  caches: [
    {
      id: 'redis-cache',
      name: 'Redis Cache',
      type: 'cache',
      env: 'prod'
    }
  ],
  queues: [
    {
      id: 'kafka-events',
      name: 'Kafka Events',
      type: 'queue',
      env: 'prod'
    }
  ],
  external: [],
  dependencies: [
    { from: 'API Gateway', to: 'Auth Service', type: 'http' },
    { from: 'API Gateway', to: 'User Service', type: 'http' },
    { from: 'API Gateway', to: 'Order Service', type: 'http' },
    { from: 'Auth Service', to: 'PostgreSQL Main', type: 'sql' },
    { from: 'Auth Service', to: 'Redis Cache', type: 'cache' },
    { from: 'User Service', to: 'PostgreSQL Main', type: 'sql' },
    { from: 'User Service', to: 'Redis Cache', type: 'cache' },
    { from: 'Order Service', to: 'MongoDB Orders', type: 'nosql' },
    { from: 'Order Service', to: 'Payment Service', type: 'http' },
    { from: 'Order Service', to: 'Kafka Events', type: 'async' },
    { from: 'Notification Service', to: 'Kafka Events', type: 'async' }
  ]
};

async function main() {
  console.log('🎨 Exemplo de Geração de Diagrama de Arquitetura\n');
  
  try {
    // Criar diretório de saída
    const outputDir = path.join(__dirname, '../diagrams');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Gerar diagramas
    console.log('📊 Gerando diagramas...');
    const diagramGen = new DiagramGenerator({
      width: 1400,
      height: 900
    });
    
    // HTML5 interativo
    const htmlPath = path.join(outputDir, 'example-architecture.html');
    await diagramGen.saveDiagram(architectureExample, htmlPath, 'html');
    
    // Draw.io (XML)
    const drawioPath = path.join(outputDir, 'example-architecture.drawio');
    await diagramGen.saveDiagram(architectureExample, drawioPath, 'drawio');
    
    // SVG standalone
    const svgPath = path.join(outputDir, 'example-architecture.svg');
    await diagramGen.saveDiagram(architectureExample, svgPath, 'svg');
    
    // JSON dos dados
    const jsonPath = path.join(outputDir, 'example-architecture.json');
    await fs.writeFile(jsonPath, JSON.stringify(architectureExample, null, 2));
    
    console.log('\n✅ Diagramas de exemplo gerados com sucesso!');
    console.log('\n📂 Arquivos gerados:');
    console.log(`   • ${htmlPath}`);
    console.log(`   • ${drawioPath}`);
    console.log(`   • ${svgPath}`);
    console.log(`   • ${jsonPath}`);
    
    console.log('\n🌐 Como visualizar:');
    console.log(`   1. Abrir HTML: file://${htmlPath}`);
    console.log(`   2. Ou usar servidor: node scripts/serve-report.js 8080`);
    console.log(`      Depois: http://localhost:8080/diagrams/example-architecture.html`);
    
    console.log('\n✏️  Para editar no draw.io:');
    console.log(`   1. Acesse: https://app.diagrams.net/`);
    console.log(`   2. File → Open from → Device`);
    console.log(`   3. Selecione: ${path.basename(drawioPath)}`);
    console.log(`   4. Ou clique no botão "Editar no draw.io" no HTML\n`);
    
    console.log('📊 Estatísticas da Arquitetura:');
    console.log(`   • Serviços: ${architectureExample.services.length}`);
    console.log(`   • Databases: ${architectureExample.databases.length}`);
    console.log(`   • Caches: ${architectureExample.caches.length}`);
    console.log(`   • Queues: ${architectureExample.queues.length}`);
    console.log(`   • Dependências: ${architectureExample.dependencies.length}\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

