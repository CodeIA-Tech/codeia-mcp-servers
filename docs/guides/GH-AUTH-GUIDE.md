# 🔑 Guia de Autenticação no GitHub CLI

## Passo 2: Autenticar no GitHub

Execute o comando:
```bash
gh auth login
```

### Durante o processo, você será perguntado:

1. **GitHub.com?**
   - Responda: `Y` (Yes)

2. **What is your preferred protocol for Git operations?**
   - Opções: `HTTPS` ou `SSH`
   - Recomendado: `HTTPS` (mais simples)

3. **Authenticate Git with your GitHub credentials?**
   - Responda: `Y` (Yes) para usar as mesmas credenciais

4. **How would you like to authenticate GitHub CLI?**
   - Opção 1: `Login with a web browser` (Recomendado)
   - Opção 2: `Paste an authentication token`

### Se escolher "Login with a web browser":

1. Você verá um código (exemplo: `ABCD-1234`)
2. Pressione `Enter` para abrir o navegador
3. Ou copie o código e cole em: https://github.com/login/device
4. Autorize o GitHub CLI
5. Volte ao terminal - você verá "✓ Authentication complete"

### Se escolher "Paste an authentication token":

1. Vá em: https://github.com/settings/tokens
2. Clique em "Generate new token" → "Generate new token (classic)"
3. Configure:
   - Note: "GitHub CLI"
   - Expiration: escolha um período
   - Scopes: marque `read:org` e `repo`
4. Copie o token
5. Cole no terminal quando solicitado

## Verificar Autenticação

Após autenticar, verifique:
```bash
gh auth status
```

Você deve ver algo como:
```
github.com
  ✓ Logged in as seu-usuario (token)
  ✓ Git operations for github.com configured to use https
```

## Próximos Passos

Após autenticar, você poderá:

1. **Obter o GIT_TOKEN do GitHub Secrets:**
   ```bash
   source scripts/get-github-token.sh
   ```

2. **Listar repositórios:**
   ```bash
   node scripts/list-github-org-repos.js CodeIA-Tech
   ```

