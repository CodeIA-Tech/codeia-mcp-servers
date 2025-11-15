#!/usr/bin/env node
/**
 * Gerador de Diagramas de Arquitetura
 * 
 * Coleta dados do Datadog APM e gera diagramas de arquitetura
 */

import DatadogAPMHelper from './datadog-apm-helper.js';
import DiagramGenerator from './diagram-generator.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const env = process.argv[2] || 'prod';
  const outputDir = path.join(__dirname, '../diagrams');
  
  try {
    console.log('🎨 Gerador de Diagramas de Arquitetura\n');
    
    // Criar diretório de saída
    await fs.mkdir(outputDir, { recursive: true });
    
    // 1. Coletar dados do Datadog APM
    console.log('📡 Conectando ao Datadog APM...');
    const apmHelper = new DatadogAPMHelper();
    const architecture = await apmHelper.generateArchitecture(env);
    
    // Salvar dados brutos
    const jsonPath = path.join(outputDir, `architecture-${env}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(architecture, null, 2));
    console.log(`📄 Dados salvos: ${jsonPath}\n`);
    
    // 2. Gerar diagramas
    console.log('🎨 Gerando diagramas...');
    const diagramGen = new DiagramGenerator();
    
    // HTML5 interativo
    const htmlPath = path.join(outputDir, `architecture-${env}.html`);
    await diagramGen.saveDiagram(architecture, htmlPath, 'html');
    
    // Draw.io (XML)
    const drawioPath = path.join(outputDir, `architecture-${env}.drawio`);
    await diagramGen.saveDiagram(architecture, drawioPath, 'drawio');
    
    // SVG standalone
    const svgPath = path.join(outputDir, `architecture-${env}.svg`);
    await diagramGen.saveDiagram(architecture, svgPath, 'svg');
    
    console.log('\n✅ Diagramas gerados com sucesso!');
    console.log('\n📂 Arquivos gerados:');
    console.log(`   • ${htmlPath}`);
    console.log(`   • ${drawioPath}`);
    console.log(`   • ${svgPath}`);
    console.log(`   • ${jsonPath}`);
    
    console.log('\n🌐 Como usar:');
    console.log(`   1. Abrir HTML: file://${htmlPath}`);
    console.log(`   2. Editar no draw.io: https://app.diagrams.net`);
    console.log(`      → File → Open from → Device → Selecione ${path.basename(drawioPath)}`);
    console.log(`   3. Ou clique no botão "Editar no draw.io" no HTML\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.message.includes('DD_API_KEY')) {
      console.log('\n💡 Configure as variáveis de ambiente:');
      console.log('   export DD_API_KEY="sua-api-key"');
      console.log('   export DD_APP_KEY="sua-app-key"');
    }
    process.exit(1);
  }
}

main();

