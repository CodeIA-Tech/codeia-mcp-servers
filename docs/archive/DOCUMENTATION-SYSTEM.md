# 📚 Sistema de Documentação Padronizada - Vertem

Sistema completo para criar e manter documentação técnica padronizada com identidade Vertem.

---

## ✨ Características

- 📝 **Templates reutilizáveis** em Markdown
- 🎯 **4 tipos de documentação** (SOP, Runbook, Policy, Architecture)
- 🏢 **Identidade Vertem** (logo, contatos, padrão visual)
- ⚡ **Geração automatizada** via scripts
- 🔄 **Versionamento** integrado
- 📊 **Estrutura consistente** em todos os docs

---

## 📖 Documentação Já Criada

### 1. Priorização de Alertas
**Arquivo:** `docs/PRIORIZACAO-ALERTAS.md`

Guia completo de priorização de alertas para a Vertem.

**Conteúdo:**
- 5 níveis de severidade (P1-P5)
- Matriz de priorização (Impacto x Urgência)
- SLAs por prioridade
- Critérios de classificação
- Fluxo de escalação
- Exemplos práticos
- Responsabilidades

**Visualizar:**
```bash
cat docs/PRIORIZACAO-ALERTAS.md
# ou
code docs/PRIORIZACAO-ALERTAS.md
```

---

## 🎨 Templates Disponíveis

### 1. SOP (Standard Operating Procedure)
**Uso:** Procedimentos operacionais padrão

**Seções:**
- Objetivo
- Escopo
- Pré-requisitos
- Procedimento (passo a passo)
- Validação
- Rollback
- Troubleshooting
- Responsabilidades

**Exemplo:**
```bash
node scripts/example-doc-generator.js
# Gera: docs/SOP-DEPLOY-PRODUCAO.md
```

---

### 2. Runbook
**Uso:** Guias de troubleshooting e operação

**Seções:**
- Visão Geral
- Pré-requisitos
- Arquitetura
- Procedimentos de Operação
- Troubleshooting
- Escalação
- Logs e Monitoramento
- Contatos

**Exemplo:**
```bash
node scripts/example-doc-generator.js
# Gera: docs/RUNBOOK-API-GATEWAY.md
```

---

### 3. Policy
**Uso:** Políticas e diretrizes organizacionais

**Seções:**
- Objetivo
- Escopo
- Política
- Procedimentos
- Responsabilidades
- Exceções
- Conformidade
- Revisão

---

### 4. Architecture
**Uso:** Documentação de arquitetura técnica

**Seções:**
- Visão Geral
- Requisitos
- Componentes
- Fluxo de Dados
- Segurança
- Escalabilidade
- Monitoramento
- Disaster Recovery

---

## 🚀 Como Usar

### Criar Nova Documentação

```javascript
import DocGenerator from './scripts/doc-generator.js';

const generator = new DocGenerator({
  owner: 'Vertem',
  teamEmail: 'sre@vertem.com',
  teamSlack: '#sre-team'
});

const doc = generator.generateDoc({
  title: 'Minha Documentação',
  version: '1.0.0',
  author: 'Seu Nome',
  objective: 'Objetivo do documento',
  scope: 'Escopo de aplicação',
  customContent: {
    MAIN_SECTION_TITLE: 'Seção Principal',
    MAIN_CONTENT: 'Conteúdo aqui...'
  }
});

await generator.saveDoc(doc, 'MINHA-DOC.md');
```

---

## 📋 Estrutura Padrão Vertem

Todas as documentações seguem esta estrutura:

```markdown
# Título

**Versão:** X.X.X
**Data:** Mês Ano
**Autor:** Nome/Time
**Status:** Ativo/Rascunho/Deprecated

---

## Índice
(gerado automaticamente)

---

## Seções
(conforme tipo de documento)

---

## Responsabilidades
(times envolvidos)

---

## Referências
(links úteis)

---

## Histórico de Versões
(controle de mudanças)

---

## Contatos
(informações da Vertem)
```

---

## 🎯 Padrões Visuais Vertem

### Emojis por Seção

| Seção | Emoji | Uso |
|-------|-------|-----|
| Objetivo | 🎯 | Início, metas |
| Escopo | 📋 | Abrangência |
| Procedimento | 📝 | Passos, instruções |
| Alerta | 🚨⚠️ | Avisos importantes |
| Sucesso | ✅ | Validações, checks |
| Erro | ❌ | Problemas, falhas |
| Informação | ℹ️💡 | Dicas, notas |
| Segurança | 🔒 | Security-related |
| Monitoramento | 📊 | Métricas, dashboards |
| Contato | 📞📧 | Comunicação |

### Níveis de Prioridade

```markdown
🔴 P1 - CRÍTICO
🟠 P2 - ALTO  
🟡 P3 - MÉDIO
🟢 P4 - BAIXO
⚪ P5 - INFORMATIVO
```

### Checkboxes

```markdown
- [ ] Tarefa pendente
- [x] Tarefa concluída
```

### Code Blocks

