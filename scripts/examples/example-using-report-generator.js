#!/usr/bin/env node
/**
 * Exemplo de uso do ReportGenerator por outro agente
 * 
 * Este script demonstra como outros agentes podem usar
 * o ReportGenerator para criar relatórios padronizados
 */

const ReportGenerator = require('../reporting/report-generator.js');
const path = require('path');

async function main() {
  console.log('📊 Exemplo: Usando ReportGenerator\n');

  // Inicializar o gerador
  const generator = new ReportGenerator({
    author: 'Agente de Exemplo',
    owner: 'Codeia Tech',
    site: 'datadoghq.com'
  });

  // Dados do relatório (normalmente coletados pelo agente)
  const reportData = {
    title: 'Relatório de Exemplo',
    subtitle: 'Demonstração do ReportGenerator',
    
    summaryCards: [
      {
        title: 'Total de Itens',
        value: '150',
        label: 'itens analisados',
        severity: 'info'
      },
      {
        title: 'Problemas Críticos',
        value: '5',
        severity: 'critical'
      },
      {
        title: 'Avisos',
        value: '12',
        severity: 'warning'
      },
      {
        title: 'Status',
        value: 'OK',
        severity: 'success'
      }
    ],
    
    sections: [
      {
        title: 'Visão Geral',
        content: `
          <p>Este é um exemplo de relatório gerado usando o <strong>ReportGenerator</strong>.</p>
          <p>O ReportGenerator fornece uma estrutura padronizada para todos os relatórios do sistema.</p>
          
          <h3>Características</h3>
          <ul>
            <li>Design responsivo e moderno</li>
            <li>Templates HTML5 e Markdown</li>
            <li>Cards de resumo configuráveis</li>
            <li>Seções de conteúdo flexíveis</li>
            <li>Recomendações com ações</li>
          </ul>
        `
      },
      {
        title: 'Análise Detalhada',
        content: `
          <p>Esta seção pode conter qualquer conteúdo HTML.</p>
          
          <h3>Tabela de Exemplo</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Item 1</td>
                <td>100</td>
                <td><span class="badge success">OK</span></td>
              </tr>
              <tr>
                <td>Item 2</td>
                <td>50</td>
                <td><span class="badge warning">Atenção</span></td>
              </tr>
              <tr>
                <td>Item 3</td>
                <td>25</td>
                <td><span class="badge critical">Crítico</span></td>
              </tr>
            </tbody>
          </table>
        `
      }
    ],
    
    recommendations: [
      {
        severity: 'critical',
        category: 'Performance',
        title: 'Otimização Necessária',
        description: 'Alguns componentes estão apresentando performance abaixo do esperado.',
        actions: [
          'Revisar configurações de cache',
          'Otimizar queries de banco de dados',
          'Considerar escalonamento horizontal'
        ]
      },
      {
        severity: 'warning',
        category: 'Segurança',
        title: 'Atualização de Dependências',
        description: 'Algumas dependências possuem versões desatualizadas.',
        actions: [
          'Executar auditoria de segurança',
          'Atualizar dependências críticas',
          'Revisar changelogs antes de atualizar'
        ]
      },
      {
        severity: 'info',
        category: 'Monitoramento',
        title: 'Melhorias Sugeridas',
        description: 'Algumas melhorias podem ser implementadas para melhorar o monitoramento.',
        actions: [
          'Adicionar métricas customizadas',
          'Criar dashboards adicionais',
          'Configurar alertas proativos'
        ]
      }
    ]
  };

  try {
    // Gerar relatório HTML
    console.log('🔨 Gerando relatório HTML...');
    const htmlFilename = generator.generateFilename('exemplo-relatorio', 'html');
    const htmlPath = await generator.generateAndSaveHTML(reportData, htmlFilename);
    console.log(`✅ Relatório HTML gerado: ${htmlPath}\n`);

    // Gerar relatório Markdown
    console.log('🔨 Gerando relatório Markdown...');
    const mdFilename = generator.generateFilename('exemplo-relatorio', 'md');
    const mdPath = await generator.generateAndSaveMarkdown(reportData, mdFilename);
    console.log(`✅ Relatório Markdown gerado: ${mdPath}\n`);

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ Exemplo concluído com sucesso!');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Abra os relatórios gerados na pasta reports/');
    console.log('   2. Use o ReportGenerator nos seus próprios agentes');
    console.log('   3. Consulte rules/reports/report-generator.md para documentação completa\n');

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };

