#!/usr/bin/env node
/**
 * Exemplo de uso do ReportGenerator para gerar apresentações
 */

const ReportGenerator = require('../reporting/report-generator.js');

async function main() {
  console.log('📊 Exemplo: Gerando Apresentação\n');

  // Inicializar o gerador
  const generator = new ReportGenerator({
    author: 'Vertem - Sistema de Monitoramento',
    owner: 'Vertem',
    site: 'datadoghq.com'
  });

  // Dados da apresentação
  const presentationData = {
    title: 'Apresentação de Monitoramento',
    subtitle: 'Visão Geral do Sistema',
    
    slides: [
      {
        type: 'cover',
        title: 'Apresentação de Monitoramento',
        subtitle: 'Visão Geral do Sistema',
        content: `
          <div style="text-align: center; margin-top: 3rem;">
            <p style="font-size: 1.5rem; margin-top: 2rem;">Vertem - Sistema de Monitoramento</p>
            <p style="font-size: 1.2rem; margin-top: 1rem; opacity: 0.9;">${new Date().toLocaleDateString('pt-BR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Agenda',
        content: `
          <div class="content">
            <ul style="font-size: 1.5rem; line-height: 2.5;">
              <li>Visão Geral do Sistema</li>
              <li>Métricas Principais</li>
              <li>Análise de Performance</li>
              <li>Alertas e Incidentes</li>
              <li>Recomendações</li>
              <li>Próximos Passos</li>
            </ul>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Visão Geral',
        subtitle: 'Resumo Executivo',
        content: `
          <div class="content">
            <p>Este relatório apresenta uma análise detalhada do sistema de monitoramento, 
            incluindo métricas, alertas e recomendações para melhorias contínuas.</p>
            
            <h3>Objetivo</h3>
            <p>Fornecer uma visão abrangente do estado atual do sistema, identificando 
            pontos de atenção e oportunidades de otimização.</p>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Métricas Principais',
        content: `
          <div class="stats-grid">
            <div class="card info">
              <div class="card-title">Total de Monitores</div>
              <div class="card-value">45</div>
              <div class="card-label">monitores ativos</div>
            </div>
            <div class="card critical">
              <div class="card-title">Alertas Críticos</div>
              <div class="card-value">3</div>
              <div class="card-label">requerem atenção</div>
            </div>
            <div class="card warning">
              <div class="card-title">Avisos</div>
              <div class="card-value">8</div>
              <div class="card-label">monitoramento necessário</div>
            </div>
            <div class="card success">
              <div class="card-title">Status Geral</div>
              <div class="card-value">Estável</div>
              <div class="card-label">sistema operacional</div>
            </div>
          </div>
        `
      },
      {
        type: 'two-columns',
        title: 'Análise de Performance',
        content: `
          <div>
            <h3>CPU</h3>
            <ul>
              <li>Utilização média: <strong>45%</strong></li>
              <li>Picos de utilização: <strong>78%</strong></li>
              <li>Status: <span style="color: #2ecc71;">Normal</span></li>
            </ul>
            
            <h3 style="margin-top: 2rem;">Memória</h3>
            <ul>
              <li>Utilização média: <strong>62%</strong></li>
              <li>Memória disponível: <strong>38%</strong></li>
              <li>Status: <span style="color: #2ecc71;">Normal</span></li>
            </ul>
          </div>
          <div>
            <h3>Rede</h3>
            <ul>
              <li>Tráfego de entrada: <strong>2.5 Gbps</strong></li>
              <li>Tráfego de saída: <strong>1.8 Gbps</strong></li>
              <li>Latência média: <strong>12ms</strong></li>
            </ul>
            
            <h3 style="margin-top: 2rem;">Armazenamento</h3>
            <ul>
              <li>Espaço utilizado: <strong>68%</strong></li>
              <li>Espaço disponível: <strong>32%</strong></li>
              <li>Status: <span style="color: #f39c12;">Atenção</span></li>
            </ul>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Alertas e Incidentes',
        content: `
          <div class="content">
            <h3>Alertas Críticos (3)</h3>
            <ul style="font-size: 1.2rem;">
              <li>Alta utilização de CPU no servidor web-01</li>
              <li>Espaço em disco abaixo de 10% no servidor db-02</li>
              <li>Timeout em requisições para API externa</li>
            </ul>
            
            <h3 style="margin-top: 2rem;">Avisos (8)</h3>
            <ul style="font-size: 1.2rem;">
              <li>Latência elevada em algumas rotas</li>
              <li>Taxa de erro acima do normal em endpoints específicos</li>
              <li>Uso de memória próximo ao limite em alguns containers</li>
            </ul>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Recomendações',
        content: `
          <div class="content">
            <div class="card critical" style="margin-bottom: 2rem;">
              <h3 style="color: #e74c3c; margin-bottom: 1rem;">Aumentar Capacidade de Disco</h3>
              <p>O servidor db-02 está com espaço em disco crítico.</p>
              <ul style="margin-top: 1rem;">
                <li>Aumentar volume de disco em 50%</li>
                <li>Implementar política de retenção de logs</li>
                <li>Migrar dados antigos para armazenamento de baixo custo</li>
              </ul>
            </div>
            
            <div class="card warning" style="margin-bottom: 2rem;">
              <h3 style="color: #f39c12; margin-bottom: 1rem;">Otimizar Uso de CPU</h3>
              <p>O servidor web-01 está apresentando picos de CPU acima de 80%.</p>
              <ul style="margin-top: 1rem;">
                <li>Revisar processos em execução</li>
                <li>Considerar escalonamento horizontal</li>
                <li>Otimizar queries e operações custosas</li>
              </ul>
            </div>
          </div>
        `
      },
      {
        type: 'default',
        title: 'Próximos Passos',
        content: `
          <div class="content">
            <ol style="font-size: 1.3rem; line-height: 2;">
              <li>Implementar ações corretivas para alertas críticos</li>
              <li>Revisar e ajustar thresholds de monitoramento</li>
              <li>Otimizar recursos de infraestrutura</li>
              <li>Documentar procedimentos de resposta a incidentes</li>
              <li>Agendar revisão mensal de métricas</li>
            </ol>
          </div>
        `
      },
      {
        type: 'cover',
        title: 'Obrigado!',
        subtitle: 'Perguntas?',
        content: `
          <div style="text-align: center; margin-top: 3rem;">
            <p style="font-size: 1.5rem; margin-top: 2rem;">Vertem - Sistema de Monitoramento</p>
            <p style="font-size: 1.2rem; margin-top: 1rem; opacity: 0.9;">contato@vertem.com</p>
          </div>
        `
      }
    ]
  };

  try {
    // Gerar apresentação
    console.log('🔨 Gerando apresentação...');
    const filename = generator.generateFilename('apresentacao-monitoramento', 'html');
    const filepath = await generator.generateAndSavePresentation(presentationData, filename);
    
    console.log(`✅ Apresentação gerada com sucesso!`);
    console.log(`📄 Arquivo: ${filepath}\n`);
    
    console.log('📋 Informações:');
    console.log(`   • Total de slides: ${presentationData.slides.length}`);
    console.log(`   • Título: ${presentationData.title}\n`);

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ Exemplo concluído com sucesso!');
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('📝 Como usar:');
    console.log('   1. Abra o arquivo HTML no navegador');
    console.log('   2. Use as setas do teclado (← →) ou botões para navegar');
    console.log('   3. Use Page Up/Down para navegar entre slides');
    console.log('   4. Use Home/End para ir ao primeiro/último slide\n');

  } catch (error) {
    console.error('❌ Erro ao gerar apresentação:', error.message);
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

