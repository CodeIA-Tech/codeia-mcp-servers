#!/usr/bin/env node
/**
 * Gerador de Relatório de Operações (Azure DevOps)
 *
 * Consulta o board Operações em Azure DevOps e gera um relatório HTML
 * seguindo o mesmo layout do relatório PPS da diretoria.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import ReportGenerator from './report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function getEnvVar(name, fallback = null) {
  const value = process.env[name];
  if (value && value.trim() !== '') {
    return value.trim();
  }
  return fallback;
}

function buildAuthHeader(pat) {
  const token = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${token}`;
}

async function azureRequest(url, { method = 'GET', body = null, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Falha ao processar resposta da API: ${text}`);
  }

  if (!response.ok) {
    const message = data?.message || data?.error?.message || response.statusText;
    throw new Error(`Erro ${response.status}: ${message}`);
  }

  return data;
}

function mapStateToCategory(state) {
  if (!state) return 'todo';

  const normalized = state.toLowerCase().trim();
  if (['done', 'completed', 'closed', 'resolved'].includes(normalized)) {
    return 'done';
  }

  if (['in development', 'in progress', 'active', 'committed', 'doing'].includes(normalized)) {
    return 'inProgress';
  }

  if (['paused'].includes(normalized)) {
    return 'paused';
  }

  if (['approved', 'em validação', 'in validation'].includes(normalized)) {
    return 'approved';
  }

  if (['new'].includes(normalized)) {
    return 'new';
  }

  if (['waiting', 'wait others', 'waiting external', 'blocked', 'aguardando', 'aguardando terceiros'].includes(normalized)) {
    return 'todo';
  }

  return 'todo';
}

function sanitizeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMonthYear(date) {
  const ref = date instanceof Date ? date : new Date(date);
  const formatted = ref.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function buildWorkItemLink(org, project, id) {
  const encodedProject = encodeURIComponent(project);
  return `https://dev.azure.com/${org}/${encodedProject}/_workitems/edit/${id}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getCategoryDisplay(category) {
  switch (category) {
    case 'done':
      return 'Concluída';
    case 'inProgress':
      return 'Em Progresso';
    case 'todo':
      return 'Pendente';
    case 'paused':
      return 'Pausada';
    case 'approved':
      return 'Em Validação';
    case 'new':
      return 'Nova';
    default:
      return 'Estado desconhecido';
  }
}

function formatRemainingWork(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }
  return `${numeric.toFixed(1)}h`;
}

function buildNavigationLinks(reportType = 'operations') {
  const sections = [
    { id: 'resumo-operacoes', label: 'Resumo Geral', shortLabel: 'Resumo' },
    { id: 'status-demandas', label: 'Demandas por Status', shortLabel: 'Status' }
  ];

  if (reportType === 'epic') {
    sections.push(
      { id: 'acompanhamento-features', label: 'Acompanhamento por Feature', shortLabel: 'Features' },
      { id: 'estrutura-epic', label: 'Estrutura do Epic', shortLabel: 'Estrutura' }
    );
  }

  if (reportType !== 'directorate') {
    sections.push({ id: 'equipe', label: 'Atividades por Responsável', shortLabel: 'Equipe' });
  }

  sections.push({ id: 'backlog-completo', label: 'Backlog Completo', shortLabel: 'Backlog' });

  return sections.map(section =>
    `<a href="#${section.id}" class="nav-link" data-section="${section.id}" data-full-label="${section.label}" data-short-label="${section.shortLabel}">${section.shortLabel}</a>`
  ).join('\n                ');
}

function buildActivitiesList(items, cssClass = '') {
  if (!items || items.length === 0) {
    return '<p class="empty-placeholder">Nenhuma atividade registrada.</p>';
  }

  return `
    <div class="activities-compact">
      ${items.map((item, index) => `
        <div class="activity-compact-item ${cssClass}">
          <span class="activity-compact-number">${index + 1}.</span>
          <div class="activity-compact-text">
            <strong><a href="${sanitizeHTML(item.url)}" target="_blank" rel="noopener">${sanitizeHTML(item.title)}</a></strong><br>
            <span class="activity-meta">ID ${item.id} • Estado: ${sanitizeHTML(item.state)} • Responsável: ${sanitizeHTML(item.assignedTo)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildHierarchyHTML(nodes) {
  if (!nodes || nodes.length === 0) {
    return '<p class="empty-placeholder">Nenhuma atividade encontrada.</p>';
  }

  const renderNode = (item, level = 0) => {
    const assignedLabel = item.assignedTo ? ` • Responsável: ${sanitizeHTML(item.assignedTo)}` : '';
    const typeLabel = item.type ? `${sanitizeHTML(item.type)}` : '';
    const childrenHtml = item.children && item.children.length
      ? `<ul>${item.children.map(child => renderNode(child, level + 1)).join('')}</ul>`
      : '';

    return `
      <li>
        <div class="hierarchy-card level-${level}">
          <div class="hierarchy-title">${sanitizeHTML(item.title)}</div>
          <div class="hierarchy-meta">#${item.id}${typeLabel ? ` • ${typeLabel}` : ''} • Estado: ${sanitizeHTML(item.state)}${assignedLabel}</div>
        </div>
        ${childrenHtml}
      </li>
    `;
  };

  return `<ul class="hierarchy-tree">${nodes.map(node => renderNode(node)).join('')}</ul>`;
}

function buildFeaturesGrid(features = []) {
  if (!features || features.length === 0) {
    return '<p class="empty-placeholder">Nenhuma feature vinculada ao Epic.</p>';
  }

  const renderTaskList = (tasks) => {
    if (!tasks || tasks.length === 0) {
      return '<p class="feature-empty">Nenhuma atividade pendente para esta feature.</p>';
    }

    return `
      <ul>
        ${tasks.map(task => `
          <li class="feature-task-item">
            <span class="activity-state state-${task.category}">${sanitizeHTML(getCategoryDisplay(task.category))}</span>
            <a href="${sanitizeHTML(task.url)}" target="_blank" rel="noopener">#${task.id} - ${sanitizeHTML(task.title)}</a>
            <span class="feature-task-owner">(${sanitizeHTML(task.assignedTo || 'Não atribuído')})</span>
          </li>
        `).join('')}
      </ul>
    `;
  };

  return `
    <div class="feature-grid">
      ${features.map(feature => {
        const total = feature.counts.total || 0;
        const completion = total > 0 ? feature.completion : 0;
        const activeTasks = (feature.children || []).filter(task => task.category !== 'done');
        const topActive = activeTasks.slice(0, 6);
        const hasMore = activeTasks.length > topActive.length;
        const doneTasks = feature.counts.done || 0;
        const inProgressTasks = feature.counts.inProgress || 0;
        const todoTasks = feature.counts.todo || 0;
        const pausedTasks = feature.counts.paused || 0;
        const approvedTasks = feature.counts.approved || 0;
        const newTasks = feature.counts.new || 0;

        return `
          <div class="feature-card">
            <div class="feature-header">
              <span class="feature-title">${sanitizeHTML(feature.title)}</span>
              <a href="${sanitizeHTML(feature.url)}" class="feature-link" target="_blank" rel="noopener">#${feature.id}</a>
            </div>
            <div class="feature-meta">
              <span><strong>Estado:</strong> ${sanitizeHTML(feature.state)}</span>
              <span><strong>Responsável:</strong> ${sanitizeHTML(feature.assignedTo || 'Não definido')}</span>
              <span><strong>Última atualização:</strong> ${formatDateTime(feature.lastUpdated)}</span>
              <span><strong>Esforço restante:</strong> ${formatRemainingWork(feature.remainingWork)}</span>
            </div>
            <div class="feature-progress">
              <div class="feature-progress-track">
                <div class="feature-progress-bar" style="width: ${total > 0 ? completion : 0}%"></div>
              </div>
              <div class="feature-progress-labels">
                <span>${total > 0 ? `${completion}% concluído` : 'Nenhuma atividade vinculada'}</span>
                <span>${doneTasks}/${total} entregues</span>
              </div>
            </div>
            <ul class="feature-stats">
              <li>
                <strong>${doneTasks}</strong>
                <span>Concluídas</span>
              </li>
              <li>
                <strong>${inProgressTasks}</strong>
                <span>Em Progresso</span>
              </li>
              <li>
                <strong>${todoTasks}</strong>
                <span>Pendentes</span>
              </li>
              <li>
                <strong>${approvedTasks}</strong>
                <span>Validação</span>
              </li>
              <li>
                <strong>${pausedTasks}</strong>
                <span>Pausadas</span>
              </li>
              <li>
                <strong>${newTasks}</strong>
                <span>Novas</span>
              </li>
            </ul>
            <div class="feature-tasks">
              <h4>Próximas Ações</h4>
              ${topActive.length > 0 ? renderTaskList(topActive) : '<p class="feature-empty">Sem atividades pendentes no momento.</p>'}
              ${hasMore ? `<p class="feature-empty">+${activeTasks.length - topActive.length} outras atividades em andamento.</p>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function buildTeamCards(teamMembers, org, project) {
  if (teamMembers.length === 0) {
    return '<p class="empty-placeholder">Nenhum responsável identificado.</p>';
  }

  const sorted = [...teamMembers].sort((a, b) => b.total - a.total);
  const cards = sorted.map(member => {
    const counters = [
      { label: 'Concluídas', value: member.done, class: 'badge-done' },
      { label: 'Em Progresso', value: member.inProgress, class: 'badge-progress' },
      { label: 'Pendentes', value: member.todo, class: 'badge-todo' },
      { label: 'Pausadas', value: member.paused, class: 'badge-paused' },
      { label: 'Validação', value: member.approved, class: 'badge-approved' },
      { label: 'Novas', value: member.new, class: 'badge-new' }
    ];

    const activities = member.items.slice(0, 6).map(item => `
      <li>
        <span class="activity-state state-${item.category}">${sanitizeHTML(item.state)}</span>
        <a href="${sanitizeHTML(item.url)}" target="_blank" rel="noopener">#${item.id} - ${sanitizeHTML(item.title)}</a>
      </li>
    `).join('');

    return `
      <div class="team-card">
        <div class="team-card-header">
          <h3>${sanitizeHTML(member.name)}</h3>
          <span class="team-card-total">${member.total} atividades</span>
        </div>
        <div class="team-card-counters">
          ${counters.map(counter => `
            <span class="team-counter ${counter.class}">
              <strong>${counter.value}</strong> ${counter.label}
            </span>
          `).join('')}
        </div>
        <div class="team-card-body">
          <ul class="team-card-list">
            ${activities || '<li class="empty-placeholder">Sem atividades recentes</li>'}
          </ul>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="team-grid">${cards}</div>`;
}

function buildChartScript(chartData) {
  const dataJSON = JSON.stringify(chartData);
  return `
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
      (function() {
        const chartData = ${dataJSON};
        const stackedCtx = document.getElementById('teamStatusChart');
        if (stackedCtx) {
          const labels = chartData.labels;
          const datasets = [
            {
              label: 'Concluídas',
              data: chartData.done,
              backgroundColor: '#38ef7d'
            },
            {
              label: 'Em Progresso',
              data: chartData.inProgress,
              backgroundColor: '#f5576c'
            },
            {
              label: 'Pendentes',
              data: chartData.todo,
                backgroundColor: '#ffa726'
              },
              {
                label: 'Pausadas',
                data: chartData.paused,
                backgroundColor: '#9575cd'
              },
              {
                label: 'Em Validação',
                data: chartData.approved,
                backgroundColor: '#26c6da'
            },
            {
              label: 'Novas',
              data: chartData.newly,
              backgroundColor: '#90a4ae'
            }
          ];

          const stackedTotalsPlugin = {
            id: 'stackedTotals',
            afterDatasetsDraw(chart) {
              const { ctx, scales } = chart;
              const datasets = chart.data.datasets;
              const xScale = scales.x;
              const yScale = scales.y;

              chart.data.labels.forEach((_, index) => {
                const total = datasets.reduce((sum, dataset) => sum + (dataset.data[index] || 0), 0);
                if (!total) return;

                let element = null;
                for (let i = datasets.length - 1; i >= 0; i--) {
                  const value = datasets[i].data[index] || 0;
                  const meta = chart.getDatasetMeta(i);
                  if (meta && meta.data && meta.data[index] && value) {
                    element = meta.data[index];
                    break;
                  }
                }

                let x = xScale.getPixelForValue(index);
                let y = yScale.getPixelForValue(total);

                if (element && element.tooltipPosition) {
                  const pos = element.tooltipPosition();
                  x = pos.x;
                  y = pos.y - 12;
                } else {
                  y -= 12;
                }

                ctx.save();
                ctx.fillStyle = '#333333';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(total, x, y);
                ctx.restore();
              });
            }
          };

          new Chart(stackedCtx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: datasets
            },
            plugins: [stackedTotalsPlugin],
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                },
                tooltip: {
                  mode: 'index',
                  intersect: false
                }
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 }
                },
                y: {
                  stacked: true,
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    precision: 0
                  }
                }
              }
            }
          });
        }

        const pieCtx = document.getElementById('statusPieChart');
        if (pieCtx) {
          new Chart(pieCtx, {
            type: 'pie',
            data: {
              labels: chartData.statusLabels,
              datasets: [{
                data: chartData.statusData,
                backgroundColor: ['#38ef7d', '#f5576c', '#ffa726', '#9575cd', '#26c6da', '#90a4ae'],
                borderWidth: 2,
                borderColor: '#ffffff'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom'
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = chartData.statusData.reduce((sum, current) => sum + current, 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      return label + ': ' + value + ' (' + percentage + '%)';
                    }
                  }
                }
              }
            },
            plugins: [{
              id: 'pieDataLabels',
              afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, datasetIndex) => {
                  const meta = chart.getDatasetMeta(datasetIndex);
                  const total = dataset.data.reduce((sum, current) => sum + current, 0);
                  meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (!value || total === 0) return;
                    const percentage = Math.round((value / total) * 100);
                    if (percentage === 0) return;

                    const position = element.tooltipPosition();
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(percentage + '%', position.x, position.y);
                    ctx.restore();
                  });
                });
              }
            }]
          });
        }
      })();
    </script>
  `;
}

function buildTagList(tagCounts) {
  if (!tagCounts || tagCounts.length === 0) {
    return '<p class="empty-placeholder">Nenhuma tag registrada.</p>';
  }

  const topTags = tagCounts.slice(0, 12);
  const rows = topTags.map(tag => `
    <li>
      <span class="tag-name">${sanitizeHTML(tag.name)}</span>
      <span class="tag-count">${tag.count}</span>
    </li>
  `).join('');

  return `
    <div class="chart-tags">
      <h4>Tags mais recorrentes</h4>
      <ul>
        ${rows}
      </ul>
    </div>
  `;
}

function buildCustomCSS() {
  return `
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

      .summary-bullet-item.success { border-left-color: #38ef7d; }
      .summary-bullet-item.warning { border-left-color: #f5576c; }
      .summary-bullet-item.info { border-left-color: #4facfe; }
      .summary-bullet-item.paused { border-left-color: #9575cd; }
      .summary-bullet-item.approved { border-left-color: #26c6da; }
      .summary-bullet-item.new { border-left-color: #90a4ae; }
      .summary-bullet-item.segment { border-left-color: #ff7043; }
      .summary-bullet-item.calendar { border-left-color: #607d8b; }

      .bullet-icon { font-size: 1.25rem; flex-shrink: 0; }
      .bullet-text { flex: 1; color: #333; }

      .chart-container {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        min-height: 380px;
      }

      .chart-wrapper {
        position: relative;
        width: 100%;
        height: 320px;
      }

      .chart-title {
        margin-bottom: 0.75rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: #333;
      }

      .chart-container-flex .chart-flex {
        display: flex;
        gap: 1.25rem;
        align-items: stretch;
      }

      .chart-tags {
        flex: 0 0 45%;
        background: #f8f9fa;
        border-radius: 10px;
        padding: 1rem;
        border: 1px solid #e0e0e0;
      }

      .chart-tags h4 {
        margin-top: 0;
        margin-bottom: 0.75rem;
        font-size: 0.9rem;
        color: #333;
      }

      .chart-tags ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .chart-tags li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
        background: white;
        padding: 0.45rem 0.6rem;
        border-radius: 6px;
        border: 1px solid #e4e7f0;
      }

      .chart-tags .tag-name {
        font-weight: 600;
        color: #3949ab;
      }

      .chart-tags .tag-count {
        font-weight: 600;
        color: #555;
      }

      .sprint-info {
        margin-top: 0.75rem;
        font-size: 0.9rem;
        color: #455a64;
      }

      .hierarchy-tree {
        list-style: none;
        margin: 0;
        padding-left: 0;
      }

      .hierarchy-tree ul {
        list-style: none;
        margin: 0.4rem 0 0.4rem 1.3rem;
        padding-left: 1.1rem;
        border-left: 1px dashed #d0d4e4;
      }

      .hierarchy-card {
        background: #f8f9fc;
        border-radius: 8px;
        padding: 0.65rem 0.85rem;
        border-left: 4px solid #667eea;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        margin: 0.35rem 0;
      }

      .hierarchy-card.level-1 { border-left-color: #26c6da; }
      .hierarchy-card.level-2 { border-left-color: #ffa726; }
      .hierarchy-card.level-3 { border-left-color: #90a4ae; }

      .hierarchy-title {
        font-weight: 600;
        color: #1f2937;
      }

      .hierarchy-meta {
        margin-top: 0.3rem;
        font-size: 0.85rem;
        color: #546e7a;
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .feature-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 1.2rem 1.3rem;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        border: 1px solid rgba(102, 126, 234, 0.15);
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .feature-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.5rem;
      }

      .feature-title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #1f2937;
        flex: 1;
      }

      .feature-link {
        font-size: 0.85rem;
        font-weight: 600;
        color: #3949ab;
        text-decoration: none;
      }

      .feature-link:hover {
        text-decoration: underline;
      }

      .feature-meta {
        font-size: 0.85rem;
        color: #546e7a;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .feature-progress {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .feature-progress-track {
        width: 100%;
        height: 10px;
        background: #e8eaf6;
        border-radius: 999px;
        overflow: hidden;
      }

      .feature-progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      }

      .feature-progress-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: #455a64;
      }

      .feature-stats {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.45rem;
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .feature-stats li {
        background: #f8f9fc;
        border-radius: 8px;
        padding: 0.55rem 0.65rem;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        border-left: 3px solid rgba(102, 126, 234, 0.45);
      }

      .feature-stats li strong {
        font-size: 1.05rem;
        color: #1f2937;
      }

      .feature-stats li span {
        font-size: 0.8rem;
        color: #607d8b;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .feature-tasks {
        background: #f5f7ff;
        border-radius: 10px;
        padding: 0.9rem;
        border: 1px dashed rgba(102, 126, 234, 0.35);
      }

      .feature-tasks h4 {
        margin: 0 0 0.6rem;
        font-size: 0.9rem;
        color: #374151;
      }

      .feature-tasks ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .feature-task-item {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.85rem;
      }

      .feature-task-item a {
        color: #1f2937;
        font-weight: 600;
        text-decoration: none;
      }

      .feature-task-item a:hover {
        text-decoration: underline;
      }

      .feature-task-owner {
        color: #546e7a;
        font-size: 0.8rem;
      }

      .feature-empty {
        margin: 0;
        font-size: 0.85rem;
        color: #607d8b;
        font-style: italic;
      }

      @media (max-width: 768px) {
        .feature-progress-labels {
          flex-direction: column;
          gap: 0.2rem;
        }
      }

      @media (max-width: 768px) {
        .chart-container-flex .chart-flex {
          flex-direction: column;
        }

        .chart-tags {
          flex: 1 1 auto;
        }
      }

      .activities-compact {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

      .activity-compact-item.done { border-left-color: #38ef7d; }
      .activity-compact-item.inProgress { border-left-color: #f5576c; }
      .activity-compact-item.todo { border-left-color: #ffa726; }
      .activity-compact-item.paused { border-left-color: #9575cd; }
      .activity-compact-item.approved { border-left-color: #26c6da; }
      .activity-compact-item.new { border-left-color: #90a4ae; }

      .activity-compact-number {
        font-weight: bold;
        color: #667eea;
        flex-shrink: 0;
      }

      .activity-meta {
        display: block;
        margin-top: 0.35rem;
        color: #777;
        font-size: 0.8rem;
      }

      .team-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .team-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .team-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .team-card-header h3 {
        font-size: 1.1rem;
        margin: 0;
      }

      .team-card-total {
        font-size: 0.85rem;
        color: #555;
        background: #f1f4ff;
        padding: 0.35rem 0.6rem;
        border-radius: 999px;
      }

      .team-card-counters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .team-counter {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.6rem;
        border-radius: 999px;
        font-size: 0.85rem;
      }

      .team-card-list {
        margin: 0;
        padding-left: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .team-card-list li {
        font-size: 0.85rem;
      }

      .team-card-list a {
        color: #1a56db;
        text-decoration: none;
      }

      .team-card-list a:hover {
        text-decoration: underline;
      }

      .team-counter.badge-done {
        background: #e8f5e9;
        color: #2e7d32;
      }

      .team-counter.badge-progress {
        background: #fce4ec;
        color: #c2185b;
      }

      .team-counter.badge-todo {
        background: #fff3e0;
        color: #e65100;
      }

      .team-counter.badge-paused {
        background: #f3e5f5;
        color: #6a1b9a;
      }

      .team-counter.badge-approved {
        background: #e0f7fa;
        color: #00838f;
      }
      .team-counter.badge-new {
        background: #eceff1;
        color: #455a64;
      }

      .state-done { color: #2e7d32; }
      .state-inProgress { color: #c2185b; }
      .state-todo { color: #e65100; }
      .state-paused { color: #6a1b9a; }
      .state-approved { color: #00838f; }
      .state-new { color: #546e7a; }

      .activity-state {
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 0.35rem;
      }

      .empty-placeholder {
        color: #777;
        font-style: italic;
        margin: 0.5rem 0;
      }

      .chart-section {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
        align-items: stretch;
      }

      .last-updated {
        margin-top: 1rem;
        font-size: 0.85rem;
        color: #666;
      }
    </style>
  `;
}

async function fetchBoardItems({
  org,
  project,
  team,
  pat,
  apiVersion,
  areaPath = null,
  iterationPath = null,
  additionalWhere = '',
  types = ['Task', 'Product Backlog Item', 'User Story', 'Bug', 'Issue']
}) {
  const encodedProject = encodeURIComponent(project);
  const encodedTeam = encodeURIComponent(team);
  const wiqlUrl = `https://dev.azure.com/${org}/${encodedProject}/${encodedTeam}/_apis/wit/wiql?api-version=${apiVersion}`;

  const authHeader = buildAuthHeader(pat);
  let iterationClause = '';
  if (iterationPath) {
    iterationClause = `AND [System.IterationPath] = '${iterationPath}'`;
  }

  const areaClause = areaPath ? `AND [System.AreaPath] = '${areaPath}'` : '';
  const typeList = types.map(type => `'${type}'`).join(', ');
  const wiqlQuery = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      ${areaClause}
      ${iterationClause}
      AND [System.WorkItemType] IN (${typeList})
      ${additionalWhere}
      AND [System.State] <> 'Removed'
    ORDER BY [System.ChangedDate] DESC
  `;

  const wiqlData = await azureRequest(wiqlUrl, {
    method: 'POST',
    body: { query: wiqlQuery },
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    }
  });

  const workItemRefs = wiqlData?.workItems || [];
  if (workItemRefs.length === 0) {
    return [];
  }

  const ids = workItemRefs.map(item => item.id);
  const chunks = [];
  for (let i = 0; i < ids.length; i += 200) {
    chunks.push(ids.slice(i, i + 200));
  }

  const fields = [
    'System.Id',
    'System.Title',
    'System.State',
    'System.WorkItemType',
    'System.AssignedTo',
    'System.IterationPath',
    'System.ChangedDate',
    'Microsoft.VSTS.Scheduling.RemainingWork',
    'System.Tags',
    'System.BoardLane'
  ];

  const results = [];
  for (const chunk of chunks) {
    const batchUrl = `https://dev.azure.com/${org}/_apis/wit/workitemsbatch?api-version=${apiVersion}`;
    const batchData = await azureRequest(batchUrl, {
      method: 'POST',
      body: {
        ids: chunk,
        fields
      },
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });

    (batchData?.value || []).forEach(item => results.push(item));
  }

  return results;
}

function buildReportData(workItems, {
  org,
  project,
  laneFilter = 'all',
  includeHierarchy = false,
  parentFeatures = []
}) {
  const summary = {
    total: 0,
    done: 0,
    inProgress: 0,
    todo: 0,
    paused: 0,
    approved: 0,
    new: 0
  };

  const categories = {
    done: [],
    inProgress: [],
    todo: [],
    paused: [],
    approved: [],
    new: []
  };

  const membersMap = new Map();
  const tagMap = new Map();
  const iterationSet = new Set();
  const hierarchyMap = includeHierarchy ? new Map() : null;
  const itemsMap = includeHierarchy ? new Map() : null;
  const typeCounts = {};
  let epicInfo = null;
  let lastUpdated = null;

  workItems.forEach(item => {
    const fields = item.fields || {};
    const id = fields['System.Id'] || item.id;
    const title = fields['System.Title'] || `Work Item ${id}`;
    const state = fields['System.State'] || 'Unknown';
    const changedDate = fields['System.ChangedDate'];
    if (changedDate && (!lastUpdated || new Date(changedDate) > new Date(lastUpdated))) {
      lastUpdated = changedDate;
    }

    const assignedValue = fields['System.AssignedTo'];
    const assignedTo = assignedValue
      ? (typeof assignedValue === 'string'
        ? assignedValue
        : assignedValue.displayName || assignedValue.uniqueName || 'Não definido')
      : 'Não definido';

    const category = mapStateToCategory(state);
    const workItemType = (fields['System.WorkItemType'] || '').trim();
    const normalizedType = workItemType.toLowerCase();
    const shouldIndexInSummary = !(includeHierarchy && (normalizedType === 'feature' || normalizedType === 'epic'));

    const iterationPath = fields['System.IterationPath'] || '';
    const normalizedIteration = iterationPath.toLowerCase();
    const isSprintOne = normalizedIteration.includes('sprint 1');

    if (!isSprintOne && category !== 'new') {
      return;
    }

    const boardLaneRaw = (fields['System.BoardLane'] || '').trim();
    const isDirectorateLane = boardLaneRaw.toLowerCase().includes('demandas diretoria');

    if (laneFilter === 'directorate' && !isDirectorateLane) {
      return;
    }

    if (laneFilter === 'operations' && isDirectorateLane) {
      return;
    }

    typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
    if (includeHierarchy && normalizedType === 'epic') {
      epicInfo = {
        id,
        title,
        state,
        assignedTo,
        url: buildWorkItemLink(org, project, id)
      };
    }

    if (shouldIndexInSummary) {
      summary[category] += 1;
      summary.total += 1;
      if (iterationPath) {
        iterationSet.add(iterationPath);
      } else {
        iterationSet.add('Sem Sprint');
      }
    }

    const tagsString = fields['System.Tags'] || '';
    const tags = tagsString
      ? tagsString.split(';').map(tag => tag.trim()).filter(Boolean)
      : [];

    const parentId = fields['System.Parent'] || fields['System.RelatedLink'] || null;
    let parent = parentId && hierarchyMap ? hierarchyMap.get(parentId) : null;
    if (hierarchyMap && !parent && parentId) {
      parent = { id: parentId, children: [], type: 'unknown' };
      hierarchyMap.set(parentId, parent);
    }

    const workItemEntry = {
      id,
      title,
      state,
      assignedTo,
      category,
      url: buildWorkItemLink(org, project, id),
      iterationPath,
      remainingWork: fields['Microsoft.VSTS.Scheduling.RemainingWork'] ?? null,
      changedDate,
      tags,
      boardLane: boardLaneRaw,
      parentId,
      children: [],
      type: workItemType
    };

    if (itemsMap) {
      const placeholder = hierarchyMap?.get(id);
      if (placeholder && placeholder.children.length > 0) {
        workItemEntry.children = placeholder.children;
        hierarchyMap.delete(id);
      }
      itemsMap.set(id, workItemEntry);
    }

    if (hierarchyMap && parentId) {
      if (!parent) {
        parent = { id: parentId, children: [], type: 'unknown' };
        hierarchyMap.set(parentId, parent);
      }
      parent.children.push(workItemEntry);
    }

    if (shouldIndexInSummary) {
      categories[category].push(workItemEntry);

      const existing = membersMap.get(assignedTo) || {
        name: assignedTo,
        total: 0,
        done: 0,
        inProgress: 0,
        todo: 0,
        paused: 0,
        approved: 0,
        new: 0,
        items: []
      };

      existing.total += 1;
      existing[category] += 1;
      existing.items.push(workItemEntry);

      membersMap.set(assignedTo, existing);

      tags.forEach(tag => {
        const current = tagMap.get(tag) || 0;
        tagMap.set(tag, current + 1);
      });
    }
  });

  const members = Array.from(membersMap.values()).sort((a, b) => b.total - a.total);
  const tagCounts = Array.from(tagMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  const completion = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const progress = summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0;
  const backlog = summary.total > 0 ? Math.round((summary.todo / summary.total) * 100) : 0;
  const pausedPct = summary.total > 0 ? Math.round((summary.paused / summary.total) * 100) : 0;
  const approvedPct = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;
  const newPct = summary.total > 0 ? Math.round((summary.new / summary.total) * 100) : 0;

  const chartData = {
    labels: members.map(m => m.name),
    done: members.map(m => m.done),
    inProgress: members.map(m => m.inProgress),
    todo: members.map(m => m.todo),
    paused: members.map(m => m.paused),
    approved: members.map(m => m.approved),
    newly: members.map(m => m.new),
    statusLabels: ['Concluídas', 'Em Progresso', 'Pendentes', 'Pausadas', 'Em Validação', 'Novas'],
    statusData: [summary.done, summary.inProgress, summary.todo, summary.paused, summary.approved, summary.new]
  };

  let hierarchyRoots = [];
  let featuresSummary = [];
  if (includeHierarchy && itemsMap) {
    const mapValues = Array.from(itemsMap.values());
    const idsSet = new Set(itemsMap.keys());
    hierarchyRoots = mapValues.filter(item => !item.parentId || !idsSet.has(item.parentId));

    featuresSummary = mapValues
      .filter(item => (item.type || '').toLowerCase() === 'feature')
      .map(item => {
        const children = Array.isArray(item.children) ? item.children : [];
        const counts = {
          total: children.length,
          done: 0,
          inProgress: 0,
          todo: 0,
          paused: 0,
          approved: 0,
          new: 0
        };

        let remainingWork = 0;
        let latestUpdate = item.changedDate || null;

        children.forEach(child => {
          const childCategory = child.category || mapStateToCategory(child.state);
          if (counts[childCategory] !== undefined) {
            counts[childCategory] += 1;
          } else {
            counts.todo += 1;
          }
          const remaining = Number(child.remainingWork);
          if (Number.isFinite(remaining)) {
            remainingWork += remaining;
          }
          if (child.changedDate && (!latestUpdate || new Date(child.changedDate) > new Date(latestUpdate))) {
            latestUpdate = child.changedDate;
          }
        });

        const completionPct = counts.total > 0
          ? Math.round((counts.done / counts.total) * 100)
          : (mapStateToCategory(item.state) === 'done' ? 100 : 0);

        return {
          id: item.id,
          title: item.title,
          state: item.state,
          assignedTo: item.assignedTo,
          counts,
          completion: completionPct,
          remainingWork,
          url: item.url,
          lastUpdated: latestUpdate,
          tags: item.tags,
          children
        };
      })
      .sort((a, b) => {
        if (b.completion !== a.completion) {
          return b.completion - a.completion;
        }
        return (b.counts.total || 0) - (a.counts.total || 0);
      });
  }

  return {
    summary,
    categories,
    members,
    completion,
    progress,
    backlog,
    chartData,
    lastUpdated,
    tagCounts,
    pausedPct,
    approvedPct,
    newPct,
    iterationPaths: Array.from(iterationSet),
    hierarchy: includeHierarchy ? hierarchyRoots : null,
    featuresSummary: includeHierarchy ? featuresSummary : [],
    typeCounts,
    epicInfo
  };
}

function buildReportHTML(reportData, context) {
  const {
    summary,
    categories,
    members,
    completion,
    progress,
    backlog,
    chartData,
    lastUpdated,
    tagCounts,
    pausedPct,
    approvedPct,
    newPct,
    iterationPaths,
    hierarchy,
    featuresSummary = [],
    typeCounts = {},
    epicInfo = null
  } = reportData;
  const {
    org,
    project,
    monthLabel = formatMonthYear(new Date()),
    segmentLabel = 'Operações',
    reportType = 'operations'
  } = context;
  const isEpicReport = reportType === 'epic';

  const iterationLabels = (iterationPaths || []).map(path => {
    if (!path || path === 'Sem Sprint') return 'Sem Sprint';
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || path;
  });
  const uniqueIterations = Array.from(new Set(iterationLabels.filter(Boolean)));

  const totalDemandas = summary.total;
  const totalConcluidas = summary.done;
  const totalEmProgresso = summary.inProgress;
  const totalPendentes = summary.todo;
  const totalPausadas = summary.paused;
  const totalValidacao = summary.approved;
  const totalNovas = summary.new;

  const totalFeatures = featuresSummary.length;
  const featuresCompleted = featuresSummary.filter(feature => {
    if (feature.counts.total === 0) {
      return mapStateToCategory(feature.state) === 'done';
    }
    return feature.counts.done === feature.counts.total && feature.counts.total > 0;
  }).length;
  const featuresInProgress = featuresSummary.filter(feature => {
    const active = (feature.counts.inProgress || 0) + (feature.counts.todo || 0) +
      (feature.counts.paused || 0) + (feature.counts.approved || 0) + (feature.counts.new || 0);
    return active > 0 && feature.counts.done !== feature.counts.total;
  }).length;

  const normalizedTypeCounts = Object.keys(typeCounts).reduce((acc, key) => {
    acc[key.toLowerCase()] = typeCounts[key];
    return acc;
  }, {});

  const totalTaskItems = (
    (normalizedTypeCounts['task'] || 0) +
    (normalizedTypeCounts['product backlog item'] || 0) +
    (normalizedTypeCounts['user story'] || 0) +
    (normalizedTypeCounts['bug'] || 0) +
    (normalizedTypeCounts['issue'] || 0)
  );

  const resumoTitle = isEpicReport ? '📌 Resumo do Epic' : '📊 Resumo Operacional';
  const totalLabel = isEpicReport ? 'Total de atividades acompanhadas' : 'Total';

  const resumoHtml = `
    <div class="report-section" id="resumo-operacoes">
      <h2>${resumoTitle}</h2>
      <div class="summary-compact">
        <div class="summary-bullets">
          <div class="summary-bullet-item calendar">
            <span class="bullet-icon">📆</span>
            <span class="bullet-text"><strong>Período:</strong> Sprint 1 • ${monthLabel}</span>
          </div>
          <div class="summary-bullet-item">
            <span class="bullet-icon">📋</span>
            <span class="bullet-text"><strong>${totalLabel}:</strong> ${totalDemandas} demandas acompanhadas</span>
          </div>
          <div class="summary-bullet-item segment">
            <span class="bullet-icon">🏷️</span>
            <span class="bullet-text"><strong>Segmento:</strong> ${segmentLabel}</span>
          </div>
          ${isEpicReport ? `
          <div class="summary-bullet-item info">
            <span class="bullet-icon">🧩</span>
            <span class="bullet-text"><strong>Features:</strong> ${totalFeatures} monitoradas • ${featuresCompleted} concluídas • ${featuresInProgress} em progresso</span>
          </div>
          <div class="summary-bullet-item">
            <span class="bullet-icon">🧱</span>
            <span class="bullet-text"><strong>Atividades vinculadas:</strong> ${totalTaskItems} (tasks, stories, bugs, issues)</span>
          </div>
          ${epicInfo ? `
          <div class="summary-bullet-item">
            <span class="bullet-icon">📍</span>
            <span class="bullet-text"><strong>Estado do Epic:</strong> ${sanitizeHTML(epicInfo.state)}${epicInfo.assignedTo ? ` • Owner: ${sanitizeHTML(epicInfo.assignedTo)}` : ''}</span>
          </div>
          ` : ''}
          ` : ''}
          <div class="summary-bullet-item success">
            <span class="bullet-icon">✅</span>
            <span class="bullet-text"><strong>Concluídas:</strong> ${totalConcluidas} (${completion}%)</span>
          </div>
          <div class="summary-bullet-item warning">
            <span class="bullet-icon">🔄</span>
            <span class="bullet-text"><strong>Em Progresso:</strong> ${totalEmProgresso} (${progress}%)</span>
          </div>
          <div class="summary-bullet-item">
            <span class="bullet-icon">📝</span>
            <span class="bullet-text"><strong>Pendentes:</strong> ${totalPendentes} (${backlog}%)</span>
          </div>
          <div class="summary-bullet-item paused">
            <span class="bullet-icon">⏸️</span>
            <span class="bullet-text"><strong>Pausadas:</strong> ${totalPausadas} (${pausedPct}%)</span>
          </div>
          <div class="summary-bullet-item approved">
            <span class="bullet-icon">✅</span>
            <span class="bullet-text"><strong>Em Validação:</strong> ${totalValidacao} (${approvedPct}%)</span>
          </div>
          <div class="summary-bullet-item new">
            <span class="bullet-icon">🆕</span>
            <span class="bullet-text"><strong>Novas (não atribuídas):</strong> ${totalNovas} (${newPct}%)</span>
          </div>
        </div>
        <div class="chart-section">
          <div class="chart-container chart-container-flex">
            <h3 class="chart-title">Status Geral das Demandas</h3>
            <div class="chart-flex">
              ${buildTagList(tagCounts)}
              <div class="chart-wrapper">
                <canvas id="statusPieChart"></canvas>
              </div>
            </div>
          </div>
          <div class="chart-container">
            <h3 class="chart-title">Distribuição por Responsável</h3>
            <div class="chart-wrapper">
              <canvas id="teamStatusChart"></canvas>
            </div>
          </div>
        </div>
      </div>
      ${uniqueIterations.length > 0 ? `<p class="sprint-info">Iterações monitoradas: ${uniqueIterations.join(', ')}</p>` : ''}
      <p class="last-updated">Última atualização: ${formatDateTime(lastUpdated)}</p>
    </div>
  `;

  const statusSectionsHtml = `
    <div class="report-section" id="status-demandas">
      <h2>🗂️ Demandas por Status</h2>
      <div class="subsection">
        <h3>✅ Concluídas (${totalConcluidas})</h3>
        ${buildActivitiesList(categories.done, 'done')}
      </div>
      <div class="subsection">
        <h3>🔄 Em Progresso (${totalEmProgresso})</h3>
        ${buildActivitiesList(categories.inProgress, 'inProgress')}
      </div>
      <div class="subsection">
        <h3>🆕 Novas (não atribuídas) (${totalNovas})</h3>
        ${buildActivitiesList(categories.new, 'new')}
      </div>
      <div class="subsection">
        <h3>📝 Pendentes (${totalPendentes})</h3>
        ${buildActivitiesList(categories.todo, 'todo')}
      </div>
      <div class="subsection">
        <h3>⏸️ Pausadas (${totalPausadas})</h3>
        ${buildActivitiesList(categories.paused, 'paused')}
      </div>
      <div class="subsection">
        <h3>🧪 Em Validação (${totalValidacao})</h3>
        ${buildActivitiesList(categories.approved, 'approved')}
      </div>
    </div>
  `;

  const featureSection = reportType === 'epic'
    ? `
    <div class="report-section" id="acompanhamento-features">
      <h2>🧩 Acompanhamento por Feature</h2>
      ${buildFeaturesGrid(featuresSummary)}
    </div>
  `
    : '';

  const hierarchySection = reportType === 'epic'
    ? `
    <div class="report-section" id="estrutura-epic">
      <h2>🧭 Estrutura do Epic</h2>
      ${buildHierarchyHTML(hierarchy)}
    </div>
  `
    : '';

  const equipeHtml = reportType === 'directorate'
    ? ''
    : `
    <div class="report-section" id="equipe">
      <h2>👥 Atividades por Responsável</h2>
      ${buildTeamCards(members, org, project)}
    </div>
  `;

  const backlogHtml = `
    <div class="report-section" id="backlog-completo">
      <h2>📋 Backlog Completo (${totalDemandas})</h2>
      ${buildActivitiesList(
        [
          ...categories.inProgress,
          ...categories.new,
          ...categories.todo,
          ...categories.done,
          ...categories.paused,
          ...categories.approved
        ],
        ''
      )}
    </div>
  `;

  const chartScript = buildChartScript(chartData);

  return resumoHtml + statusSectionsHtml + featureSection + hierarchySection + equipeHtml + backlogHtml + chartScript;
}

async function main() {
  loadEnv();

  const org = getEnvVar('AZURE_DEVOPS_ORG') || getEnvVar('AZURE_DEVOPS_ORGANIZATION') || getEnvVar('AZDO_ORG');
  const project = getEnvVar('AZURE_DEVOPS_PROJECT') || getEnvVar('AZDO_PROJECT') || 'DevSecOps - Kanban';
  const pat = getEnvVar('AZURE_DEVOPS_PAT') || getEnvVar('AZDO_PAT') || getEnvVar('AZURE_DEVOPS_PERSONAL_ACCESS_TOKEN');
  const apiVersion = getEnvVar('AZURE_DEVOPS_API_VERSION', '7.0');
  const areaPath = 'DevSecOps - Kanban';
  const team = 'Operacoes';

  if (!org || !pat) {
    console.error('❌ Variáveis AZURE_DEVOPS_ORG e AZURE_DEVOPS_PAT são obrigatórias.');
    process.exit(1);
  }

  console.log('📡 Coletando informações do board Operações no Azure DevOps...');
  let workItems;
  try {
    workItems = await fetchBoardItems({
      org,
      project,
      team,
      pat,
      apiVersion,
      areaPath
    });
  } catch (error) {
    console.error('❌ Falha ao consultar Azure DevOps:', error.message);
    process.exit(1);
  }

  console.log(`🔍 Itens retornados: ${workItems.length}`);

  const reportMonthLabel = formatMonthYear(new Date());
  const operationsData = buildReportData(workItems, { org, project, laneFilter: 'operations' });
  const directorateData = buildReportData(workItems, { org, project, laneFilter: 'directorate' });
  const customCSS = buildCustomCSS();

  const generator = new ReportGenerator({
    author: 'Marcos Cianci (marcos.cianci@vertem.digital) - Coordenador Infra e Cloud',
    owner: 'Vertem',
    site: 'https://vertem.com',
    footerNote: 'Relatório operacional gerado automaticamente via Azure DevOps'
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const operationsContent = buildReportHTML(operationsData, {
    org,
    project,
    monthLabel: reportMonthLabel,
    segmentLabel: 'Operações (Planejadas & Urgentes)',
    reportType: 'operations'
  });
  const operationsNavigation = buildNavigationLinks('operations');

  const operationsHtml = await generator.generateHTML({
    title: 'OnePage - Operações Vertem',
    subtitle: `Board Operações • Organização ${org} • Projeto ${project}`,
    sections: [],
    customContent: operationsContent,
    navigationLinks: operationsNavigation,
    customCSS
  });

  const operationsFilename = `operacoes-acompanhamento-${timestamp}.html`;
  const operationsPath = await generator.saveHTML(operationsHtml, operationsFilename);
  console.log(`✅ Relatório de Operações gerado em: ${operationsPath}`);

  const directorateContent = buildReportHTML(directorateData, {
    org,
    project,
    monthLabel: reportMonthLabel,
    segmentLabel: 'Demandas Diretoria',
    reportType: 'directorate'
  });
  const directorateNavigation = buildNavigationLinks('directorate');

  const directorateHtml = await generator.generateHTML({
    title: 'OnePage - Demandas Diretoria',
    subtitle: `Board Operações • Swimlane Diretoria • Organização ${org} • Projeto ${project}`,
    sections: [],
    customContent: directorateContent,
    navigationLinks: directorateNavigation,
    customCSS
  });

  const directorateFilename = `demandas-diretoria-acompanhamento-${timestamp}.html`;
  const directoratePath = await generator.saveHTML(directorateHtml, directorateFilename);
  console.log(`✅ Relatório da Diretoria gerado em: ${directoratePath}`);

  const projectsTeam = 'Projetos';
  const epicTitle = "PortoPlus - Evolução Fluxo de Atendimento a Incidente NOC";
  const epicTitleWIQL = epicTitle.replace(/'/g, "''");

  let epicWorkItems = [];
  try {
    const epicItems = await fetchBoardItems({
      org,
      project,
      team: projectsTeam,
      pat,
      apiVersion,
      types: ['Epic'],
      additionalWhere: `AND [System.Title] = '${epicTitleWIQL}'`
    });

    if (epicItems.length > 0) {
      const epicId = epicItems[0].id;

      const featureItems = await fetchBoardItems({
        org,
        project,
        team: projectsTeam,
        pat,
        apiVersion,
        areaPath,
        types: ['Feature'],
        additionalWhere: `AND [System.Parent] = ${epicId}`
      });

      const featureIds = featureItems.map(item => item.id);
      let taskItems = [];
      if (featureIds.length > 0) {
        const featureIdList = featureIds.join(', ');
        taskItems = await fetchBoardItems({
          org,
          project,
          team: projectsTeam,
          pat,
          apiVersion,
          types: ['Task', 'Product Backlog Item', 'User Story', 'Bug', 'Issue'],
          additionalWhere: `AND [System.Parent] IN (${featureIdList})`
        });
      }

      const combinedMap = new Map();
      [...epicItems, ...featureItems, ...taskItems].forEach(item => combinedMap.set(item.id, item));
      epicWorkItems = Array.from(combinedMap.values());
    } else {
      console.warn(`⚠️ Epic "${epicTitle}" não encontrado na sprint atual.`);
    }
  } catch (error) {
    console.error('❌ Falha ao coletar itens do Epic PortaPlus:', error.message);
  }

  if (epicWorkItems.length > 0) {
    const epicReportData = buildReportData(epicWorkItems, {
      org,
      project,
      laneFilter: 'all',
      includeHierarchy: true
    });

    const epicContent = buildReportHTML(epicReportData, {
      org,
      project,
      monthLabel: reportMonthLabel,
      segmentLabel: 'PortoPlus - Evolução Fluxo de Atendimento a Incidente NOC',
      reportType: 'epic'
    });
    const epicNavigation = buildNavigationLinks('epic');

    const epicHtml = await generator.generateHTML({
      title: 'OnePage - Epic PortoPlus',
      subtitle: `Epic PortoPlus - Evolução Fluxo de Atendimento • Sprint 1 • ${project}`,
      sections: [],
      customContent: epicContent,
      navigationLinks: epicNavigation,
      customCSS
    });

    const epicFilename = `porto-plus-epic-acompanhamento-${timestamp}.html`;
    const epicPath = await generator.saveHTML(epicHtml, epicFilename);
    console.log(`✅ Relatório Epic PortoPlus gerado em: ${epicPath}`);
  }
}

main().catch(error => {
  console.error('❌ Erro inesperado ao gerar relatório:', error);
  process.exit(1);
});


