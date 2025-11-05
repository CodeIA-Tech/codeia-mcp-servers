# 🔐 Configurando Datadog com GitHub Secrets

Guia completo para configurar as API keys do Datadog usando GitHub Secrets.

## 📋 Pré-requisitos

1. **Repositório GitHub** com acesso a Secrets
2. **API Keys do Datadog**:
   - API Key: [Datadog API Keys](https://app.datadoghq.com/organization-settings/api-keys)
   - App Key: [Datadog Application Keys](https://app.datadoghq.com/organization-settings/application-keys)

## 🔧 Configuração no GitHub

### Passo 1: Adicionar Secrets no Repositório

1. Acesse seu repositório no GitHub
2. Vá em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Adicione os seguintes secrets:

#### Secret 1: `DATADOG_API_KEY`
- **Name**: `DATADOG_API_KEY`
- **Secret**: Cole sua API Key do Datadog
- **Description**: "Datadog API Key para autenticação"

#### Secret 2: `DATADOG_APP_KEY`
- **Name**: `DATADOG_APP_KEY`
- **Secret**: Cole sua App Key do Datadog
- **Description**: "Datadog Application Key para operações administrativas"

#### Secret 3: `DATADOG_SITE` (Opcional)
- **Name**: `DATADOG_SITE`
- **Secret**: `datadoghq.com` (ou `datadoghq.eu`, `us3.datadoghq.com`, etc.)
- **Description**: "Site do Datadog (padrão: datadoghq.com)"

### Passo 2: Adicionar Secrets no Ambiente (Opcional)

Para secrets específicos por ambiente:

1. Vá em **Settings** → **Environments**
2. Crie ambientes (ex: `production`, `staging`, `development`)
3. Adicione secrets específicos para cada ambiente

## 🚀 Usando Secrets em GitHub Actions

### Exemplo 1: Workflow Básico

```yaml
name: Datadog Operations

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  datadog-tasks:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      secrets: read
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Test Datadog Connection
        env:
          DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
          DATADOG_APP_KEY: ${{ secrets.DATADOG_APP_KEY }}
          DATADOG_SITE: ${{ secrets.DATADOG_SITE || 'datadoghq.com' }}
        run: |
          node scripts/test-datadog-connection.js
```

### Exemplo 2: Criar Monitor via GitHub Actions

```yaml
name: Create Datadog Monitor

on:
  workflow_dispatch:
    inputs:
      monitor_name:
        description: 'Nome do monitor'
        required: true
      query:
        description: 'Query do monitor'
        required: true

jobs:
  create-monitor:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      secrets: read
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Create Monitor
        env:
          DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
          DATADOG_APP_KEY: ${{ secrets.DATADOG_APP_KEY }}
          DATADOG_SITE: ${{ secrets.DATADOG_SITE || 'datadoghq.com' }}
        run: |
          node scripts/create-datadog-monitor.js \
            --name "${{ inputs.monitor_name }}" \
            --query "${{ inputs.query }}"
```

### Exemplo 3: Com Ambientes

```yaml
name: Deploy to Environment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    permissions:
      contents: read
      secrets: read
    
    steps:
      - name: Deploy
        env:
          DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
          DATADOG_APP_KEY: ${{ secrets.DATADOG_APP_KEY }}
          DATADOG_SITE: ${{ secrets.DATADOG_SITE || 'datadoghq.com' }}
        run: |
          # Seu script de deploy aqui
          echo "Deploying to ${{ inputs.environment }}"
```

## 🔄 Usando Secrets em Cursor Localmente

### Opção 1: GitHub CLI (gh)

```bash
# Instalar GitHub CLI
# Ubuntu/Debian:
sudo apt install gh

# macOS:
brew install gh

# Autenticar
gh auth login

# Configurar secrets como variáveis de ambiente
export DATADOG_API_KEY=$(gh secret get DATADOG_API_KEY --repo seu-org/seu-repo)
export DATADOG_APP_KEY=$(gh secret get DATADOG_APP_KEY --repo seu-org/seu-repo)
export DATADOG_SITE=$(gh secret get DATADOG_SITE --repo seu-org/seu-repo || echo "datadoghq.com")
```

### Opção 2: Script de Setup Automático

Crie um script que baixa secrets do GitHub:

```bash
#!/bin/bash
# scripts/setup-datadog-from-github.sh

REPO="${GITHUB_REPOSITORY:-seu-org/seu-repo}"

echo "🔐 Configurando Datadog usando GitHub Secrets..."

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não encontrado"
    echo "📦 Instale: https://cli.github.com/"
    exit 1
fi

# Verificar autenticação
if ! gh auth status &> /dev/null; then
    echo "🔑 Autenticando no GitHub..."
    gh auth login
fi

# Obter secrets
export DATADOG_API_KEY=$(gh secret get DATADOG_API_KEY --repo "$REPO" 2>/dev/null)
export DATADOG_APP_KEY=$(gh secret get DATADOG_APP_KEY --repo "$REPO" 2>/dev/null)
export DATADOG_SITE=$(gh secret get DATADOG_SITE --repo "$REPO" 2>/dev/null || echo "datadoghq.com")

if [ -z "$DATADOG_API_KEY" ] || [ -z "$DATADOG_APP_KEY" ]; then
    echo "❌ Erro ao obter secrets do GitHub"
    exit 1
fi

echo "✅ Secrets configurados!"
echo "📍 Site: $DATADOG_SITE"
echo "🔑 API Key: ${DATADOG_API_KEY:0:8}..."

# Testar conexão
node scripts/test-datadog-connection.js
```

### Opção 3: Usar Secrets Manager

Para projetos mais complexos, use um gerenciador de secrets:

```bash
# Usando 1Password CLI
op inject -i .env.template -o .env

# Usando AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id datadog-credentials \
  --query SecretString \
  --output text | jq -r '.DATADOG_API_KEY' | xargs export DATADOG_API_KEY=
```

## 🔒 Boas Práticas de Segurança

### 1. Nunca Commitar Secrets

Adicione ao `.gitignore`:

```gitignore
# Secrets
.env
.env.local
*.key
*.pem
secrets/
```

### 2. Usar Secrets por Ambiente

Configure secrets diferentes para cada ambiente:

- `DATADOG_API_KEY_DEV`
- `DATADOG_API_KEY_STAGING`
- `DATADOG_API_KEY_PRODUCTION`

### 3. Rotacionar Secrets Regularmente

- Configure alertas para expiração de keys
- Rotacione keys a cada 90 dias
- Use diferentes keys por ambiente

### 4. Permissões Mínimas

- Use keys com permissões mínimas necessárias
- Revise permissões regularmente
- Use diferentes keys para diferentes propósitos

### 5. Auditoria

- Habilite logs de acesso às keys
- Monitore uso das keys
- Configure alertas para uso anômalo

## 📝 Exemplo de Script de Setup

Crie `scripts/setup-datadog-secrets.sh`:

```bash
#!/bin/bash
# Script para configurar Datadog usando GitHub Secrets

set -e

REPO="${GITHUB_REPOSITORY:-seu-org/seu-repo}"
ENV_FILE="${ENV_FILE:-.env.datadog}"

echo "🔐 Configurando Datadog usando GitHub Secrets..."

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI não encontrado. Instalando..."
    # Instruções de instalação
    exit 1
fi

# Autenticar se necessário
if ! gh auth status &> /dev/null; then
    echo "🔑 Autenticando no GitHub..."
    gh auth login
fi

# Obter secrets
echo "📥 Obtendo secrets do GitHub..."
DATADOG_API_KEY=$(gh secret get DATADOG_API_KEY --repo "$REPO" 2>/dev/null)
DATADOG_APP_KEY=$(gh secret get DATADOG_APP_KEY --repo "$REPO" 2>/dev/null)
DATADOG_SITE=$(gh secret get DATADOG_SITE --repo "$REPO" 2>/dev/null || echo "datadoghq.com")

if [ -z "$DATADOG_API_KEY" ] || [ -z "$DATADOG_APP_KEY" ]; then
    echo "❌ Erro ao obter secrets"
    echo "💡 Verifique se os secrets estão configurados no repositório"
    exit 1
fi

# Criar arquivo .env (opcional)
cat > "$ENV_FILE" <<EOF
# Datadog Configuration
# Gerado automaticamente - NÃO COMMITAR
DATADOG_API_KEY=$DATADOG_API_KEY
DATADOG_APP_KEY=$DATADOG_APP_KEY
DATADOG_SITE=$DATADOG_SITE
EOF

echo "✅ Secrets configurados em $ENV_FILE"
echo "📍 Site: $DATADOG_SITE"
echo "🔑 API Key: ${DATADOG_API_KEY:0:8}..."

# Testar conexão
echo "🔍 Testando conexão..."
export DATADOG_API_KEY
export DATADOG_APP_KEY
export DATADOG_SITE

if node scripts/test-datadog-connection.js; then
    echo "✅ Configuração concluída com sucesso!"
else
    echo "❌ Erro ao testar conexão"
    exit 1
fi
```

## 🎯 Integração com Cursor

### Configurar Cursor para Usar GitHub Secrets

1. **Criar script de inicialização**:

```bash
#!/bin/bash
# ~/.cursor/datadog-setup.sh

# Carregar secrets do GitHub
source <(gh secret list --repo seu-org/seu-repo --json name,value --jq '.[] | "export \(.name)=\(.value)"')

# Ou usar script de setup
./scripts/setup-datadog-secrets.sh
```

2. **Atualizar `.cursor/mcp.json`**:

```json
{
  "mcpServers": {
    "datadog": {
      "command": "bash",
      "args": [
        "-c",
        "source ~/.cursor/datadog-setup.sh && node /path/to/scripts/datadog-mcp-server.js"
      ],
      "env": {
        "DATADOG_API_KEY": "${DATADOG_API_KEY}",
        "DATADOG_APP_KEY": "${DATADOG_APP_KEY}",
        "DATADOG_SITE": "${DATADOG_SITE:-datadoghq.com}"
      }
    }
  }
}
```

## 🔍 Troubleshooting

### Erro: "Secret not found"

**Solução**: Verifique se o secret está configurado:
```bash
gh secret list --repo seu-org/seu-repo
```

### Erro: "Permission denied"

**Solução**: Verifique permissões:
```bash
gh auth status
gh repo view seu-org/seu-repo
```

### Erro: "GitHub CLI not installed"

**Solução**: Instale GitHub CLI:
```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh

# macOS
brew install gh
```

## 📚 Referências

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Datadog API Documentation](https://docs.datadoghq.com/api/latest/)

---

**Dica**: Use GitHub Secrets para manter suas credenciais seguras e centralizadas! 🔒

