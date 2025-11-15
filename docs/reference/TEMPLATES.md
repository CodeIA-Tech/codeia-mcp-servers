# Guia de Templates de Relatórios

Este documento descreve os templates disponíveis no sistema de geração de relatórios.

## Tipos de Templates Disponíveis

### 1. Default Template (`default`)
**Arquivo:** `report-template.html`

O template padrão com navegação fixa e estilo limpo.

**Características:**
- Fundo escuro na navegação (`#1a1a1a`)
- Links com destaque sutil
- Ideal para relatórios gerais e de acompanhamento

**Uso:**
```javascript
const generator = new ReportGenerator({
  title: 'Meu Relatório',
  templateType: 'default' // ou omita para usar o padrão
});
```

**Visual:**
- Hero: Fundo escuro (`#1a1a1a`)
- Links: Brancos com fundo semitransparente
- Link ativo: Azul com destaque

---

### 2. Executive Template (`executive`)
**Arquivo:** `executive-report-template.html`

Template para relatórios executivos e de alta gestão.

**Características:**
- Gradiente roxo elegante (`#667eea` → `#764ba2`)
- Links maiores e mais destacados
- Estilo premium e profissional

**Uso:**
```javascript
const generator = new ReportGenerator({
  title: 'Relatório Executivo - Q4 2024',
  templateType: 'executive',
  author: 'Diretor de Operações'
});
```

**Visual:**
- Hero: Gradiente roxo elegante
- Links: Bordas arredondadas, fontes maiores
- Link ativo: Fundo branco com texto roxo
- Efeito hover: Elevação com transform

**Seções Sugeridas:**
```javascript
NavigationHelper.generateExecutiveSections()
// - Resumo Executivo
// - Objetivos e Metas
// - Resultados Alcançados
// - Indicadores de Performance
// - Recomendações
```

---

### 3. Technical Template (`technical`)
**Arquivo:** `technical-report-template.html`

Template para relatórios técnicos e de infraestrutura.

**Características:**
- Estilo minimalista e técnico
- Fonte monoespaçada (Courier New)
- Verde fosforescente (`#27ae60`)

**Uso:**
```javascript
const generator = new ReportGenerator({
  title: 'Relatório Técnico - Infraestrutura AWS',
  templateType: 'technical',
  author: 'Equipe SRE'
});
```

**Visual:**
- Hero: Gradiente cinza escuro (`#2c3e50` → `#34495e`)
- Links: Verde com fonte monoespaçada
- Link ativo: Verde brilhante com glow
- Estilo: Terminal/Console

**Seções Sugeridas:**
```javascript
NavigationHelper.generateTechnicalSections()
// - Introdução
// - Arquitetura do Sistema
// - Detalhes de Implementação
// - Testes e Validação
// - Métricas Técnicas
// - Conclusão
```

---

### 4. Presentation Template (`presentation`)
**Arquivo:** `presentation-report-template.html`

Template para apresentações e relatórios visuais.

**Características:**
- Gradiente rosa vibrante (`#f093fb` → `#f5576c`)
- Links arredondados e grandes
- Efeitos visuais marcantes

**Uso:**
```javascript
const generator = new ReportGenerator({
  title: 'Apresentação - Resultados 2024',
  templateType: 'presentation',
  author: 'Marketing e Vendas'
});
```

**Visual:**
- Hero: Gradiente rosa-vermelho vibrante
- Links: Bordas totalmente arredondadas (border-radius: 25px)
- Link ativo: Branco com texto rosa, efeito scale
- Estilo: Moderno e impactante

---

## Navigation Helper

O `NavigationHelper` fornece funções auxiliares para criar navegação dinâmica.

### Gerar Links de Navegação

```javascript
import NavigationHelper from './navigation-helper.js';

const sections = [
  { id: 'intro', label: 'Introdução', shortLabel: 'Intro' },
  { id: 'dados', label: 'Análise de Dados', shortLabel: 'Dados' },
  { id: 'conclusao', label: 'Conclusão', shortLabel: 'Conclusão' }
];

const navigationLinks = NavigationHelper.generateNavigationLinks(sections);
```

### Gerar Seções com IDs

