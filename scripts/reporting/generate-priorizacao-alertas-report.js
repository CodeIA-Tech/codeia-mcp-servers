#!/usr/bin/env node
/**
 * Gera um relatório técnico em HTML5 com base no documento
 * PRIORIZACAO-ALERTAS.md utilizando o template técnico padrão Vertem.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ReportGenerator from './report-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('📄 Gerando relatório técnico de priorização de alertas...\n');

  const generator = new ReportGenerator({
    title: 'Relatório Técnico - Priorização de Alertas',
    author: 'Equipe SRE - Vertem',
    templateType: 'technical'
  });

  const summaryCards = [
    {
      title: 'P1 • Crítico',
      value: '15 min',
      label: 'Resolução: 4h | Plantão 24x7',
      severity: 'critical'
    },
    {
      title: 'P2 • Alto',
      value: '30 min',
      label: 'Resolução: 8h | OnCall 09h–22h',
      severity: 'warning'
    },
    {
      title: 'P3 • Médio',
      value: '4 horas',
      label: 'Resolução: 2 dias úteis | Comercial',
      severity: 'info'
    },
    {
      title: 'P4/P5 • Preventivo',
      value: '1 dia',
      label: 'Resolução: até 5 dias | Comunicação',
      severity: 'success'
    }
  ];

  const sections = [
    {
      id: 'objetivo-escopo',
      title: 'Objetivo e Escopo',
      icon: '🎯',
      navLabel: 'Objetivo',
      content: `
        <p><strong>Objetivo:</strong> Definir critérios padronizados para triagem, priorização e tratamento de alertas em produção, reduzindo fadiga de alertas e garantindo respostas rápidas ao negócio.</p>
        <p><strong>Escopo:</strong> Aplicável aos ambientes de produção monitorados por Datadog/AWS CloudWatch e aos times Vertem (SRE, Infraestrutura Cloud e Desenvolvimento) em conjunto com parceiros como Tivit.</p>
        <ul>
          <li>Plataformas monitoradas: Datadog e AWS CloudWatch</li>
          <li>Serviços englobados: APIs, aplicações web, bancos de dados, infraestrutura e integrações</li>
          <li>Times envolvidos: SRE, Infra Cloud, Desenvolvimento e NOC parceiro (Tivit)</li>
        </ul>
      `
    },
    {
      id: 'severidade-sla',
      title: 'Severidade e SLAs',
      icon: '⚖️',
      navLabel: 'Severidade & SLA',
      content: `
        <h4>Níveis de Severidade</h4>
        <p>Cinco categorias (P1 a P5) foram definidas, considerando impacto ao cliente e urgência, desde indisponibilidade total (P1) até alertas informativos (P5).</p>
        <table>
          <thead>
            <tr>
              <th>Prioridade</th>
              <th>Tempo Resposta</th>
              <th>Tempo Resolução</th>
              <th>Disponibilidade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🔴 P1 – Crítico</td>
              <td>15 minutos</td>
              <td>4 horas</td>
              <td>Plantão 24x7</td>
            </tr>
            <tr>
              <td>🟠 P2 – Alto</td>
              <td>30 minutos</td>
              <td>8 horas</td>
              <td>OnCall 09h–22h</td>
            </tr>
            <tr>
              <td>🟡 P3 – Médio</td>
              <td>4 horas</td>
              <td>2 dias úteis</td>
              <td>Horário comercial</td>
            </tr>
            <tr>
              <td>🟢 P4 – Baixo</td>
              <td>1 dia útil</td>
              <td>5 dias úteis</td>
              <td>Horário comercial</td>
            </tr>
            <tr>
              <td>⚪ P5 – Informativo</td>
              <td>Sem SLA</td>
              <td>Sem SLA</td>
              <td>N/A</td>
            </tr>
          </tbody>
        </table>
        <h4>Decisão Rápida (Impacto x Urgência)</h4>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>Impacto \ Urgência</th>
              <th>Alta</th>
              <th>Média</th>
              <th>Baixa</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Alto</th>
              <td><strong>🔴 P1</strong></td>
              <td><strong>🟠 P2</strong></td>
              <td><strong>🟡 P3</strong></td>
            </tr>
            <tr>
              <th>Médio</th>
              <td><strong>🟠 P2</strong></td>
              <td><strong>🟡 P3</strong></td>
              <td><strong>🟢 P4</strong></td>
            </tr>
            <tr>
              <th>Baixo</th>
              <td><strong>🟡 P3</strong></td>
              <td><strong>🟢 P4</strong></td>
              <td><strong>⚪ P5</strong></td>
            </tr>
          </tbody>
        </table>
      `
    },
    {
      id: 'criterios',
      title: 'Critérios por Tipo de Recurso',
      icon: '📊',
      navLabel: 'Critérios',
      content: `
        <p>Os limiares abaixo ajudam a definir a prioridade com base em métricas específicas para aplicações e infraestrutura.</p>
        <div class="flow-grid">
          <div class="flow-column">
            <h4>Aplicações</h4>
            <table>
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>P1</th>
                  <th>P2</th>
                  <th>P3</th>
                  <th>P4</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Error Rate</td>
                  <td>&gt; 25%</td>
                  <td>10 – 25%</td>
                  <td>5 – 10%</td>
                  <td>1 – 5%</td>
                </tr>
                <tr>
                  <td>Latência (P95)</td>
                  <td>&gt; 5s</td>
                  <td>2 – 5s</td>
                  <td>1 – 2s</td>
                  <td>0.5 – 1s</td>
                </tr>
                <tr>
                  <td>Availability</td>
                  <td>&lt; 95%</td>
                  <td>95 – 98%</td>
                  <td>98 – 99%</td>
                  <td>99 – 99.5%</td>
                </tr>
                <tr>
                  <td>Request Rate</td>
                  <td>Queda &gt; 90%</td>
                  <td>Queda 50 – 90%</td>
                  <td>Queda 25 – 50%</td>
                  <td>Queda &lt; 25%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flow-column">
            <h4>Infraestrutura</h4>
            <table>
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>P1</th>
                  <th>P2</th>
                  <th>P3</th>
                  <th>P4</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CPU</td>
                  <td>&gt; 95% (15 min)</td>
                  <td>&gt; 90% (30 min)</td>
                  <td>&gt; 80% (1h)</td>
                  <td>&gt; 70%</td>
                </tr>
                <tr>
                  <td>Memória</td>
                  <td>&gt; 95%</td>
                  <td>&gt; 90%</td>
                  <td>&gt; 85%</td>
                  <td>&gt; 75%</td>
                </tr>
                <tr>
                  <td>Disco</td>
                  <td>&gt; 95%</td>
                  <td>&gt; 90%</td>
                  <td>&gt; 85%</td>
                  <td>&gt; 75%</td>
                </tr>
                <tr>
                  <td>Network Loss</td>
                  <td>&gt; 5%</td>
                  <td>2 – 5%</td>
                  <td>1 – 2%</td>
                  <td>&lt; 1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `
    },
    {
      id: 'fluxo-escalacao',
      title: 'Fluxos de Escalação',
      icon: '🚨',
      navLabel: 'Escalação',
      content: `
        <p>O processo é dividido em dois fluxos distintos: <strong>Aplicação</strong> (responsabilidade da Vertem) e <strong>Infraestrutura</strong> (Tivit + Vertem).</p>
        <div class="flow-grid">
          <div class="flow-column">
            <h4>Aplicação</h4>
            <h5>🔴 P1 (24x7)</h5>
            <ol>
              <li>T0 – Datadog OnCall aciona desenvolvedor(a) de plantão (telefone + SMS + Teams)</li>
              <li>T0 + 10min – Team Leader Dev + Lead SRE entram no incidente</li>
              <li>T0 + 30min – Diretoria Vertem e stakeholders são comunicados</li>
            </ol>
            <h5>🟠 P2 (09h–22h)</h5>
            <ol>
              <li>T0 – Alerta em Teams (@channel) para squad responsável e SRE</li>
              <li>T0 + 15min – Team Leaders Dev assumem</li>
              <li>T0 + 30min – Coordenador(a) SRE/Infra + SRE Senior assumem</li>
              <li>T0 + 60min – Diretoria TI Vertem atualizada; após 22h, reclassificar para P1 se houver impacto</li>
            </ol>
            <p class="flow-note">🟡 P3 / 🟢 P4 / ⚪ P5 – notificações em Teams + e-mail, tratadas em horário comercial com escalonamento às lideranças em 4h (P3) ou na daily seguinte (P4/P5).</p>
          </div>
          <div class="flow-column">
            <h4>Infraestrutura</h4>
            <h5>🔴 P1 (24x7)</h5>
            <ol>
              <li>T0 – Integração Zabbix notifica NOC Tivit e gera ticket no Zendesk</li>
              <li>T0 + 10min – Escalação para Tivit N2/N3</li>
              <li>T0 + 15min – Plantonista Vertem é acionado via Datadog OnCall</li>
              <li>T0 + 30min – Coordenador(a) SRE/Infra + SRE Seniors + Team Leader Dev assumem</li>
              <li>T0 + 45min – Diretoria TI Vertem e cliente são comunicados</li>
            </ol>
            <h5>🟠 P2 (09h–22h)</h5>
            <ol>
              <li>T0 – Acionar Tivit via Teams + telefone (OnCall dentro da janela 09h–22h)</li>
              <li>T0 + 15min – Escalar para Tivit N2/N3</li>
              <li>T0 + 30min – Acionar Vertem SRE/Infra (Team Leader Dev + Lead SRE)</li>
              <li>T0 + 60min – Lead SRE + Team Leader Dev atualizam Diretoria TI Vertem</li>
            </ol>
            <p class="flow-note">🟡 P3 / 🟢 P4 / ⚪ P5 – acompanhamento via Teams/e-mail com ticket no Zendesk, escalando às lideranças se não houver atualização em 4h (P3) ou na daily seguinte.</p>
          </div>
        </div>
      `
    },
    {
      id: 'responsabilidades',
      title: 'Responsabilidades e Próximos Passos',
      icon: '🧭',
      navLabel: 'Responsabilidades',
      content: `
        <p><strong>Responsabilidades chave:</strong></p>
        <ul>
          <li><strong>Time SRE:</strong> manter monitores, responder a alertas conforme SLA, conduzir troubleshooting e registrar RCA.</li>
          <li><strong>Coordenador SRE:</strong> revisar prioridades, acompanhar P1/P2, conduzir retrospectivas e garantir cumprimento de SLAs.</li>
          <li><strong>Times de Desenvolvimento:</strong> instrumentar aplicações, apoiar incidentes de aplicação e corrigir root causes.</li>
          <li><strong>Diretoria:</strong> aprovar ajustes de processo, prover recursos e atuar em incidentes críticos.</li>
        </ul>
        <h4>Próximas ações recomendadas</h4>
        <ol>
          <li>Implementar e revisar monitores alinhados aos 4 Golden Signals.</li>
          <li>Configurar canais de notificação (Teams, OnCall) conforme a tabela de canais.</li>
          <li>Treinar squads e parceiros sobre o fluxo de escalonamento.</li>
        </ol>
      `
    }
  ];

  const navigationLinks = sections.map((section, index) => `
    <a href="#${section.id}" class="nav-link ${index === 0 ? 'active' : ''}">${section.navLabel || section.title}</a>
  `).join('\n                ');

  const customCSS = `
    <style>
      html {
        scroll-behavior: smooth;
      }
      .section {
        scroll-margin-top: 160px;
      }
      .callout {
        border-radius: 6px;
        padding: 1rem;
        margin: 1rem 0;
        border-left: 4px solid currentColor;
        background: rgba(17, 153, 142, 0.08);
      }
      .callout.warning {
        color: #f39c12;
        background: rgba(243, 156, 18, 0.08);
      }
      .matrix-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0 2rem;
      }
      .matrix-table th,
      .matrix-table td {
        border: 1px solid #e0e0e0;
        padding: 0.75rem;
        text-align: center;
        vertical-align: middle;
        background: #fff;
        width: 25%;
      }
      .matrix-table thead th {
        background: #f5f7fb;
        font-weight: 600;
      }
      .matrix-table tbody th {
        background: #f9fafc;
        font-weight: 600;
        text-align: left;
        width: 25%;
      }
      .matrix-table td strong {
        display: block;
        font-size: 1rem;
        margin-bottom: 0.25rem;
      }
      .matrix-table td strong::after {
        content: '';
      }
      .matrix-table td em {
        font-style: normal;
        color: #666;
        font-size: 0.85rem;
      }
      .flow-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
      }
      .flow-column {
        background: #f9fafc;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
      }
      .flow-column table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.75rem 0;
      }
      .flow-column table th,
      .flow-column table td {
        border: 1px solid #dde3f3;
        padding: 0.5rem 0.75rem;
        text-align: center;
        background: #fff;
      }
      .flow-column table thead th {
        background: #edf2ff;
        font-weight: 600;
      }
      .flow-column table td:first-child,
      .flow-column table th:first-child {
        text-align: left;
      }
      .flow-column h4 {
        margin: 0 0 1rem;
        font-size: 1.2rem;
        color: #2c3e50;
      }
      .flow-column h5 {
        margin: 1.2rem 0 0.5rem;
        font-size: 1rem;
        color: #1a5632;
      }
      .flow-column ol {
        padding-left: 1.2rem;
        margin: 0;
        color: #2c3e50;
      }
      .flow-column li {
        margin-bottom: 0.5rem;
      }
      .flow-note {
        margin-top: 1rem;
        font-size: 0.9rem;
        color: #555;
      }
      .nav-link.active {
        background: rgba(39, 174, 96, 0.15);
        color: #27ae60;
        border-color: rgba(39, 174, 96, 0.5);
        box-shadow: 0 2px 6px rgba(39, 174, 96, 0.2);
      }
    </style>
  `;

  const customContent = `
    <div class="callout warning"><strong>Revisão trimestral:</strong> ajustar thresholds e regras de notificação com base em dados históricos e métricas de falso-positivo.</div>
    <script>
      document.addEventListener('DOMContentLoaded', function () {
        const OFFSET = 150;
        const nav = document.querySelector('.hero-nav');
        if (!nav) return;
        const links = Array.from(nav.querySelectorAll('.nav-link'));
        const sections = Array.from(document.querySelectorAll('.section'));

        const setActive = (id) => {
          links.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + id);
          });
        };

        links.forEach(link => {
          link.addEventListener('click', function (event) {
            event.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
              window.scrollTo({ top: target.offsetTop - OFFSET, behavior: 'smooth' });
              setActive(target.id);
            }
          });
        });

        window.addEventListener('scroll', () => {
          const fromTop = window.scrollY + OFFSET + 10;
          const currentSection = sections.find((section, index) => {
            const next = sections[index + 1];
            const start = section.offsetTop - OFFSET;
            const end = next ? next.offsetTop - OFFSET : Number.POSITIVE_INFINITY;
            return fromTop >= start && fromTop < end;
          });
          if (currentSection) {
            setActive(currentSection.id);
          }
        });
      });
    </script>
  `;

  const html = await generator.generateHTML({
    title: 'Priorização de Alertas Vertem',
    subtitle: 'Fluxos, severidade e responsabilidades',
    summaryCards,
    sections,
    customCSS,
    navigationLinks,
    customContent
  });

  const reportsDir = path.join(__dirname, '..', '..', 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const outputPath = path.join(reportsDir, 'relatorio-priorizacao-alertas.html');
  await fs.writeFile(outputPath, html, 'utf-8');

  console.log('✅ Relatório gerado com sucesso!');
  console.log(`📄 Arquivo: ${outputPath}\n`);
  console.log('📌 Abra no navegador ou sirva via scripts/serve-report.js para visualização.');
}

main().catch(error => {
  console.error('❌ Erro ao gerar relatório:', error);
  process.exit(1);
});
