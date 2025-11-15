#!/usr/bin/env node
/**
 * Navigation Helper
 * 
 * Utilitário para criar navegação dinâmica em relatórios
 */

export class NavigationHelper {
  /**
   * Gera links de navegação baseados em seções
   * @param {Array} sections - Array de objetos {id, label, shortLabel}
   * @returns {string} HTML dos links de navegação
   */
  static generateNavigationLinks(sections) {
    return sections.map(section => 
      `<a href="#${section.id}" class="nav-link" data-section="${section.id}" data-full-label="${section.label}" data-short-label="${section.shortLabel || section.label}">${section.shortLabel || section.label}</a>`
    ).join('\n                ');
  }

  /**
   * Gera seções de conteúdo com IDs para navegação
   * @param {Array} sections - Array de objetos {id, title, icon, content}
   * @returns {string} HTML das seções
   */
  static generateSections(sections) {
    return sections.map(section => `
      <div class="report-section" id="${section.id}">
        <h2>${section.icon || ''} ${section.title}</h2>
        ${section.content}
      </div>
    `).join('\n');
  }

  /**
   * Gera CSS personalizado para navegação
   * @param {Object} options - Opções de customização
   * @returns {string} CSS customizado
   */
  static generateNavigationCSS(options = {}) {
    const {
      scrollMargin = '180px',
      linkFontSize = '0.85rem',
      activeBackground = 'rgba(0, 102, 204, 0.4)',
      hoverBackground = 'rgba(255, 255, 255, 0.2)'
    } = options;

    return `
      <style>
        .report-section {
          scroll-margin-top: ${scrollMargin};
        }
        
        .report-section h2 {
          scroll-margin-top: ${scrollMargin};
        }
        
        .nav-link {
          font-size: ${linkFontSize};
        }
        
        .nav-link.active {
          background: ${activeBackground};
        }
        
        .nav-link:hover {
          background: ${hoverBackground};
        }
        
        html {
          scroll-behavior: smooth;
        }
      </style>
    `;
  }

  /**
   * Gera seções predefinidas para relatórios executivos
   * @param {Object} data - Dados do relatório
   * @returns {Array} Array de seções
   */
  static generateExecutiveSections(data) {
    return [
      { id: 'resumo-executivo', label: 'Resumo Executivo', shortLabel: 'Resumo' },
      { id: 'objetivos', label: 'Objetivos e Metas', shortLabel: 'Objetivos' },
      { id: 'resultados', label: 'Resultados Alcançados', shortLabel: 'Resultados' },
      { id: 'indicadores', label: 'Indicadores de Performance', shortLabel: 'Indicadores' },
      { id: 'recomendacoes', label: 'Recomendações', shortLabel: 'Recomendações' }
    ];
  }

  /**
   * Gera seções predefinidas para relatórios técnicos
   * @param {Object} data - Dados do relatório
   * @returns {Array} Array de seções
   */
  static generateTechnicalSections(data) {
    return [
      { id: 'introducao', label: 'Introdução', shortLabel: 'Intro' },
      { id: 'arquitetura', label: 'Arquitetura do Sistema', shortLabel: 'Arquitetura' },
      { id: 'implementacao', label: 'Detalhes de Implementação', shortLabel: 'Implementação' },
      { id: 'testes', label: 'Testes e Validação', shortLabel: 'Testes' },
      { id: 'metricas', label: 'Métricas Técnicas', shortLabel: 'Métricas' },
      { id: 'conclusao', label: 'Conclusão', shortLabel: 'Conclusão' }
    ];
  }

  /**
   * Gera seções predefinidas para relatórios de acompanhamento
   * @param {Object} data - Dados do relatório
   * @returns {Array} Array de seções
   */
  static generateTrackingSections(data) {
    return [
      { id: 'resumo-executivo', label: 'Resumo Executivo', shortLabel: 'Resumo' },
      { id: 'periodo-acompanhamento', label: 'Período de Acompanhamento', shortLabel: 'Período' },
      { id: 'atividades-concluidas', label: 'Atividades Concluídas', shortLabel: 'Concluídas' },
      { id: 'demandas-progresso', label: 'Demandas em Progresso', shortLabel: 'Em Progresso' },
      { id: 'aguardando-terceiros', label: 'Aguardando Terceiros', shortLabel: 'Aguardando' },
      { id: 'pendentes', label: 'Pendentes', shortLabel: 'Pendentes' },
      { id: 'riscos-atencao', label: 'Riscos e Pontos de Atenção', shortLabel: 'Riscos' }
    ];
  }
}

export default NavigationHelper;