```javascript
const sections = [
  {
    id: 'intro',
    title: 'Introdução',
    icon: '📘',
    content: '<p>Conteúdo da introdução...</p>'
  }
];

const sectionsHTML = NavigationHelper.generateSections(sections);
```

### CSS Personalizado

```javascript
const customCSS = NavigationHelper.generateNavigationCSS({
  scrollMargin: '200px',
  linkFontSize: '1rem',
  activeBackground: 'rgba(255, 0, 0, 0.5)',
  hoverBackground: 'rgba(255, 255, 255, 0.3)'
});
```

---

## Exemplo Completo

### Relatório Executivo com Navegação

```javascript
import ReportGenerator from './report-generator.js';
import NavigationHelper from './navigation-helper.js';

// Criar gerador com template executivo
const generator = new ReportGenerator({
  title: 'Relatório Executivo Q4',
  author: 'João Silva (joao@vertem.com) - CFO',
  templateType: 'executive',
  owner: 'Vertem',
  site: 'https://vertem.com'
});

// Gerar navegação
const sections = NavigationHelper.generateExecutiveSections();
const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

// Gerar HTML
const html = await generator.generateHTML({
  title: 'Relatório Executivo Q4',
  subtitle: 'Outubro a Dezembro 2024',
  navigationLinks: navigationLinks,
  sections: [
    {
      title: 'Resumo Executivo',
      content: '<p>Crescimento de 25% no trimestre...</p>'
    },
    // ... mais seções
  ]
});

// Salvar
await fs.writeFile('relatorio-executivo.html', html);
```

### Relatório Técnico Personalizado

```javascript
const generator = new ReportGenerator({
  title: 'Análise de Performance - API Gateway',
  author: 'Equipe SRE',
  templateType: 'technical'
});

const sections = [
  { id: 'metricas', label: 'Métricas de Performance', shortLabel: 'Métricas' },
  { id: 'alertas', label: 'Alertas e Incidentes', shortLabel: 'Alertas' },
  { id: 'otimizacoes', label: 'Otimizações Aplicadas', shortLabel: 'Otimizações' }
];

const navigationLinks = NavigationHelper.generateNavigationLinks(sections);

const html = await generator.generateHTML({
  title: 'Análise de Performance',
  navigationLinks: navigationLinks,
  customContent: `
    <div class="report-section" id="metricas">
      <h2>📊 Métricas de Performance</h2>
      <pre><code>
        Latência p95: 120ms
        Throughput: 10k req/s
        Error Rate: 0.02%
      </code></pre>
    </div>
  `
});
```

---

## Customização Adicional

Você pode adicionar CSS personalizado via `customCSS`:

```javascript
const html = await generator.generateHTML({
  title: 'Meu Relatório',
  customCSS: `
    <style>
      .report-section {
        background: #f9f9f9;
        padding: 2rem;
        border-radius: 8px;
      }
      
      .custom-chart {
        max-width: 800px;
        margin: 2rem auto;
      }
    </style>
  `
});
```

---

## Recursos Automáticos

Todos os templates incluem:

✅ **Navegação fixa** - Hero permanece visível ao rolar
✅ **Scroll suave** - Animação ao clicar nos links
✅ **Destaque automático** - Link ativo muda conforme scroll
✅ **Labels dinâmicos** - Texto curto/completo nos links
✅ **Responsivo** - Adaptação automática para mobile
✅ **Logo da empresa** - Header e footer personalizados

---

## Escolhendo o Template Certo

| Tipo de Relatório | Template Recomendado |
|-------------------|----------------------|
| Acompanhamento geral | `default` |
| Apresentação para diretoria | `executive` |
| Análise de infraestrutura | `technical` |
| Apresentação comercial | `presentation` |
| Relatório de incidentes | `technical` |
| Resultados financeiros | `executive` |
| Dashboard de métricas | `default` ou `technical` |

---

## Próximos Passos

1. **Explore os exemplos** em `scripts/example-using-report-generator.js`
2. **Teste os templates** gerando relatórios de exemplo
3. **Personalize** adicionando seu próprio CSS e conteúdo
4. **Crie templates** novos baseados nos existentes

Para mais informações, consulte:
- `README-REPORT-GENERATOR.md` - Guia básico
- `rules/reports/report-generator.md` - Documentação do agente
- `AGENTES.md` - Lista de todos os agentes