```markdown
\`\`\`bash
# Comandos shell
kubectl get pods
\`\`\`

\`\`\`javascript
// Código JavaScript
const x = 10;
\`\`\`
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Criar SOP de Backup

```javascript
const doc = generator.generateDoc({
  title: 'SOP - Backup de Databases',
  objective: 'Procedimento para backup de databases críticos',
  customContent: {
    MAIN_SECTION_TITLE: 'Procedimento',
    MAIN_CONTENT: `
### Pré-requisitos
- [ ] Acesso ao AWS Console
- [ ] Credenciais do RDS

### Passos
1. Acessar RDS Console
2. Selecionar database
3. Criar snapshot manual
4. Validar snapshot criado
`
  }
});
```

### Exemplo 2: Criar Runbook

```javascript
const doc = generator.generateDoc({
  title: 'Runbook - Redis ElastiCache',
  objective: 'Troubleshooting de problemas no Redis',
  customContent: {
    MAIN_SECTION_TITLE: 'Troubleshooting',
    MAIN_CONTENT: `
### Problema: Alta Latência

**Diagnóstico:**
\`\`\`bash
redis-cli --latency
\`\`\`

**Solução:**
1. Verificar CPU do node
2. Analisar slow logs
3. Considerar scaling
`
  }
});
```

---

## 🔄 Processo de Revisão

### Frequências Recomendadas

| Tipo de Doc | Frequência | Responsável |
|-------------|-----------|-------------|
| **SOP** | Trimestral | Coordenador + Time |
| **Runbook** | Mensal | Time SRE |
| **Policy** | Semestral | Gerência |
| **Architecture** | Por mudança | Arquiteto + SRE |

### Workflow de Atualização

```
1. Identificar necessidade de atualização
   ↓
2. Criar branch: docs/update-nome-doc
   ↓
3. Atualizar documento
   ↓
4. Incrementar versão
   ↓
5. Code review
   ↓
6. Merge para main
   ↓
7. Comunicar mudanças
```

---

## 📁 Organização de Arquivos

### Estrutura Recomendada

```
docs/
├── PRIORIZACAO-ALERTAS.md
├── SOP-DEPLOY-PRODUCAO.md
├── SOP-BACKUP-DATABASE.md
├── RUNBOOK-API-GATEWAY.md
├── RUNBOOK-REDIS.md
├── POLICY-SEGURANCA.md
├── ARCHITECTURE-SISTEMA-XYZ.md
└── README.md
```

### Nomenclatura

**Padrão:** `TIPO-NOME-DESCRITIVO.md`

**Exemplos:**
- ✅ `SOP-DEPLOY-PRODUCAO.md`
- ✅ `RUNBOOK-TROUBLESHOOT-K8S.md`
- ✅ `POLICY-ACESSO-PRODUCAO.md`
- ❌ `documento1.md`
- ❌ `sop.md`
- ❌ `Deploy.md`

---

## 💡 Dicas e Boas Práticas

### 1. Seja Específico
- ✅ "Deploy de API Node.js em ECS"
- ❌ "Deploy de aplicação"

### 2. Use Checklists
```markdown
### Pré-Deploy
- [ ] Tests passing
- [ ] Review approved
- [ ] Backup created
```

### 3. Inclua Comandos Reais
```bash
# Verificar status do pod
kubectl get pods -n production

# Ver logs
kubectl logs pod-name --tail=100
```

### 4. Adicione Diagramas
```markdown
![Arquitetura](../diagrams/architecture.svg)

Ou use mermaid:
\`\`\`mermaid
graph LR
  A[Cliente] --> B[API Gateway]
  B --> C[Application]
  C --> D[Database]
\`\`\`
```

### 5. Links para Recursos
```markdown
**Dashboards:**
- [Dashboard Produção](https://app.datadoghq.com/dashboard/xxx)
- [Logs](https://app.datadoghq.com/logs)

**Runbooks relacionados:**
- [Troubleshoot Database](./RUNBOOK-DATABASE.md)
```

---

## 🆘 Troubleshooting

### "Template não encontrado"

**Solução:**
```bash
# Verificar se template existe
ls -l templates/doc-template.md

# Se não existir, criar
node scripts/example-doc-generator.js
```

### "Placeholders não substituídos"

**Solução:** Certifique-se de passar todos os `customContent` necessários:
```javascript
customContent: {
  MAIN_SECTION_TITLE: 'Seu título',
  MAIN_CONTENT: 'Seu conteúdo',
  // ... outros placeholders
}
```

---

## 📖 Documentação Relacionada

- **PRIORIZACAO-ALERTAS.md** - Guia de priorização de alertas
- **docs/TEMPLATES.md** - Templates de relatórios HTML
- **docs/DIAGRAMS.md** - Geração de diagramas

---

## 🚀 Próximos Passos

1. **Revise** a documentação de priorização criada
2. **Customize** conforme necessidades da Vertem
3. **Crie** SOPs e Runbooks para seus serviços
4. **Versione** no Git
5. **Compartilhe** com os times

---

**Desenvolvido com ❤️ pela Equipe Vertem**

