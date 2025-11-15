#!/usr/bin/env node
/**
 * Gerador de Relatório PPS (Plano de Progresso Semanal)
 * 
 * Processa arquivo Excel de acompanhamento da diretoria e gera relatório HTML5
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import ReportGenerator from './report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para converter número de data Excel para Date
function excelDateToJSDate(excelDate) {
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
  return jsDate;
}

// Função para formatar data
function formatDate(date) {
  if (!date) return 'N/A';
  if (typeof date === 'number') {
    date = excelDateToJSDate(date);
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Função para processar dados do Excel
function processPPSData(excelData) {
  const ppsSheet = excelData.find(sheet => sheet.name === 'PPS');
  if (!ppsSheet || !ppsSheet.data || ppsSheet.data.length === 0) {
    throw new Error('Planilha PPS não encontrada ou vazia');
  }

  const data = ppsSheet.data;
  const result = {
    modelo: '',
    dataInicio: null,
    dataFinal: null,
    demandas: {
      solicitadas: {
        lista: [],
        quantidade: 0
      },
      todo: {
        lista: [],
        quantidade: 0
      },
      done: {
        lista: [],
        quantidade: 0
      },
      inProgress: {
        lista: [],
        quantidade: 0
      },
      waitOthers: {
        lista: [],
        quantidade: 0
      }
    },
    riscos: '',
    resumo: {
      todo: 0,
      inProgress: 0,
      waitOthers: 0,
      done: 0
    }
  };

  // Processar dados linha por linha
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const key = String(row[0] || '').trim();
    const value = row[1];

    // Modelo
    if (key.includes('Modelo PPS')) {
      result.modelo = String(value || '').trim();
    }
    // Data Inicio
    else if (key === 'Data Inicio' && typeof value === 'number') {
      result.dataInicio = value;
    }
    // Data Final
    else if (key === 'Data Final' && typeof value === 'number') {
      result.dataFinal = value;
    }
    // Demandas Solicitadas
    else if (key === 'Quais demandas solicitadas?') {
      result.demandas.solicitadas.lista = String(value || '')
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => item && item.match(/^\d+\./))
        .map(item => item.replace(/^\d+\.\s*/, ''));
    }
    else if (key === 'Quantidade de Demandas Solicitadas?') {
      result.demandas.solicitadas.quantidade = Number(value) || 0;
    }
    // TODO
    else if (key === 'Quais demandas para ToDo?') {
      result.demandas.todo.lista = String(value || '')
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => item && item.match(/^\d+\./))
        .map(item => item.replace(/^\d+\.\s*/, ''));
    }
    else if (key === 'Quantas demandas para ToDo?') {
      result.demandas.todo.quantidade = Number(value) || 0;
    }
    // DONE
    else if (key === 'Quais atividades realizadas na semana?') {
      result.demandas.done.lista = String(value || '')
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => item && item.match(/^\d+\./))
        .map(item => item.replace(/^\d+\.\s*/, ''));
    }
    else if (key === 'Quantidade de solicitações atendidas?') {
      result.demandas.done.quantidade = Number(value) || 0;
    }
    // IN PROGRESS
    else if (key === 'Quais demandas em in progress?') {
      result.demandas.inProgress.lista = String(value || '')
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => item && item.match(/^\d+\./))
        .map(item => item.replace(/^\d+\.\s*/, ''));
    }
    else if (key === 'Quantidade demandas in progress?') {
      result.demandas.inProgress.quantidade = Number(value) || 0;
    }
    // WAIT OTHERS
    else if (key === 'Quais solicitações estão em "wait others"?') {
      result.demandas.waitOthers.lista = String(value || '')
        .split(/\r?\n/)
        .map(item => item.trim())
        .filter(item => item && item.match(/^\d+\./))
        .map(item => item.replace(/^\d+\.\s*/, ''));
    }
    else if (key === 'Quantidade demandas em wait others?') {
      result.demandas.waitOthers.quantidade = Number(value) || 0;
    }
    // Riscos
    else if (key === 'Quais os pontos de atenção e riscos?') {
      result.riscos = String(value || '').trim();
    }
    // Resumo (tabela final)
    else if (key === 'ToDo' && typeof value === 'number') {
      result.resumo.todo = Number(value) || 0;
    }
    else if (key === 'In progress' && typeof value === 'number') {
      result.resumo.inProgress = Number(value) || 0;
    }
    else if (key === 'Wait Others' && typeof value === 'number') {
      result.resumo.waitOthers = Number(value) || 0;
    }
    else if (key === 'Done' && typeof value === 'number') {
      result.resumo.done = Number(value) || 0;
    }
  }

  return result;
}

