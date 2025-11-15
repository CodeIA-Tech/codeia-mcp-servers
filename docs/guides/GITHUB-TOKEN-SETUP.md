# 🔐 Configurando GIT_TOKEN do GitHub Secrets

Guia para usar o `GIT_TOKEN` configurado nos GitHub Secrets.

## 📋 Situação Atual

Você já configurou `GIT_TOKEN` como secret no GitHub. Agora precisamos acessá-lo para usar nos scripts.

## 🚀 Opções para Usar o Token

### Opção 1: GitHub CLI (Recomendado)

**Passo 1: Instalar GitHub CLI**
```bash
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh

# macOS
brew install gh
```

**Passo 2: Autenticar**
```bash
gh auth login
```

**Passo 3: Obter o Token e Configurar**
```bash
# Obter token e configurar automaticamente
source scripts/get-github-token.sh

# Agora você pode usar os scripts
node scripts/list-github-org-repos.js CodeIA-Tech
```

### Opção 2: Manual via GitHub CLI

```bash
# Obter token manualmente
export GIT_TOKEN=$(gh secret get GIT_TOKEN --repo CodeIA-Tech/codeia-mcp-servers)
export GITHUB_TOKEN="$GIT_TOKEN"

# Usar nos scripts
node scripts/list-github-org-repos.js CodeIA-Tech
```

### Opção 3: Configurar Token Localmente (Desenvolvimento)

Se você tem o token e quer usar localmente:

```bash
# Configure diretamente (não commitar!)
export GIT_TOKEN="seu-token-aqui"
export GITHUB_TOKEN="$GIT_TOKEN"

# Adicione ao seu ~/.bashrc ou ~/.zshrc se quiser persistir
# (mas lembre-se que isso não é recomendado para produção)
```

### Opção 4: Via GitHub Actions (CI/CD)

Se você quer usar em workflows:

```yaml
name: List Repos
on: [workflow_dispatch]

jobs:
  list-repos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: List Repositories
        env:
          GIT_TOKEN: ${{ secrets.GIT_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GIT_TOKEN }}
        run: |
          node scripts/list-github-org-repos.js CodeIA-Tech
```

## 📝 Scripts Disponíveis

### 1. `get-github-token.sh`
Obtém o `GIT_TOKEN` do GitHub Secrets e configura as variáveis de ambiente.

```bash
source scripts/get-github-token.sh
```

### 2. `list-github-org-repos.js`
Lista todos os repositórios da organização.

```bash
# Após configurar o token
node scripts/list-github-org-repos.js CodeIA-Tech
```

## 🎯 Uso Rápido

```bash
# 1. Autenticar no GitHub (primeira vez)
gh auth login

# 2. Obter token e configurar
source scripts/get-github-token.sh

# 3. Listar repositórios
node scripts/list-github-org-repos.js CodeIA-Tech
```

## 🔍 Verificar Configuração

```bash
# Verificar se GitHub CLI está instalado
gh --version

# Verificar autenticação
gh auth status

# Listar secrets disponíveis
gh secret list --repo CodeIA-Tech/codeia-mcp-servers

# Testar se token está configurado
if [ -n "$GIT_TOKEN" ]; then
  echo "✅ GIT_TOKEN configurado: ${GIT_TOKEN:0:8}..."
else
  echo "❌ GIT_TOKEN não configurado"
fi
```

## 🛠️ Troubleshooting

### Erro: "gh: command not found"
**Solução**: Instale o GitHub CLI (veja Opção 1 acima)

### Erro: "You are not authenticated"
**Solução**: Execute `gh auth login`

### Erro: "Permission denied" ao acessar secrets
**Solução**: Verifique se você tem permissão no repositório:
```bash
gh repo view CodeIA-Tech/codeia-mcp-servers
```

### Erro: "Secret not found"
**Solução**: Verifique se o secret existe:
```bash
gh secret list --repo CodeIA-Tech/codeia-mcp-servers
```

### Token não funciona
**Solução**: Verifique se o token tem as permissões necessárias:
- `read:org` - Para listar repositórios da organização
- `repo` - Para acesso completo aos repositórios

## 📚 Próximos Passos

Após configurar o token, você pode:

1. **Listar repositórios**:
   ```bash
   node scripts/list-github-org-repos.js CodeIA-Tech
   ```

2. **Usar no Cursor com MCP GitHub**:
   - Configure o MCP server GitHub com o token
   - Use comandos como: "Liste todos os repositórios da organização"

3. **Integrar em workflows**:
   - Use o token em GitHub Actions
   - Automatize tarefas GitOps

---

**Dica**: Use `source scripts/get-github-token.sh` sempre que precisar atualizar o token!

