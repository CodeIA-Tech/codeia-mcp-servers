#!/usr/bin/env node
/**
 * Exemplos de uso dos diferentes templates
 */

import ReportGenerator from '../reporting/report-generator.js';
import NavigationHelper from '../utils/navigation-helper.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDefaultExample() {
  console.log('📄 Gerando exemplo com template DEFAULT...');
  
  const generator = new ReportGenerator({
    title: 'Relatório de Acompanhamento',
    author: 'Equipe de Operações',
    templateType: 'default'
  });

  const sections = NavigationHelper.generateTrackingSections();
  const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

  const html = await generator.generateHTML({
    title: 'Relatório de Acompanhamento Semanal',
    subtitle: 'Semana 45 - 2024',
    navigationLinks: navigationLinks,
    customContent: `
      <div class="report-section" id="resumo-executivo">
        <h2>📊 Resumo Executivo</h2>
        <p>Total de atividades: 50 | Concluídas: 42 (84%)</p>
      </div>
      <div class="report-section" id="atividades-concluidas">
        <h2>✅ Atividades Concluídas</h2>
        <ul>
          <li>Migração do banco de dados concluída</li>
          <li>Deploy da API v2.0</li>
          <li>Atualização de segurança aplicada</li>
        </ul>
      </div>
    `
  });

  const outputPath = path.join(__dirname, '../reports/example-default.html');
  await fs.writeFile(outputPath, html);
  console.log(`✅ Gerado: ${outputPath}`);
}

async function generateExecutiveExample() {
  console.log('👔 Gerando exemplo com template EXECUTIVE...');
  
  const generator = new ReportGenerator({
    title: 'Relatório Executivo Q4',
    author: 'Diretoria',
    templateType: 'executive'
  });

  const sections = NavigationHelper.generateExecutiveSections();
  const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

  const html = await generator.generateHTML({
    title: 'Relatório Executivo - Q4 2024',
    subtitle: 'Resultados e Perspectivas',
    navigationLinks: navigationLinks,
    customContent: `
      <div class="report-section" id="resumo-executivo">
        <h2>📊 Resumo Executivo</h2>
        <p><strong>Crescimento:</strong> 25% em relação ao Q3</p>
        <p><strong>Receita:</strong> R$ 12.5M</p>
        <p><strong>Novos Clientes:</strong> 150</p>
      </div>
      <div class="report-section" id="objetivos">
        <h2>🎯 Objetivos e Metas</h2>
        <ul>
          <li>✅ Aumentar receita em 20% (atingido 25%)</li>
          <li>✅ Expandir equipe em 30% (atingido 35%)</li>
          <li>🔄 Lançar 5 novos produtos (4 lançados)</li>
        </ul>
      </div>
    `
  });

  const outputPath = path.join(__dirname, '../reports/example-executive.html');
  await fs.writeFile(outputPath, html);
  console.log(`✅ Gerado: ${outputPath}`);
}

async function generateTechnicalExample() {
  console.log('⚙️  Gerando exemplo com template TECHNICAL...');
  
  const generator = new ReportGenerator({
    title: 'Análise Técnica - Performance',
    author: 'Equipe SRE',
    templateType: 'technical'
  });

  const sections = NavigationHelper.generateTechnicalSections();
  const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

  const html = await generator.generateHTML({
    title: 'Análise Técnica - Performance da API',
    subtitle: 'Período: Novembro 2024',
    navigationLinks: navigationLinks,
    customContent: `
      <div class="report-section" id="introducao">
        <h2>📘 Introdução</h2>
        <p>Análise detalhada da performance da API Gateway em produção.</p>
      </div>
      <div class="report-section" id="metricas">
        <h2>📈 Métricas Técnicas</h2>
        <pre><code>Latência p50: 45ms
Latência p95: 120ms
Latência p99: 250ms
Throughput: 10,000 req/s
Error Rate: 0.02%
Uptime: 99.99%</code></pre>
      </div>
      <div class="report-section" id="conclusao">
        <h2>✅ Conclusão</h2>
        <p>Sistema operando dentro dos parâmetros esperados.</p>
      </div>
    `
  });

  const outputPath = path.join(__dirname, '../reports/example-technical.html');
  await fs.writeFile(outputPath, html);
  console.log(`✅ Gerado: ${outputPath}`);
}

async function generatePresentationExample() {
  console.log('🎨 Gerando exemplo com template PRESENTATION...');
  
  const generator = new ReportGenerator({
    title: 'Apresentação - Novos Produtos',
    author: 'Marketing',
    templateType: 'presentation'
  });

  const sections = [
    { id: 'intro', label: 'Bem-vindo', shortLabel: 'Início' },
    { id: 'produtos', label: 'Nossos Produtos', shortLabel: 'Produtos' },
    { id: 'resultados', label: 'Resultados Alcançados', shortLabel: 'Resultados' },
    { id: 'futuro', label: 'Visão de Futuro', shortLabel: 'Futuro' }
  ];
  const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

  const html = await generator.generateHTML({
    title: 'Lançamento de Novos Produtos 2024',
    subtitle: 'Inovação e Crescimento',
    navigationLinks: navigationLinks,
    customContent: `
      <div class="report-section" id="intro">
        <h2>🎉 Bem-vindo</h2>
        <p style="font-size: 1.2rem;">Apresentamos nossa nova linha de produtos!</p>
      </div>
      <div class="report-section" id="produtos">
        <h2>🚀 Nossos Produtos</h2>
        <ul>
          <li><strong>Produto A:</strong> Solução em Cloud</li>
          <li><strong>Produto B:</strong> IA e Machine Learning</li>
          <li><strong>Produto C:</strong> Segurança Avançada</li>
        </ul>
      </div>
      <div class="report-section" id="resultados">
        <h2>📊 Resultados Alcançados</h2>
        <p><strong>150 clientes</strong> em 3 meses</p>
        <p><strong>95% de satisfação</strong> dos usuários</p>
      </div>
    `
  });

  const outputPath = path.join(__dirname, '../reports/example-presentation.html');
  await fs.writeFile(outputPath, html);
  console.log(`✅ Gerado: ${outputPath}`);
}

async function main() {
  console.log('🎨 Gerando exemplos de todos os templates...\n');
  
  try {
    await generateDefaultExample();
    await generateExecutiveExample();
    await generateTechnicalExample();
    await generatePresentationExample();
    
    console.log('\n✅ Todos os exemplos gerados com sucesso!');
    console.log('\n📂 Arquivos gerados em: reports/');
    console.log('   - example-default.html');
    console.log('   - example-executive.html');
    console.log('   - example-technical.html');
    console.log('   - example-presentation.html');
  } catch (error) {
    console.error('❌ Erro ao gerar exemplos:', error);
    process.exit(1);
  }
}

main();