// Função para gerar links de navegação baseados nas seções
function generatePPSNavigationLinks() {
  const sections = [
    { id: 'resumo-executivo', label: 'Resumo Executivo', shortLabel: 'Resumo' },
    { id: 'periodo-acompanhamento', label: 'Período de Acompanhamento', shortLabel: 'Período' },
    { id: 'atividades-concluidas', label: 'Atividades Concluídas', shortLabel: 'Concluídas' },
    { id: 'demandas-progresso', label: 'Demandas em Progresso', shortLabel: 'Em Progresso' },
    { id: 'aguardando-terceiros', label: 'Aguardando Terceiros', shortLabel: 'Aguardando' },
    { id: 'pendentes', label: 'Pendentes', shortLabel: 'Pendentes' },
    { id: 'riscos-atencao', label: 'Riscos e Pontos de Atenção', shortLabel: 'Riscos' },
    { id: 'todas-demandas', label: 'Todas as Demandas', shortLabel: 'Todas Demandas' }
  ];

  return sections.map(section => 
    `<a href="#${section.id}" class="nav-link" data-section="${section.id}" data-full-label="${section.label}" data-short-label="${section.shortLabel}">${section.shortLabel}</a>`
  ).join('\n                ');
}

// Função para gerar HTML do relatório
function generateReportHTML(ppsData) {
  const dataInicio = formatDate(ppsData.dataInicio);
  const dataFinal = formatDate(ppsData.dataFinal);
  const totalDemandas = ppsData.demandas.solicitadas.quantidade;
  const totalConcluidas = ppsData.resumo.done;
  const totalEmProgresso = ppsData.resumo.inProgress;
  const totalAguardando = ppsData.resumo.waitOthers;
  const totalPendentes = ppsData.resumo.todo;
  const percentualConcluido = totalDemandas > 0 
    ? Math.round((totalConcluidas / totalDemandas) * 100) 
    : 0;

  // Calcular porcentagens para o gráfico
  const percentualEmProgresso = totalDemandas > 0 ? Math.round((totalEmProgresso / totalDemandas) * 100) : 0;
  const percentualAguardando = totalDemandas > 0 ? Math.round((totalAguardando / totalDemandas) * 100) : 0;
  const percentualPendentes = totalDemandas > 0 ? Math.round((totalPendentes / totalDemandas) * 100) : 0;

  let html = `
    <div class="report-section" id="resumo-executivo">
      <h2>📊 Resumo Executivo</h2>
      <div class="summary-compact">
        <div class="summary-bullets">
          <div class="summary-bullet-item">
            <span class="bullet-icon">📋</span>
            <span class="bullet-text"><strong>Total:</strong> ${totalDemandas} demandas</span>
          </div>
          <div class="summary-bullet-item success">
            <span class="bullet-icon">✅</span>
            <span class="bullet-text"><strong>Concluídas:</strong> ${totalConcluidas} (${percentualConcluido}%)</span>
          </div>
          <div class="summary-bullet-item warning">
            <span class="bullet-icon">🔄</span>
            <span class="bullet-text"><strong>Em Progresso:</strong> ${totalEmProgresso} (${percentualEmProgresso}%)</span>
          </div>
          <div class="summary-bullet-item info">
            <span class="bullet-icon">⏳</span>
            <span class="bullet-text"><strong>Aguardando:</strong> ${totalAguardando} (${percentualAguardando}%)</span>
          </div>
          <div class="summary-bullet-item">
            <span class="bullet-icon">📝</span>
            <span class="bullet-text"><strong>Pendentes:</strong> ${totalPendentes} (${percentualPendentes}%)</span>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="statusChart" width="300" height="300"></canvas>
        </div>
      </div>
    </div>

    <div class="report-section" id="periodo-acompanhamento">
      <h2>📅 Período de Acompanhamento</h2>
      <div class="period-info">
        <p><strong>Data Início:</strong> ${dataInicio}</p>
        <p><strong>Data Final:</strong> ${dataFinal}</p>
      </div>
    </div>

    <div class="report-section" id="atividades-concluidas">
      <h2>✅ Atividades Concluídas (${totalConcluidas})</h2>
      <div class="activities-compact">
        ${ppsData.demandas.done.lista.map((item, idx) => `
          <div class="activity-compact-item done">
            <span class="activity-compact-number">${idx + 1}.</span>
            <span class="activity-compact-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="report-section" id="demandas-progresso">
      <h2>🔄 Demandas em Progresso (${totalEmProgresso})</h2>
      <div class="activities-compact">
        ${ppsData.demandas.inProgress.lista.map((item, idx) => `
          <div class="activity-compact-item in-progress">
            <span class="activity-compact-number">${idx + 1}.</span>
            <span class="activity-compact-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="report-section" id="aguardando-terceiros">
      <h2>⏳ Aguardando Terceiros (${totalAguardando})</h2>
      <div class="activities-compact">
        ${ppsData.demandas.waitOthers.lista.map((item, idx) => `
          <div class="activity-compact-item wait-others">
            <span class="activity-compact-number">${idx + 1}.</span>
            <span class="activity-compact-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="report-section" id="pendentes">
      <h2>📝 Pendentes (${totalPendentes})</h2>
      <div class="activities-compact">
        ${ppsData.demandas.todo.lista.map((item, idx) => `
          <div class="activity-compact-item todo">
            <span class="activity-compact-number">${idx + 1}.</span>
            <span class="activity-compact-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="report-section" id="riscos-atencao">
      <h2>⚠️ Riscos e Pontos de Atenção</h2>
      <div class="risks-section">
        <p class="risks-text">${ppsData.riscos || 'Nenhum risco ou ponto de atenção identificado.'}</p>
      </div>
    </div>

    <div class="report-section" id="todas-demandas">
      <h2>📋 Todas as Demandas Solicitadas</h2>
      <div class="activities-compact">
        ${ppsData.demandas.solicitadas.lista.map((item, idx) => `
          <div class="activity-compact-item">
            <span class="activity-compact-number">${idx + 1}.</span>
            <span class="activity-compact-text">${item}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
      const ctx = document.getElementById('statusChart');
      if (ctx) {
        const total = ${totalDemandas};
        const data = [${totalConcluidas}, ${totalEmProgresso}, ${totalAguardando}, ${totalPendentes}];
        const labels = ['Concluídas', 'Em Progresso', 'Aguardando', 'Pendentes'];
        
        new Chart(ctx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: [
                '#38ef7d',
                '#f5576c',
                '#4facfe',
                '#ffa726'
              ],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 15,
                  font: {
                    size: 12
                  }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return label + ': ' + value + ' (' + percentage + '%)';
                  }
                }
              },
              datalabels: {
                color: '#ffffff',
                font: {
                  weight: 'bold',
                  size: 14
                },
                formatter: function(value, context) {
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                  return percentage > 5 ? percentage + '%' : '';
                }
              }
            }
          },
          plugins: [{
            id: 'datalabels',
            afterDatasetsDraw: function(chart) {
              const ctx = chart.ctx;
              chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                meta.data.forEach((element, index) => {
                  const value = dataset.data[index];
                  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                  
                  if (percentage > 5) {
                    const position = element.tooltipPosition();
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(percentage + '%', position.x, position.y);
                    ctx.restore();
                  }
                });
              });
            }
          }]
        });
      }
    </script>
    <script>
      // Função para destacar o link ativo baseado na seção visível
      function updateActiveNavLink() {
        const sections = document.querySelectorAll('.report-section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        // Remover classe active de todos os links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Encontrar a seção visível
        let currentSection = '';
        const scrollPosition = window.scrollY + 180; // Offset para header fixo + hero
        
        sections.forEach(section => {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          
          if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            currentSection = section.id;
          }
        });
        
        // Se não encontrou nenhuma seção visível, usar a primeira
        if (!currentSection && sections.length > 0) {
          currentSection = sections[0].id;
        }
        
        // Adicionar classe active ao link correspondente e atualizar texto
        navLinks.forEach(link => {
          const fullLabel = link.getAttribute('data-full-label');
          const shortLabel = link.getAttribute('data-short-label');
          
          if (link.getAttribute('data-section') === currentSection) {
            link.classList.add('active');
            // Mostrar texto completo quando ativo
            if (fullLabel) {
              link.textContent = fullLabel;
            }
          } else {
            link.classList.remove('active');
            // Mostrar texto curto quando não ativo
            if (shortLabel) {
              link.textContent = shortLabel;
            }
          }
        });
      }
      
      // Atualizar ao fazer scroll
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateActiveNavLink, 100);
      });
      
      // Atualizar ao clicar em um link
      document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const targetId = this.getAttribute('data-section');
          const targetSection = document.getElementById(targetId);
          
          if (targetSection) {
            const headerOffset = 180; // Header fixo + hero navigation
            const elementPosition = targetSection.offsetTop;
            const offsetPosition = elementPosition - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            
            // Atualizar link ativo após scroll
            setTimeout(updateActiveNavLink, 500);
          }
        });
      });
      
      // Atualizar ao carregar a página
      window.addEventListener('load', updateActiveNavLink);
      updateActiveNavLink();
    </script>
  `;

  return html;
}

// Função principal
async function main() {
  const excelPath = process.argv[2] || '/home/cianci/develop/Files/OnePage - Acompanhamento Diretoria.xlsx';
  const outputDir = path.join(__dirname, '..', '..', 'reports');

  try {
    console.log('📖 Lendo arquivo Excel...');
    const workbook = XLSX.readFile(excelPath);
    
    // Converter para formato processável
    const excelData = workbook.SheetNames.map(sheetName => ({
      name: sheetName,
      data: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
        header: 1, 
        defval: '' 
      })
    }));

    console.log('🔄 Processando dados PPS...');
    const ppsData = processPPSData(excelData);

    console.log('📊 Gerando relatório HTML5...');
    const reportHTML = generateReportHTML(ppsData);

    // Criar instância do ReportGenerator
    const generator = new ReportGenerator({
      title: 'OnePage - Acompanhamento Diretoria',
      author: 'Marcos Cianci (marcos.cianci@vertem.digital) - Coordenador Infra e Cloud',
      owner: 'Vertem',
      site: 'https://vertem.com',
      footerNote: 'Relatório gerado automaticamente a partir do arquivo Excel de acompanhamento'
    });

    // Gerar links de navegação personalizados
    const navigationLinks = generatePPSNavigationLinks();

    // Gerar HTML completo
    const fullHTML = await generator.generateHTML({
      title: 'OnePage - Acompanhamento Diretoria',
      subtitle: `Período: ${formatDate(ppsData.dataInicio)} a ${formatDate(ppsData.dataFinal)}`,
      sections: [],
      customContent: reportHTML,
      navigationLinks: navigationLinks,
      customCSS: `
        <style>
          .summary-compact {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin: 2rem 0;
            align-items: start;
          }
          
          @media (max-width: 768px) {
            .summary-compact {
              grid-template-columns: 1fr;
            }
          }
          
          .summary-bullets {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .summary-bullet-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            font-size: 0.95rem;
          }
          
          .summary-bullet-item.success {
            border-left-color: #38ef7d;
          }
          
          .summary-bullet-item.warning {
            border-left-color: #f5576c;
          }
          
          .summary-bullet-item.info {
            border-left-color: #4facfe;
          }
          
          .bullet-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
          }
          
          .bullet-text {
            flex: 1;
            color: #333;
          }
          
          .chart-container {
            display: flex;
            justify-content: center;
            align-items: center;
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .chart-container canvas {
            max-width: 100%;
            height: auto !important;
          }
          
          .activities-compact {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 0.75rem;
            margin: 1.5rem 0;
          }
          
          .activity-compact-item {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 6px;
            border-left: 3px solid #667eea;
            font-size: 0.9rem;
            line-height: 1.4;
          }
          
          .activity-compact-item.done {
            border-left-color: #38ef7d;
          }
          
          .activity-compact-item.in-progress {
            border-left-color: #f5576c;
          }
          
          .activity-compact-item.wait-others {
            border-left-color: #4facfe;
          }
          
          .activity-compact-item.todo {
            border-left-color: #ffa726;
          }
          
          .activity-compact-number {
            font-weight: bold;
            color: #667eea;
            flex-shrink: 0;
          }
          
          .activity-compact-item.done .activity-compact-number {
            color: #38ef7d;
          }
          
          .activity-compact-item.in-progress .activity-compact-number {
            color: #f5576c;
          }
          
          .activity-compact-item.wait-others .activity-compact-number {
            color: #4facfe;
          }
          
          .activity-compact-item.todo .activity-compact-number {
            color: #ffa726;
          }
          
          .activity-compact-text {
            flex: 1;
            color: #555;
          }
          
          @media (max-width: 768px) {
            .activities-compact {
              grid-template-columns: 1fr;
            }
          }
          
          .period-info {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          
          .period-info p {
            margin: 0.5rem 0;
            font-size: 1.1rem;
          }
          
          .activities-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          
          .activity-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            transition: all 0.2s;
          }
          
          .activity-item:hover {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transform: translateX(4px);
          }
          
          .activity-item.done {
            border-left: 4px solid #38ef7d;
          }
          
          .activity-item.in-progress {
            border-left: 4px solid #f5576c;
          }
          
          .activity-item.wait-others {
            border-left: 4px solid #4facfe;
          }
          
          .activity-item.todo {
            border-left: 4px solid #ffa726;
          }
          
          .activity-number {
            background: #667eea;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
          }
          
          .activity-text {
            flex: 1;
            font-size: 1rem;
            line-height: 1.5;
          }
          
          .activity-badge {
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            flex-shrink: 0;
          }
          
          .badge-done {
            background: #e8f5e9;
            color: #2e7d32;
          }
          
          .badge-progress {
            background: #fce4ec;
            color: #c2185b;
          }
          
          .badge-wait {
            background: #e3f2fd;
            color: #1976d2;
          }
          
          .badge-todo {
            background: #fff3e0;
            color: #e65100;
          }
          
          .risks-section {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 1.5rem;
            border-left: 4px solid #ffc107;
          }
          
          .risks-text {
            margin: 0;
            font-size: 1.1rem;
            line-height: 1.6;
          }
          
          .report-section {
            margin-bottom: 3rem;
          }
          
          .report-section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
            scroll-margin-top: 180px; /* Espaço para header fixo + hero */
          }
          
          .report-section {
            scroll-margin-top: 180px; /* Header fixo + hero navigation */
          }
          
          .nav-link {
            color: #ffffff;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s;
            font-size: 0.85rem;
            padding: 0.5rem 0.8rem;
            border-radius: 4px;
            display: inline-block;
            line-height: 1.3;
            white-space: nowrap;
            text-align: center;
            min-width: fit-content;
            background: rgba(255, 255, 255, 0.1);
          }
          
          .nav-link:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.2);
          }
          
          .nav-link.active {
            background: rgba(0, 102, 204, 0.4);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            font-weight: 600;
            white-space: nowrap;
            padding: 0.5rem 1rem;
          }
          
          .hero-nav {
            display: flex;
            flex-wrap: nowrap;
            gap: 0.5rem;
            align-items: center;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
          }
          
          .hero-nav::-webkit-scrollbar {
            height: 4px;
          }
          
          .hero-nav::-webkit-scrollbar-track {
            background: #2a2a2a;
          }
          
          .hero-nav::-webkit-scrollbar-thumb {
            background: #666;
            border-radius: 2px;
          }
          
          .hero-nav::-webkit-scrollbar-thumb:hover {
            background: #888;
          }
          
          html {
            scroll-behavior: smooth;
          }
        </style>
      `
    });

    // Criar diretório de saída se não existir
    await fs.mkdir(outputDir, { recursive: true });

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const outputFile = path.join(outputDir, `pps-acompanhamento-diretoria-${timestamp}.html`);

    await fs.writeFile(outputFile, fullHTML, 'utf-8');

    const totalDemandas = ppsData.demandas.solicitadas.quantidade;
    const totalConcluidas = ppsData.resumo.done;
    const totalEmProgresso = ppsData.resumo.inProgress;
    const totalAguardando = ppsData.resumo.waitOthers;
    const totalPendentes = ppsData.resumo.todo;
    const percentualConcluido = totalDemandas > 0 
      ? Math.round((totalConcluidas / totalDemandas) * 100) 
      : 0;

    console.log(`✅ Relatório gerado com sucesso!`);
    console.log(`📄 Arquivo: ${outputFile}`);
    console.log(`\n📊 Resumo:`);
    console.log(`   - Total de Demandas: ${totalDemandas}`);
    console.log(`   - Concluídas: ${totalConcluidas} (${percentualConcluido}%)`);
    console.log(`   - Em Progresso: ${totalEmProgresso}`);
    console.log(`   - Aguardando: ${totalAguardando}`);
    console.log(`   - Pendentes: ${totalPendentes}`);

  } catch (error) {
    console.error('❌ Erro ao gerar relatório:', error);
    process.exit(1);
  }
}

main();

