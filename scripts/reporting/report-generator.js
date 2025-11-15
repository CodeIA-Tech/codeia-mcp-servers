#!/usr/bin/env node
/**
 * Agente Gerador de Relatórios
 * 
 * Módulo padrão para geração de relatórios HTML5 e Markdown
 * Pode ser usado por outros agentes para gerar relatórios padronizados
 * 
 * Uso:
 *   const ReportGenerator = require('./report-generator');
 *   const generator = new ReportGenerator(options);
 *   await generator.generateHTML(data);
 *   await generator.generateMarkdown(data);
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReportGenerator {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || path.join(__dirname, '..', '..', 'templates');
    this.reportsDir = options.reportsDir || path.join(__dirname, '..', '..', 'reports');
    this.templateType = options.templateType || 'default'; // default, executive, technical, presentation
    
    // Tentar logo_vertem.png primeiro, depois logo vertem.jpg
    this.logoPath = options.logoPath || 
      (fs.existsSync(path.join(this.templatesDir, 'logos', 'logo_vertem.png')) 
        ? path.join(this.templatesDir, 'logos', 'logo_vertem.png')
        : path.join(this.templatesDir, 'logos', 'logo vertem.jpg'));
    // Logo do rodapé - tentar logo-footer.png, depois usar o mesmo do header
    this.footerLogoPath = options.footerLogoPath || 
      (fs.existsSync(path.join(this.templatesDir, 'logos', 'logo-footer.png')) 
        ? path.join(this.templatesDir, 'logos', 'logo-footer.png')
        : this.logoPath);
    this.author = options.author || 'Vertem - Sistema de Monitoramento';
    this.site = options.site || 'datadoghq.com';
    this.owner = options.owner || 'Vertem';
    this.footerNote = options.footerNote || 'Relatório gerado automaticamente pelo sistema de monitoramento Vertem';
    
    // Garantir que os diretórios existam
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Carrega o template HTML baseado no tipo
   */
  loadHTMLTemplate() {
    const templateMap = {
      'default': 'report-template.html',
      'executive': 'executive-report-template.html',
      'technical': 'technical-report-template.html',
      'presentation': 'presentation-report-template.html'
    };
    
    const templateFile = templateMap[this.templateType] || templateMap['default'];
    const templatePath = path.join(this.templatesDir, templateFile);
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template ${templateFile} não encontrado, usando default`);
      const defaultPath = path.join(this.templatesDir, 'report-template.html');
      return fs.readFileSync(defaultPath, 'utf8');
    }
    
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Carrega o template Markdown
   */
  loadMarkdownTemplate() {
    const templatePath = path.join(this.templatesDir, 'report-template.md');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template Markdown não encontrado: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Carrega e codifica o logo em base64 para header
   */
  loadLogoHeader() {
    if (!fs.existsSync(this.logoPath)) {
      return '';
    }
    const logoBuffer = fs.readFileSync(this.logoPath);
    const ext = path.extname(this.logoPath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    const base64 = logoBuffer.toString('base64');
    return `<img src="data:${mimeType};base64,${base64}" alt="Vertem Logo" style="max-height: 50px;">`;
  }

  /**
   * Carrega e codifica o logo em base64 para footer
   */
  loadLogoFooter() {
    const footerLogo = this.footerLogoPath || this.logoPath;
    if (!fs.existsSync(footerLogo)) {
      return '';
    }
    const logoBuffer = fs.readFileSync(footerLogo);
    const ext = path.extname(footerLogo).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    const base64 = logoBuffer.toString('base64');
    return `<img src="data:${mimeType};base64,${base64}" alt="Vertem Logo" class="footer-logo" style="max-height: 80px; width: auto;">`;
  }

  /**
   * Gera cards de resumo HTML
   */
  generateSummaryCards(summaryCards = []) {
    if (!summaryCards || summaryCards.length === 0) {
      return '';
    }

    return `
        <div class="summary-cards">
            ${summaryCards.map(card => `
                <div class="card ${card.severity || 'info'}">
                    <div class="card-title">${card.title}</div>
                    <div class="card-value">${card.value}</div>
                    ${card.label ? `<div class="card-label">${card.label}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
  }

  /**
   * Gera seções de conteúdo HTML
   */
  generateContentSections(sections = []) {
    if (!sections || sections.length === 0) {
      return '';
    }

    const slugify = (str, fallback) => {
      if (!str && fallback !== undefined) {
        return `section-${fallback}`;
      }
      return String(str)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `section-${fallback}`;
    };

    return sections.map((section, index) => {
      const sectionId = section.id || slugify(section.title, index);
      const title = section.icon ? `${section.icon} ${section.title}` : section.title;

      return `
        <div class="section" id="${sectionId}">
            <h2 class="section-title">${title}</h2>
            <div class="content">
                ${section.content}
            </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Gera recomendações HTML
   */
  generateRecommendations(recommendations = []) {
    if (!recommendations || recommendations.length === 0) {
      return '';
    }

    return `
        <div class="section">
            <h2 class="section-title">🚨 Recomendações</h2>
            ${recommendations.map(rec => `
                <div class="recommendation ${rec.severity || 'info'}">
                    ${rec.category ? `<div class="recommendation-category">${rec.category}</div>` : ''}
                    <div class="recommendation-title">${rec.title}</div>
                    ${rec.description ? `<div class="recommendation-description">${rec.description}</div>` : ''}
                    ${rec.actions && rec.actions.length > 0 ? `
                        <ul class="recommendation-actions">
                            ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
  }

  /**
   * Gera resumo Markdown
   */
  generateMarkdownSummary(summaryCards = []) {
    if (!summaryCards || summaryCards.length === 0) {
      return 'Nenhum resumo disponível.';
    }

    return summaryCards.map(card => `- **${card.title}**: ${card.value}${card.label ? ` (${card.label})` : ''}`).join('\n');
  }

  /**
   * Gera conteúdo Markdown
   */
  generateMarkdownContent(sections = []) {
    if (!sections || sections.length === 0) {
      return 'Nenhum conteúdo disponível.';
    }

    return sections.map(section => `
### ${section.title}

${section.content}
    `).join('\n\n');
  }

  /**
   * Gera recomendações Markdown
   */
  generateMarkdownRecommendations(recommendations = []) {
    if (!recommendations || recommendations.length === 0) {
      return 'Nenhuma recomendação disponível.';
    }

    return recommendations.map(rec => `
#### ${rec.title} ${rec.severity === 'critical' ? '🔴' : rec.severity === 'warning' ? '🟡' : '🔵'}

**Categoria:** ${rec.category || 'Geral'}

${rec.description || ''}

${rec.actions && rec.actions.length > 0 ? `
**Ações Recomendadas:**
${rec.actions.map(action => `- ${action}`).join('\n')}
` : ''}
    `).join('\n\n');
  }

  /**
   * Formata data no padrão brasileiro
   */
  formatDate(date = new Date()) {
    return date.toLocaleString('pt-BR', { 
      dateStyle: 'full', 
      timeStyle: 'long' 
    });
  }

  /**
   * Formata data apenas com dia, mês e ano
   */
  formatDateShort(date = new Date()) {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Separa informações do autor (nome, email, cargo)
   */
  parseAuthor(author) {
    // Formato esperado: "Nome (email@example.com) - Cargo"
    // Ou: "Nome - Cargo"
    const authorInfo = {
      name: author,
      email: '',
      role: ''
    };

    // Separar nome/email do cargo
    const parts = author.split(' - ');
    if (parts.length > 1) {
      authorInfo.role = parts[parts.length - 1].trim();
      const namePart = parts.slice(0, -1).join(' - ').trim();
      
      // Extrair email se estiver entre parênteses
      const emailMatch = namePart.match(/\(([^)]+)\)/);
      if (emailMatch) {
        authorInfo.email = emailMatch[1];
        authorInfo.name = namePart.replace(/\([^)]+\)/, '').trim();
      } else {
        authorInfo.name = namePart;
      }
    } else {
      // Tentar extrair email mesmo sem cargo
      const emailMatch = author.match(/\(([^)]+)\)/);
      if (emailMatch) {
        authorInfo.email = emailMatch[1];
        authorInfo.name = author.replace(/\([^)]+\)/, '').trim();
      } else {
        authorInfo.name = author;
      }
    }

    return authorInfo;
  }

  /**
   * Gera relatório HTML5
   */
  async generateHTML(data) {
    const {
      title,
      subtitle = '',
      summaryCards = [],
      sections = [],
      recommendations = [],
      customContent = '',
      customCSS = '',
      navigationLinks = null
    } = data;

    const template = this.loadHTMLTemplate();
    const logoHeader = this.loadLogoHeader();
    const logoFooter = this.loadLogoFooter();
    const reportDate = this.formatDate();
    const reportDateShort = this.formatDateShort();
    const currentYear = new Date().getFullYear();
    const defaultNavigationLinks = this.generateNavigationLinks('index', '');
    const finalNavigationLinks = navigationLinks || defaultNavigationLinks;
    
    // Separar informações do autor
    const authorInfo = this.parseAuthor(this.author);
    const authorName = authorInfo.email 
      ? `${authorInfo.name} (${authorInfo.email})`
      : authorInfo.name;

    // Substituir placeholders
    let html = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{HEADER_TITLE\}\}/g, title)
      .replace(/\{\{SUBTITLE\}\}/g, subtitle)
      .replace(/\{\{REPORT_DATE\}\}/g, reportDateShort)
      .replace(/\{\{LOGO_HEADER\}\}/g, logoHeader)
      .replace(/\{\{LOGO_FOOTER\}\}/g, logoFooter)
      .replace(/\{\{NAVIGATION_LINKS\}\}/g, finalNavigationLinks)
      .replace(/\{\{AUTHOR\}\}/g, this.author)
      .replace(/\{\{AUTHOR_NAME\}\}/g, authorName)
      .replace(/\{\{AUTHOR_ROLE\}\}/g, authorInfo.role || '-')
      .replace(/\{\{SITE\}\}/g, this.site)
      .replace(/\{\{OWNER\}\}/g, this.owner)
      .replace(/\{\{FOOTER_NOTE\}\}/g, this.footerNote)
      .replace(/\{\{SUMMARY_CARDS\}\}/g, this.generateSummaryCards(summaryCards))
      .replace(/\{\{CONTENT\}\}/g, this.generateContentSections(sections) + customContent)
      .replace(/\{\{RECOMMENDATIONS\}\}/g, this.generateRecommendations(recommendations))
      .replace(/\{\{CUSTOM_CSS\}\}/g, customCSS)
      .replace(/2025 Vertem/g, `${currentYear} Vertem`); // Substituir ano dinamicamente

    return html;
  }

  /**
   * Gera relatório Markdown
   */
  async generateMarkdown(data) {
    const {
      title,
      summaryCards = [],
      sections = [],
      recommendations = [],
      customContent = ''
    } = data;

    const template = this.loadMarkdownTemplate();
    const reportDate = this.formatDate();
    const currentYear = new Date().getFullYear();

    // Substituir placeholders
    let markdown = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{REPORT_DATE\}\}/g, reportDate)
      .replace(/\{\{AUTHOR\}\}/g, this.author)
      .replace(/\{\{SITE\}\}/g, this.site)
      .replace(/\{\{OWNER\}\}/g, this.owner)
      .replace(/\{\{FOOTER_NOTE\}\}/g, this.footerNote)
      .replace(/\{\{SUMMARY\}\}/g, this.generateMarkdownSummary(summaryCards))
      .replace(/\{\{CONTENT\}\}/g, this.generateMarkdownContent(sections) + (customContent ? '\n\n' + customContent : ''))
      .replace(/\{\{RECOMMENDATIONS\}\}/g, this.generateMarkdownRecommendations(recommendations))
      .replace(/2025 Vertem/g, `${currentYear} Vertem`); // Substituir ano dinamicamente

    return markdown;
  }

  /**
   * Salva relatório HTML
   */
  async saveHTML(html, filename) {
    const filepath = path.join(this.reportsDir, filename);
    fs.writeFileSync(filepath, html, 'utf8');
    return filepath;
  }

  /**
   * Salva relatório Markdown
   */
  async saveMarkdown(markdown, filename) {
    const filepath = path.join(this.reportsDir, filename);
    fs.writeFileSync(filepath, markdown, 'utf8');
    return filepath;
  }

  /**
   * Gera e salva relatório HTML
   */
  async generateAndSaveHTML(data, filename) {
    const html = await this.generateHTML(data);
    const filepath = await this.saveHTML(html, filename);
    return filepath;
  }

  /**
   * Gera e salva relatório Markdown
   */
  async generateAndSaveMarkdown(data, filename) {
    const markdown = await this.generateMarkdown(data);
    const filepath = await this.saveMarkdown(markdown, filename);
    return filepath;
  }

  /**
   * Gera nome de arquivo com timestamp
   */
  generateFilename(prefix, extension = 'html') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${prefix}-${timestamp}.${extension}`;
  }

  /**
   * Gera navegação interna para relatórios multi-página
   */
  generateNavigationLinks(currentPage = 'index', basePath = '') {
    const pages = [
      { id: 'index', label: 'Início', file: 'index.html' },
      { id: 'visao-geral', label: 'Visão Geral', file: 'visao-geral.html' },
      { id: 'analise', label: 'Análise', file: 'analise.html' },
      { id: 'recomendacoes', label: 'Recomendações', file: 'recomendacoes.html' }
    ];

    return pages.map(page => {
      const href = currentPage === page.id ? '#' : (basePath ? `${basePath}/${page.file}` : page.file);
      const activeClass = currentPage === page.id ? 'active' : '';
      return `<a href="${href}" class="${activeClass}">${page.label}</a>`;
    }).join('\n                ');
  }

  /**
   * Gera estrutura multi-página de relatório
   */
  async generateMultiPageReport(data, reportName) {
    const {
      title,
      subtitle = '',
      summaryCards = [],
      sections = [],
      recommendations = [],
      customContent = '',
      context = '' // Contexto para página inicial
    } = data;

    // Criar pasta do relatório
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportDir = path.join(this.reportsDir, `${reportName}-${timestamp}`);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportDate = this.formatDate();
    const currentYear = new Date().getFullYear();
    const logoHeader = this.loadLogoHeader();
    const logoFooter = this.loadLogoFooter();
    const basePath = '.'; // Caminho relativo dentro da pasta

    // Página inicial (index.html)
    const indexHtml = this.generatePageHTML({
      title: title,
      subtitle: subtitle || 'Contexto do Relatório',
      reportDate: reportDate,
      logoHeader: logoHeader,
      logoFooter: logoFooter,
      currentPage: 'index',
      basePath: basePath,
      author: this.author,
      site: this.site,
      owner: this.owner,
      footerNote: this.footerNote,
      currentYear: currentYear,
      content: `
        <div class="section">
          <h2 class="section-title">📋 Contexto do Relatório</h2>
          <div class="content">
            ${context || '<p>Este relatório apresenta uma análise detalhada do sistema de monitoramento.</p>'}
          </div>
        </div>
        <div class="section">
          <h2 class="section-title">📊 Navegação</h2>
          <div class="content">
            <p>Utilize o menu de navegação no cabeçalho para acessar as diferentes seções do relatório:</p>
            <ul>
              <li><strong>Visão Geral:</strong> Resumo executivo e métricas principais</li>
              <li><strong>Análise:</strong> Análise detalhada dos dados coletados</li>
              <li><strong>Recomendações:</strong> Sugestões de melhorias e ações corretivas</li>
            </ul>
          </div>
        </div>
        ${this.generateSummaryCards(summaryCards)}
      `
    });

    // Página Visão Geral
    const visaoGeralHtml = this.generatePageHTML({
      title: `${title} - Visão Geral`,
      subtitle: 'Resumo Executivo',
      reportDate: reportDate,
      logoHeader: logoHeader,
      logoFooter: logoFooter,
      currentPage: 'visao-geral',
      basePath: basePath,
      author: this.author,
      site: this.site,
      owner: this.owner,
      footerNote: this.footerNote,
      currentYear: currentYear,
      content: `
        ${this.generateSummaryCards(summaryCards)}
        ${sections.map(section => `
          <div class="section">
            <h2 class="section-title">${section.title}</h2>
            <div class="content">
              ${section.content}
            </div>
          </div>
        `).join('')}
      `
    });

    // Página Análise
    const analiseHtml = this.generatePageHTML({
      title: `${title} - Análise`,
      subtitle: 'Análise Detalhada',
      reportDate: reportDate,
      logoHeader: logoHeader,
      logoFooter: logoFooter,
      currentPage: 'analise',
      basePath: basePath,
      author: this.author,
      site: this.site,
      owner: this.owner,
      footerNote: this.footerNote,
      currentYear: currentYear,
      content: `
        ${sections.map(section => `
          <div class="section">
            <h2 class="section-title">${section.title}</h2>
            <div class="content">
              ${section.content}
            </div>
          </div>
        `).join('')}
        ${customContent}
      `
    });

    // Página Recomendações
    const recomendacoesHtml = this.generatePageHTML({
      title: `${title} - Recomendações`,
      subtitle: 'Recomendações e Ações',
      reportDate: reportDate,
      logoHeader: logoHeader,
      logoFooter: logoFooter,
      currentPage: 'recomendacoes',
      basePath: basePath,
      author: this.author,
      site: this.site,
      owner: this.owner,
      footerNote: this.footerNote,
      currentYear: currentYear,
      content: this.generateRecommendations(recommendations)
    });

    // Salvar todas as páginas
    fs.writeFileSync(path.join(reportDir, 'index.html'), indexHtml, 'utf8');
    fs.writeFileSync(path.join(reportDir, 'visao-geral.html'), visaoGeralHtml, 'utf8');
    fs.writeFileSync(path.join(reportDir, 'analise.html'), analiseHtml, 'utf8');
    fs.writeFileSync(path.join(reportDir, 'recomendacoes.html'), recomendacoesHtml, 'utf8');

    return {
      directory: reportDir,
      index: path.join(reportDir, 'index.html'),
      pages: {
        index: path.join(reportDir, 'index.html'),
        visaoGeral: path.join(reportDir, 'visao-geral.html'),
        analise: path.join(reportDir, 'analise.html'),
        recomendacoes: path.join(reportDir, 'recomendacoes.html')
      }
    };
  }

  /**
   * Gera HTML de uma página individual
   */
  generatePageHTML(options) {
    const {
      title,
      subtitle,
      reportDate,
      logoHeader,
      logoFooter,
      currentPage,
      basePath,
      author,
      site,
      owner,
      footerNote,
      currentYear,
      content
    } = options;

    const template = this.loadHTMLTemplate();
    const navigationLinks = this.generateNavigationLinks(currentPage, basePath);

    return template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{HEADER_TITLE\}\}/g, title)
      .replace(/\{\{SUBTITLE\}\}/g, subtitle)
      .replace(/\{\{REPORT_DATE\}\}/g, reportDate)
      .replace(/\{\{LOGO_HEADER\}\}/g, logoHeader)
      .replace(/\{\{LOGO_FOOTER\}\}/g, logoFooter)
      .replace(/\{\{NAVIGATION_LINKS\}\}/g, navigationLinks)
      .replace(/\{\{AUTHOR\}\}/g, author)
      .replace(/\{\{SITE\}\}/g, site)
      .replace(/\{\{OWNER\}\}/g, owner)
      .replace(/\{\{FOOTER_NOTE\}\}/g, footerNote)
      .replace(/\{\{SUMMARY_CARDS\}\}/g, '')
      .replace(/\{\{CONTENT\}\}/g, content)
      .replace(/\{\{RECOMMENDATIONS\}\}/g, '')
      .replace(/2025 Vertem/g, `${currentYear} Vertem`);
  }

  /**
   * Carrega o template de apresentação
   */
  loadPresentationTemplate() {
    const templatePath = path.join(this.templatesDir, 'presentation-template.html');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template de apresentação não encontrado: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * Gera navegação para apresentação
   */
  generatePresentationNavigation(slides) {
    const navItems = slides.map((slide, index) => {
      const activeClass = index === 0 ? 'active' : '';
      return `<a href="#slide-${index}" class="${activeClass}" onclick="showSlide(${index}); return false;">${slide.title || `Slide ${index + 1}`}</a>`;
    });
    return navItems.join('\n                ');
  }

  /**
   * Gera HTML de um slide
   */
  generateSlideHTML(slide, index) {
    const slideType = slide.type || 'default';
    const slideId = `slide-${index}`;
    const title = slide.title || '';
    const subtitle = slide.subtitle || '';
    const content = slide.content || '';
    
    return `
        <div class="slide ${slideType}" id="${slideId}">
            ${title ? `<h1 class="slide-title">${title}</h1>` : ''}
            ${subtitle ? `<h2 class="slide-subtitle">${subtitle}</h2>` : ''}
            <div class="slide-content">
                ${content}
            </div>
        </div>
    `;
  }

  /**
   * Gera apresentação HTML
   */
  async generatePresentation(data) {
    const {
      title,
      subtitle = '',
      slides = [],
      author = this.author,
      site = this.site,
      owner = this.owner,
      footerNote = this.footerNote
    } = data;

    const template = this.loadPresentationTemplate();
    const logoHeader = this.loadLogoHeader();
    const logoFooter = this.loadLogoFooter();
    const reportDate = this.formatDate();
    const currentYear = new Date().getFullYear();
    const navigationLinks = this.generatePresentationNavigation(slides);
    
    // Gerar HTML dos slides
    const slidesHTML = slides.map((slide, index) => 
      this.generateSlideHTML(slide, index)
    ).join('\n');

    // Substituir placeholders
    let html = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{LOGO_HEADER\}\}/g, logoHeader)
      .replace(/\{\{LOGO_FOOTER\}\}/g, logoFooter)
      .replace(/\{\{NAVIGATION_LINKS\}\}/g, navigationLinks)
      .replace(/\{\{SLIDES\}\}/g, slidesHTML)
      .replace(/\{\{TOTAL_SLIDES\}\}/g, slides.length.toString())
      .replace(/\{\{AUTHOR\}\}/g, author)
      .replace(/\{\{REPORT_DATE\}\}/g, reportDate)
      .replace(/\{\{SITE\}\}/g, site)
      .replace(/\{\{OWNER\}\}/g, owner)
      .replace(/\{\{FOOTER_NOTE\}\}/g, footerNote)
      .replace(/2025 Vertem/g, `${currentYear} Vertem`);

    return html;
  }

  /**
   * Gera e salva apresentação
   */
  async generateAndSavePresentation(data, filename) {
    const html = await this.generatePresentation(data);
    const filepath = await this.saveHTML(html, filename);
    return filepath;
  }
}

// Exportar para uso como módulo
export default ReportGenerator;

// Se executado diretamente, mostrar exemplo de uso
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📊 Agente Gerador de Relatórios');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('Este módulo fornece uma classe ReportGenerator para gerar relatórios padronizados.\n');
  console.log('Exemplo de uso:\n');
  console.log(`
const ReportGenerator = require('./report-generator');

const generator = new ReportGenerator({
  author: 'Meu Agente',
  owner: 'Minha Empresa'
});

const data = {
  title: 'Relatório de Teste',
  subtitle: 'Exemplo de relatório',
  summaryCards: [
    { title: 'Total', value: '100', label: 'itens', severity: 'info' },
    { title: 'Críticos', value: '5', severity: 'critical' }
  ],
  sections: [
    {
      title: 'Detalhes',
      content: '<p>Conteúdo do relatório...</p>'
    }
  ],
  recommendations: [
    {
      severity: 'critical',
      category: 'Performance',
      title: 'Otimização Necessária',
      description: 'Descrição do problema',
      actions: ['Ação 1', 'Ação 2']
    }
  ]
};

// Gerar HTML
const html = await generator.generateHTML(data);
await generator.saveHTML(html, 'relatorio.html');

// Gerar Markdown
const markdown = await generator.generateMarkdown(data);
await generator.saveMarkdown(markdown, 'relatorio.md');
  `);
}

