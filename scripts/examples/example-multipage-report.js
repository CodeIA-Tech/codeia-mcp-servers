#!/usr/bin/env node
/**
 * Exemplo de uso do ReportGenerator para gerar relatórios multi-página
 */

const ReportGenerator = require('../reporting/report-generator.js');

async function main() {
  console.log('📊 Exemplo: Gerando Relatório Multi-Página\n');

  // Inicializar o gerador
  const generator = new ReportGenerator({
    author: 'Vertem - Sistema de Monitoramento',
    owner: 'Vertem',
    site: 'datadoghq.com'
  });

  // Dados do relatório
  const reportData = {
    title: 'Relatório de Monitoramento',
    subtitle: 'Análise Completa do Sistema',
    context: `
      <p>Este relatório apresenta uma análise detalhada do sistema de monitoramento, incluindo métricas, 
      alertas e recomendações para melhorias contínuas.</p>
      
      <h3>Objetivo</h3>
      <p>O objetivo deste relatório é fornecer uma visão abrangente do estado atual do sistema, 
      identificando pontos de atenção e oportunidades de otimização.</p>
      
      <h3>Escopo</h3>
      <ul>
        <li>Análise de métricas de performance</li>
        <li>Revisão de alertas e incidentes</li>
        <li>Recomendações de melhorias</li>
        <li>Plano de ação para otimizações</li>
      </ul>
    `,
    
    summaryCards: [
      {
        title: 'Total de Monitores',
        value: '45',
        label: 'monitores ativos',
        severity: 'info'
      },
      {
        title: 'Alertas Críticos',
        value: '3',
        severity: 'critical'
      },
      {
        title: 'Avisos',
        value: '8',
        severity: 'warning'
      },
      {
        title: 'Status Geral',
        value: 'Estável',
        severity: 'success'
      }
    ],
    
    sections: [
      {
        title: 'Métricas Principais',
        content: `
          <p>As métricas principais do sistema estão dentro dos parâmetros esperados.</p>
          
          <h3>CPU</h3>
          <p>Utilização média de CPU: <strong>45%</strong></p>
          <p>Picos de utilização: <strong>78%</strong></p>
          
          <h3>Memória</h3>
          <p>Utilização média de memória: <strong>62%</strong></p>
          <p>Memória disponível: <strong>38%</strong></p>
          
          <h3>Rede</h3>
          <p>Tráfego de entrada: <strong>2.5 Gbps</strong></p>
          <p>Tráfego de saída: <strong>1.8 Gbps</strong></p>
        `
      },
      {
        title: 'Análise de Alertas',
        content: `
          <p>Durante o período analisado, foram identificados 11 alertas, sendo 3 críticos e 8 avisos.</p>
          
          <h3>Alertas Críticos</h3>
          <ul>
            <li>Alta utilização de CPU no servidor web-01</li>
            <li>Espaço em disco abaixo de 10% no servidor db-02</li>
            <li>Timeout em requisições para API externa</li>
          </ul>
          
          <h3>Avisos</h3>
          <ul>
            <li>Latência elevada em algumas rotas</li>
            <li>Taxa de erro acima do normal em endpoints específicos</li>
            <li>Uso de memória próximo ao limite em alguns containers</li>
          </ul>
        `
      }
    ],
    
    recommendations: [
      {
        severity: 'critical',
        category: 'Infraestrutura',
        title: 'Aumentar Capacidade de Disco',
        description: 'O servidor db-02 está com espaço em disco crítico. É necessário aumentar a capacidade ou limpar dados antigos.',
        actions: [
          'Aumentar volume de disco em 50%',
          'Implementar política de retenção de logs',
          'Migrar dados antigos para armazenamento de baixo custo'
        ]
      },
      {
        severity: 'warning',
        category: 'Performance',
        title: 'Otimizar Uso de CPU',
        description: 'O servidor web-01 está apresentando picos de CPU acima de 80%.',
        actions: [
          'Revisar processos em execução',
          'Considerar escalonamento horizontal',
          'Otimizar queries e operações custosas'
        ]
      },
      {
        severity: 'info',
        category: 'Monitoramento',
        title: 'Melhorar Alertas',
        description: 'Alguns alertas podem ser refinados para reduzir ruído.',
        actions: [
          'Ajustar thresholds de alertas',
          'Implementar alertas baseados em tendências',
          'Criar runbooks para alertas comuns'
        ]
      }
    ]
  };

  try {
    // Gerar relatório multi-página
    console.log('🔨 Gerando relatório multi-página...');
    const result = await generator.generateMultiPageReport(reportData, 'relatorio-monitoramento');
    
    console.log(`✅ Relatório gerado com sucesso!`);
    console.log(`📁 Diretório: ${result.directory}`);
    console.log(`📄 Página inicial: ${result.index}\n`);
    
    console.log('📋 Páginas geradas:');
    console.log(`   • ${result.pages.index}`);
    console.log(`   • ${result.pages.visaoGeral}`);
    console.log(`   • ${result.pages.analise}`);
    console.log(`   • ${result.pages.recomendacoes}\n`);

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ Exemplo concluído com sucesso!');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('📝 Próximos passos:');
    console.log('   1. Abra o arquivo index.html no navegador');
    console.log('   2. Navegue entre as páginas usando o menu superior');
    console.log('   3. Use este exemplo como base para seus relatórios\n');

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

