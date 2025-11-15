# 🎨 Sistema de Templates de Relatórios

Sistema completo de templates para geração de relatórios HTML5 com navegação dinâmica.

## ✨ Características

- **4 templates especializados** para diferentes tipos de relatórios
- **Navegação fixa (sticky)** que acompanha o scroll
- **Links dinâmicos** com texto curto/completo
- **Highlight automático** da seção ativa
- **Scroll suave** entre seções
- **Totalmente responsivo** para mobile e desktop

## 🎯 Templates Disponíveis

### 1. 📄 Default (Padrão)
**Arquivo:** `report-template.html`

Ideal para relatórios gerais e de acompanhamento.

```javascript
const generator = new ReportGenerator({
  title: 'Meu Relatório',
  templateType: 'default'
});
```

**Visual:** Fundo escuro (`#1a1a1a`), estilo limpo e profissional.

---

### 2. 👔 Executive (Executivo)
**Arquivo:** `executive-report-template.html`

Para relatórios executivos e de alta gestão.

```javascript
const generator = new ReportGenerator({
  title: 'Relatório Executivo Q4',
  templateType: 'executive'
});
```

**Visual:** Gradiente roxo elegante, links destacados, estilo premium.

---

### 3. ⚙️ Technical (Técnico)
**Arquivo:** `technical-report-template.html`

Para relatórios técnicos e de infraestrutura.

```javascript
const generator = new ReportGenerator({
  title: 'Análise Técnica - Performance',
  templateType: 'technical'
});
```

**Visual:** Estilo terminal com fonte monoespaçada, verde fosforescente.

---

### 4. 🎨 Presentation (Apresentação)
**Arquivo:** `presentation-report-template.html`

Para apresentações e relatórios visuais.

```javascript
const generator = new ReportGenerator({
  title: 'Apresentação - Resultados 2024',
  templateType: 'presentation'
});
```

**Visual:** Gradiente rosa vibrante, links arredondados, estilo moderno.

---

## 🚀 Início Rápido

### Exemplo Básico

```javascript
import ReportGenerator from './scripts/report-generator.js';
import NavigationHelper from './scripts/navigation-helper.js';

// 1. Criar o gerador com o template desejado
const generator = new ReportGenerator({
  title: 'Meu Relatório',
  author: 'Seu Nome',
  templateType: 'executive' // ou: default, technical, presentation
});

// 2. Gerar navegação
const sections = [
  { id: 'intro', label: 'Introdução', shortLabel: 'Intro' },
  { id: 'dados', label: 'Análise de Dados', shortLabel: 'Dados' }
];
const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

// 3. Gerar HTML
const html = await generator.generateHTML({
  title: 'Meu Relatório',
  navigationLinks: navigationLinks,
  customContent: `
    <div class="report-section" id="intro">
      <h2>📘 Introdução</h2>
      <p>Conteúdo aqui...</p>
    </div>
  `
});

// 4. Salvar
await fs.writeFile('relatorio.html', html);
```

---

## 📚 Navigation Helper

### Gerar Links

```javascript
NavigationHelper.generateNavigationLinks(sections)
```

### Seções Predefinidas

```javascript
// Para relatórios executivos
NavigationHelper.generateExecutiveSections()

// Para relatórios técnicos
NavigationHelper.generateTechnicalSections()

// Para relatórios de acompanhamento
NavigationHelper.generateTrackingSections()
```

### Gerar Seções HTML

```javascript
const sections = [
  {
    id: 'intro',
    title: 'Introdução',
    icon: '📘',
    content: '<p>Seu conteúdo...</p>'
  }
];

NavigationHelper.generateSections(sections)
```

---

## 🧪 Testar os Templates

Execute o script de exemplos:

```bash
node scripts/example-templates.js
```

Isso irá gerar 4 arquivos HTML em `reports/`:
- `example-default.html`
- `example-executive.html`
- `example-technical.html`
- `example-presentation.html`

Abra os arquivos no navegador para ver cada template em ação.

---

## 📖 Documentação Completa

Para um guia detalhado com todos os recursos e opções:

📄 **[docs/TEMPLATES.md](docs/TEMPLATES.md)**

Inclui:
- Características detalhadas de cada template
- Exemplos avançados de uso
- Customização de CSS
- Guia de escolha do template certo

---

## 🎯 Quando Usar Cada Template?

| Situação | Template |
|----------|----------|
| Acompanhamento semanal | `default` |
| Apresentação para diretoria | `executive` |
| Análise de infraestrutura | `technical` |
| Apresentação comercial | `presentation` |
| Relatório de incidentes | `technical` |
| Resultados financeiros | `executive` |

---

## 💡 Dicas

1. **Use seções com IDs** para aproveitar a navegação automática
2. **Aproveite os helpers** do NavigationHelper para economizar tempo
3. **Customize com CSS** através do parâmetro `customCSS`
4. **Teste responsividade** - todos os templates são mobile-friendly

---

## 📁 Estrutura de Arquivos

```
├── scripts/
│   ├── report-generator.js      # Gerador principal
│   ├── navigation-helper.js     # Helper de navegação
│   └── example-templates.js     # Exemplos de uso
├── templates/
│   ├── report-template.html             # Template default
│   ├── executive-report-template.html   # Template executivo
│   ├── technical-report-template.html   # Template técnico
│   └── presentation-report-template.html # Template apresentação
├── docs/
│   └── TEMPLATES.md             # Documentação completa
└── reports/
    └── (relatórios gerados)
```

---

## 🆘 Suporte

Dúvidas ou problemas? Consulte:
1. `docs/TEMPLATES.md` - Documentação completa
2. `scripts/example-templates.js` - Exemplos práticos
3. `README-REPORT-GENERATOR.md` - Guia básico do Report Generator

---

**Desenvolvido com ❤️ pela Equipe Vertem**

