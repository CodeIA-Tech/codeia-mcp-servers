# 🚀 Quick Start

Guia rápido para começar a usar o Codeia MCP Servers.

## Instalação Rápida (5 minutos)

### 1. Instalar Configurações Globais

```bash
cd codeia-mcp-servers
./scripts/install-global.sh
```

### 2. Configurar Variáveis de Ambiente (Opcional)

Adicione ao seu `~/.bashrc` ou `~/.zshrc`:

```bash
# GitHub (se usar GitOps)
export GITHUB_TOKEN="seu-token-github"

# Kubernetes (ajuste o path se necessário)
export KUBECONFIG="$HOME/.kube/config"

# AWS (se usar cloud)
export AWS_ACCESS_KEY_ID="sua-key"
export AWS_SECRET_ACCESS_KEY="sua-secret"
```

### 3. Reiniciar o Cursor

Reinicie o Cursor IDE para carregar as configurações.

### 4. Verificar Instalação

No terminal do Cursor:

```bash
cursor-agent mcp list
```

Você deve ver os servidores base (filesystem, git) listados.

## Configurar um Projeto Específico

### Projeto Kubernetes

```bash
./scripts/setup-project.sh ~/projects/meu-projeto-k8s base kubernetes
```

### Projeto GitOps

```bash
./scripts/setup-project.sh ~/projects/meu-projeto-gitops base kubernetes gitops
```

## Uso Básico

### Usando MCP Servers

No chat do Cursor, você pode usar:

```
"Usando o MCP filesystem, liste todos os arquivos YAML no projeto"
"Com o MCP kubernetes, mostre os pods no namespace default"
"Usando o MCP git, qual foi o último commit?"
```

### Usando System Prompts

Mencione o contexto para ativar as regras:

```
"Seguindo as regras do kubernetes.md, crie um Deployment seguro"
"Como agente SRE, analise os SLIs deste serviço"
"Seguindo as diretrizes do argocd.md, configure uma aplicação ArgoCD"
```

## Próximos Passos

- Leia o [README.md](README.md) completo para mais detalhes
- Explore as [rules](rules/) disponíveis
- Personalize as configurações conforme necessário
- Veja os [templates](templates/) para projetos específicos

## Troubleshooting

### Servidores não aparecem

1. Verifique se reiniciou o Cursor
2. Verifique se `~/.cursor/mcp.json` existe
3. Verifique logs do Cursor

### Erro de permissão

```bash
chmod +x scripts/*.sh
```

### jq não encontrado

```bash
sudo apt-get update && sudo apt-get install -y jq
```

## Exemplos Práticos

### Exemplo 1: Projeto Kubernetes

```bash
# Setup
./scripts/setup-project.sh ~/my-k8s-app base kubernetes

# No Cursor, perguntar:
"Usando o MCP kubernetes, liste todos os namespaces"
```

### Exemplo 2: Projeto GitOps

```bash
# Setup
./scripts/setup-project.sh ~/gitops-repo base kubernetes gitops

# No Cursor, perguntar:
"Seguindo as regras do argocd.md, crie uma aplicação ArgoCD para o namespace dev"
```

---

**Precisa de ajuda?** Abra uma Issue ou consulte o [README.md](README.md) completo.

