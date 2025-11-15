# 🏗️ Gerador de Diagramas de Arquitetura

Sistema automatizado para gerar diagramas de arquitetura a partir do Datadog APM, integrado com [draw.io (diagrams.net)](https://app.diagrams.net/).

## 🎯 Funcionalidades

✅ **Coleta automática** de serviços, databases, caches e dependências do Datadog APM  
✅ **Geração de diagramas** em múltiplos formatos (HTML5, SVG, draw.io)  
✅ **Integração com draw.io** - edite os diagramas online  
✅ **Diagrama interativo** em HTML5 com estatísticas  
✅ **Download direto** de SVG e arquivo draw.io  
✅ **Classificação automática** de componentes (serviços, databases, caches, queues)

---

## 📋 Pré-requisitos

### 1. Variáveis de Ambiente

Configure suas credenciais do Datadog:

```bash
export DD_API_KEY="sua-datadog-api-key"
export DD_APP_KEY="sua-datadog-application-key"
```

### 2. APM Instrumentado

Certifique-se de que seus serviços estão instrumentados com Datadog APM e enviando traces.

---

## 🚀 Uso Básico

### Gerar diagrama do ambiente de produção:

```bash
node scripts/generate-architecture-diagram.js prod
```

### Gerar diagrama de outro ambiente:

```bash
node scripts/generate-architecture-diagram.js staging
```

### Resultado:

```
diagrams/
├── architecture-prod.html      # HTML5 interativo
├── architecture-prod.drawio    # Arquivo editável no draw.io
├── architecture-prod.svg       # SVG standalone
└── architecture-prod.json      # Dados brutos da arquitetura
```

---

## 📖 Exemplos de Uso

### Exemplo 1: Gerar e Visualizar

```bash
# Gerar diagrama
node scripts/generate-architecture-diagram.js prod

# Abrir HTML no navegador
open diagrams/architecture-prod.html
# ou
xdg-open diagrams/architecture-prod.html
```

### Exemplo 2: Usar Programaticamente

```javascript
import DatadogAPMHelper from './scripts/datadog-apm-helper.js';
import DiagramGenerator from './scripts/diagram-generator.js';

// 1. Coletar dados do APM
const apmHelper = new DatadogAPMHelper({
  apiKey: 'sua-api-key',
  appKey: 'sua-app-key'
});

const architecture = await apmHelper.generateArchitecture('prod');

// 2. Gerar diagrama
const diagramGen = new DiagramGenerator();
await diagramGen.saveDiagram(architecture, 'meu-diagrama.html', 'html');
```

### Exemplo 3: Integrar com Relatórios

```javascript
import ReportGenerator from './scripts/report-generator.js';
import DatadogAPMHelper from './scripts/datadog-apm-helper.js';
import DiagramGenerator from './scripts/diagram-generator.js';

// Gerar arquitetura
const apmHelper = new DatadogAPMHelper();
const architecture = await apmHelper.generateArchitecture('prod');

// Gerar SVG do diagrama
const diagramGen = new DiagramGenerator();
const svg = diagramGen.generateSVG(architecture);

// Incluir no relatório
const generator = new ReportGenerator({
  templateType: 'technical'
});

const html = await generator.generateHTML({
  title: 'Relatório de Arquitetura',
  customContent: `
    <div class="report-section" id="arquitetura">
      <h2>🏗️ Arquitetura de Serviços</h2>
      ${svg}
    </div>
  `
});
```

---

## 🎨 Formatos de Saída

### 1. HTML5 Interativo

**Arquivo:** `architecture-{env}.html`

- Diagrama SVG embutido
- Estatísticas de componentes
- Botões para download (SVG, draw.io)
- Link direto para editar no draw.io
- Legenda de cores

**Abrir:**
```bash
open diagrams/architecture-prod.html
```

---

### 2. Draw.io (XML)

**Arquivo:** `architecture-{env}.drawio`

Arquivo compatível com [draw.io](https://app.diagrams.net/) para edição.

**Como editar:**

1. Acesse https://app.diagrams.net/
2. File → Open from → Device
3. Selecione o arquivo `.drawio`
4. Edite e exporte

**Ou use o botão no HTML:**
- Abra o HTML gerado
- Clique em "📝 Editar no draw.io"

---

### 3. SVG Standalone

**Arquivo:** `architecture-{env}.svg`

Imagem vetorial para incluir em documentos, apresentações, wikis, etc.

**Usar:**
```html
<img src="diagrams/architecture-prod.svg" alt="Arquitetura">
```

---

### 4. JSON (Dados Brutos)

**Arquivo:** `architecture-{env}.json`

Dados estruturados da arquitetura para processamento adicional.

```json
{
  "services": [...],
  "databases": [...],
  "caches": [...],
  "queues": [...],
  "dependencies": [...]
}
```

---

## 🎨 Classificação de Componentes

O sistema identifica automaticamente o tipo de cada componente:

| Tipo | Identificação | Cor | Forma |
|------|--------------|-----|-------|
| **Serviço** | Aplicações, APIs | 🔵 Azul | Retângulo arredondado |
| **Database** | postgres, mysql, mongodb, sql | 🔴 Vermelho | Cilindro |
| **Cache** | redis, memcache | 🟠 Laranja | Hexágono |
| **Queue** | kafka, rabbitmq, sqs | 🟢 Verde | Paralelogramo |
| **External** | APIs externas, third-party | 🟣 Roxo | Retângulo |

---

## 🔧 Personalização

### Ajustar Tamanho do Diagrama

```javascript
const diagramGen = new DiagramGenerator({
  width: 1600,    // Largura
  height: 1200    // Altura
});
```

### Customizar Cores

Edite `diagram-generator.js`:

```javascript
createServiceCell(id, name, x, y, '#SEU_COR')
```

### Adicionar Novos Tipos

Edite `identifyServiceType()` em `datadog-apm-helper.js`:

```javascript
if (name.includes('elasticsearch')) {
  return 'search_engine';
}
```

---

## 📊 Estrutura de Dados

### Architecture Object

```javascript
{
  services: [
    {
      id: 'service-id',
      name: 'api-gateway',
      type: 'service',
      language: 'python',
      env: 'prod'
    }
  ],
  databases: [
    {
      id: 'db-id',
      name: 'postgres-main',
      type: 'database',
      env: 'prod'
    }
  ],
  dependencies: [
    {
      from: 'api-gateway',
      to: 'postgres-main',
      type: 'http'
    }
  ]
}
```

---

## 🔌 Integração com Relatórios

### Incluir Diagrama em Relatório HTML

```javascript
import ReportGenerator from './scripts/report-generator.js';
import DiagramGenerator from './scripts/diagram-generator.js';
import fs from 'fs/promises';

// Ler arquitetura salva
const architecture = JSON.parse(
  await fs.readFile('diagrams/architecture-prod.json', 'utf-8')
);

// Gerar SVG
const diagramGen = new DiagramGenerator();
const svg = diagramGen.generateSVG(architecture);

// Criar relatório
const generator = new ReportGenerator({
  templateType: 'technical'
});

const html = await generator.generateHTML({
  title: 'Documentação de Arquitetura',
  customContent: `
    <div class="report-section">
      <h2>🏗️ Visão Geral da Arquitetura</h2>
      <div class="diagram-embed">
        ${svg}
      </div>
      
      <h3>Componentes Principais</h3>
      <ul>
        <li><strong>Serviços:</strong> ${architecture.services.length}</li>
        <li><strong>Databases:</strong> ${architecture.databases.length}</li>
        <li><strong>Caches:</strong> ${architecture.caches.length}</li>
      </ul>
    </div>
  `
});
```

---

## 🛠️ API Reference

### DatadogAPMHelper

```javascript
const apmHelper = new DatadogAPMHelper({
  apiKey: 'dd-api-key',
  appKey: 'dd-app-key',
  site: 'datadoghq.com'  // ou datadoghq.eu
});

// Listar serviços
const services = await apmHelper.listServices('prod');

// Obter dependências
const deps = await apmHelper.getServiceDependencies('my-service', 'prod');

// Gerar arquitetura completa
const architecture = await apmHelper.generateArchitecture('prod');

// Exportar como JSON
await apmHelper.exportArchitecture('prod', 'output.json');
```

### DiagramGenerator

```javascript
const diagramGen = new DiagramGenerator({
  width: 1200,
  height: 800
});

// Gerar mxGraph (draw.io XML)
const xml = diagramGen.generateMxGraph(architecture);

// Gerar SVG
const svg = diagramGen.generateSVG(architecture);

// Gerar HTML5 completo
const html = diagramGen.generateHTML(architecture, 'Título');

// Salvar em arquivo
await diagramGen.saveDiagram(architecture, 'output.html', 'html');
await diagramGen.saveDiagram(architecture, 'output.drawio', 'drawio');
await diagramGen.saveDiagram(architecture, 'output.svg', 'svg');
```

---

## 🌐 Recursos do draw.io

### Editar Online

1. Abra o HTML gerado
2. Clique em "📝 Editar no draw.io"
3. Edite o diagrama
4. File → Export as → SVG/PNG/PDF

### Editar Localmente

1. Baixe o arquivo `.drawio`
2. Acesse https://app.diagrams.net/
3. File → Open from → Device
4. Selecione o arquivo

### Embed em Sites

```html
<iframe 
  src="https://app.diagrams.net/?embed=1&ui=min&url=URL_DO_SEU_ARQUIVO"
  width="100%" 
  height="600px">
</iframe>
```

---

## 💡 Dicas

1. **Atualize regularmente** - Execute o script periodicamente para manter os diagramas atualizados
2. **Versionamento** - Salve os arquivos `.drawio` no Git para histórico
3. **Automação** - Integre com CI/CD para gerar diagramas automaticamente
4. **Documentação** - Use os diagramas em wikis, READMEs e documentação técnica

---

## 🔍 Troubleshooting

### "DD_API_KEY não encontrado"

Configure as variáveis de ambiente:
```bash
export DD_API_KEY="sua-api-key"
export DD_APP_KEY="sua-app-key"
```

### "Nenhum serviço encontrado"

Verifique:
1. APM está instrumentado?
2. Ambiente correto? (`prod`, `staging`)
3. Credenciais corretas?

### "Diagrama vazio"

Pode ser que:
1. Não há dependências mapeadas no APM
2. Serviços não estão enviando traces
3. Filtro de ambiente não encontrou serviços

---

## 📚 Recursos Adicionais

- [Datadog APM Documentation](https://docs.datadoghq.com/tracing/)
- [draw.io Documentation](https://www.diagrams.net/doc/)
- [mxGraph Format](https://jgraph.github.io/mxgraph/)

---

**Desenvolvido com ❤️ pela Equipe Vertem**

