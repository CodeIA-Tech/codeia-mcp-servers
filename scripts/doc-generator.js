#!/usr/bin/env node
/**
 * Documentation Generator
 * 
 * Gerador de documentação padronizada em Markdown
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocGenerator {
  constructor(options = {}) {
    this.templatesDir = options.templatesDir || path.join(__dirname, '..', 'templates');
    this.docsDir = options.docsDir || path.join(__dirname, '..', 'docs');
    this.owner = options.owner || 'Vertem';
    this.teamEmail = options.teamEmail || 'sre@vertem.com';
    this.teamSlack = options.teamSlack || '#sre-team';
    this.site = options.site || 'https://vertem.com';
  }

  /**
   * Carrega template Markdown
   */
  loadTemplate() {
    const templatePath = path.join(this.templatesDir, 'doc-template.md');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }
    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Formata data
   */
  formatDate(date = new Date()) {
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Gera índice baseado em seções
   */
  generateTableOfContents(sections) {
    return sections.map((section, idx) => {
      const anchor = section.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      return `- [${idx + 1}. ${section}](#${idx + 1}-${anchor})`;
    }).join('\n');
  }

  /**
   * Gera documentação
   */
  generateDoc(data) {
    const {
      title,
      version = '1.0.0',
      author = 'Equipe SRE - Vertem',
      status = 'Ativo',
      objective,
      scope,
      sections = [],
      tableOfContents = null,
      customContent = {}
    } = data;

    const template = this.loadTemplate();
    const date = this.formatDate();
    const toc = tableOfContents || this.generateTableOfContents(sections);

    // Substituir placeholders
    let doc = template
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{VERSION\}\}/g, version)
      .replace(/\{\{DATE\}\}/g, date)
      .replace(/\{\{AUTHOR\}\}/g, author)
      .replace(/\{\{STATUS\}\}/g, status)
      .replace(/\{\{TABLE_OF_CONTENTS\}\}/g, toc)
      .replace(/\{\{OBJECTIVE\}\}/g, objective || '')
      .replace(/\{\{SCOPE\}\}/g, scope || '')
      .replace(/\{\{OWNER\}\}/g, this.owner)
      .replace(/\{\{TEAM_EMAIL\}\}/g, this.teamEmail)
      .replace(/\{\{TEAM_SLACK\}\}/g, this.teamSlack)
      .replace(/\{\{TEAM_SITE\}\}/g, this.site)
      .replace(/\{\{LAST_UPDATE\}\}/g, date);

    // Substituir custom content
    Object.keys(customContent).forEach(key => {
      const placeholder = `{{${key}}}`;
      doc = doc.replace(new RegExp(placeholder, 'g'), customContent[key]);
    });

    return doc;
  }

  /**
   * Salva documentação
   */
  async saveDoc(content, filename) {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }

    const filepath = path.join(this.docsDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`✅ Documentação salva: ${filepath}`);
    return filepath;
  }

  /**
   * Templates predefinidos
   */
  static templates = {
    /**
     * Template de SOP (Standard Operating Procedure)
     */
    sop: {
      sections: [
        'Objetivo',
        'Escopo',
        'Pré-requisitos',
        'Procedimento',
        'Validação',
        'Rollback',
        'Troubleshooting',
        'Responsabilidades'
      ]
    },

    /**
     * Template de Runbook
     */
    runbook: {
      sections: [
        'Visão Geral',
        'Pré-requisitos',
        'Arquitetura',
        'Procedimentos de Operação',
        'Troubleshooting',
        'Escalação',
        'Logs e Monitoramento',
        'Contatos'
      ]
    },

    /**
     * Template de Policy
     */
    policy: {
      sections: [
        'Objetivo',
        'Escopo',
        'Política',
        'Procedimentos',
        'Responsabilidades',
        'Exceções',
        'Conformidade',
        'Revisão'
      ]
    },

    /**
     * Template de Arquitetura
     */
    architecture: {
      sections: [
        'Visão Geral',
        'Requisitos',
        'Componentes',
        'Fluxo de Dados',
        'Segurança',
        'Escalabilidade',
        'Monitoramento',
        'Disaster Recovery'
      ]
    }
  };
}

export default DocGenerator;

