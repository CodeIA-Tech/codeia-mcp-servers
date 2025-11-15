# 📊 Agente Gerador de Relatórios

## Visão Geral

O **Agente Gerador de Relatórios** é um módulo padronizado para criação de relatórios HTML5 e Markdown que pode ser usado por todos os agentes do sistema para manter consistência visual e estrutural.

## 🚀 Início Rápido

### Instalação

Não requer instalação - é um módulo Node.js nativo.

### Uso Básico

```javascript
const ReportGenerator = require('./scripts/report-generator');

const generator = new ReportGenerator({
  author: 'Meu Agente',
  owner: 'Codeia Tech'
});

const data = {
  title: 'Meu Relatório',
  summaryCards: [
    { title: 'Total', value: '100', severity: 'info' }
  ],
  sections: [
    { title: 'Detalhes', content: '<p>Conteúdo...</p>' }
  ]
};

await generator.generateAndSaveHTML(data, 'relatorio.html');
```

## 📁 Estrutura

```
codeia-mcp-servers/
├── scripts/
│   ├── report-generator.js          # Módulo principal
│   └── example-using-report-generator.js  # Exemplo de uso
├── templates/
│   ├── report-template.html         # Template HTML5
│   ├── report-template.md           # Template Markdown
│   └── logos/
│       └── vertem.png               # Logo padrão
├── rules/
│   └── reports/
│       └── report-generator.md      # Documentação completa
└── reports/                         # Relatórios gerados
```

## 🎯 Características

### Templates Padronizados
- **HTML5**: Design responsivo e moderno
- **Markdown**: Formato simples e legível
- **Consistência**: Mesmo padrão visual em todos os relatórios

### Componentes Disponíveis
- **Summary Cards**: Cards de resumo com severidades
- **Sections**: Seções de conteúdo flexíveis
- **Recommendations**: Recomendações com ações
- **Footer**: Informações padronizadas (autor, data, site, proprietário)

### Severidades
- `critical`: Vermelho - Problemas críticos
- `warning`: Amarelo - Avisos
- `info`: Azul - Informações gerais
- `success`: Verde - Status positivo

## 📖 Documentação Completa

Consulte `rules/reports/report-generator.md` para:
- API completa
- Exemplos detalhados
- Padrões e convenções
- Integração com outros agentes

## 🔧 Exemplos

### Exemplo 1: Relatório Simples

```javascript
const ReportGenerator = require('./scripts/report-generator');

const generator = new ReportGenerator();

const data = {
  title: 'Relatório de Status',
  summaryCards: [
    { title: 'Status', value: 'OK', severity: 'success' }
  ]
};

await generator.generateAndSaveHTML(data, 'status.html');
```

### Exemplo 2: Relatório Completo

```javascript
const generator = new ReportGenerator({
  author: 'Datadog Agent'
});

const data = {
  title: 'Análise de Performance',
  subtitle: 'Últimas 24 horas',
  summaryCards: [
    { title: 'Uptime', value: '99.9%', severity: 'success' },
    { title: 'Alertas', value: '3', severity: 'critical' }
  ],
  sections: [
    {
      title: 'Métricas',
      content: '<p>Análise detalhada...</p>'
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

const filename = generator.generateFilename('performance', 'html');
await generator.generateAndSaveHTML(data, filename);
```

## 🔗 Integração com Outros Agentes

Qualquer agente pode usar o ReportGenerator:

```javascript
// No script do seu agente
const ReportGenerator = require('../report-generator');

// ... coletar dados ...

const generator = new ReportGenerator({
  author: 'Nome do Seu Agente'
});

// ... preparar dados ...

await generator.generateAndSaveHTML(data, filename);
```

## 📝 Boas Práticas

1. **Sempre use o ReportGenerator** para relatórios padronizados
2. **Mantenha consistência** nos títulos e categorias
3. **Use severidades apropriadas** (critical, warning, info, success)
4. **Inclua ações acionáveis** nas recomendações
5. **Documente** customizações necessárias

## 🆘 Suporte

- Documentação: `rules/reports/report-generator.md`
- Exemplo: `scripts/example-using-report-generator.js`
- Templates: `templates/report-template.html` e `templates/report-template.md`

