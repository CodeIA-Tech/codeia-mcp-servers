# Codeia MCP Servers

Repositório centralizado para configurações de MCP (Model Context Protocol) servers e system prompts (regras) para uso no Cursor IDE.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Instalação](#instalação)
- [Uso](#uso)
- [Como Acionar Agentes](#como-acionar-agentes)
- [Configurações Disponíveis](#configurações-disponíveis)
- [System Prompts](#system-prompts)
- [Contribuindo](#contribuindo)

## 🎯 Visão Geral

Este repositório centraliza:

- **MCP Servers**: Configurações de servidores MCP para diferentes contextos (Kubernetes, GitOps, Databases, Cloud)
- **System Prompts**: Regras e diretrizes para agentes especializados (Kubernetes, ArgoCD, DevOps, SRE)
- **Scripts**: Ferramentas para instalação e configuração automática
- **Templates**: Templates prontos para diferentes tipos de projetos

## 📁 Estrutura do Repositório

```
codeia-mcp-servers/
├── mcp/                          # Configurações de MCP Servers
│   ├── base.json                 # Servidores base (filesystem, git)
│   ├── kubernetes.json           # Servidor Kubernetes
│   ├── gitops.json               # Servidores GitOps (GitHub)
│   ├── databases.json            # Servidores de banco (Postgres, SQLite)
│   ├── cloud.json                # Servidores cloud (AWS, Brave Search)
│   └── datadog.json              # Servidor Datadog (monitores, dashboards, análises)
│
├── rules/                        # System Prompts por contexto
│   ├── kubernetes/
│   │   └── kubernetes.md         # Regras para operações Kubernetes
│   ├── argocd/
│   │   └── argocd.md             # Regras para ArgoCD e GitOps
│   ├── devops/
│   │   └── devops.md             # Regras gerais DevOps
│   ├── sre/
│   │   └── sre.md                # Regras SRE
│   └── datadog/
│       └── datadog.md            # Regras para Datadog (monitores, dashboards, análises)
│
├── scripts/                      # Scripts utilitários
│   ├── install-global.sh         # Instala configurações globalmente
│   ├── setup-project.sh          # Configura projeto específico
│   ├── merge-configs.sh          # Faz merge de configurações
│   └── datadog-mcp-server.js     # Servidor MCP customizado para Datadog
│
├── templates/                    # Templates prontos
│   ├── project-k8s.json          # Template para projetos Kubernetes
│   └── project-gitops.json       # Template para projetos GitOps
│
└── README.md                     # Este arquivo
```

## 🚀 Instalação

### Instalação Global (Recomendado para começar)

Instala as configurações base globalmente em `~/.cursor/`:

```bash
cd codeia-mcp-servers
./scripts/install-global.sh
```

Isso irá:
- Copiar `mcp/base.json` para `~/.cursor/mcp.json`
- Copiar todas as rules para `~/.cursor/rules/`

### Configurar um Projeto Específico

Para configurar um projeto com servidores MCP específicos:

```bash
# Para um projeto Kubernetes
./scripts/setup-project.sh ~/projects/my-k8s-app base kubernetes

# Para um projeto GitOps
./scripts/setup-project.sh ~/projects/my-gitops-app base kubernetes gitops

# Para um projeto com banco de dados
./scripts/setup-project.sh ~/projects/my-app base databases
```

### Configuração Manual

1. **Copiar configuração MCP**:
   ```bash
   # Copiar base
   cp mcp/base.json ~/.cursor/mcp.json
   
   # Ou fazer merge de múltiplas
   ./scripts/merge-configs.sh ~/.cursor/mcp.json mcp/base.json mcp/kubernetes.json
   ```

2. **Configurar variáveis de ambiente**:
   Edite `~/.cursor/mcp.json` e configure as variáveis necessárias:
   ```json
   {
     "mcpServers": {
       "github": {
         "env": {
           "GITHUB_PERSONAL_ACCESS_TOKEN": "seu-token-aqui"
         }
       }
     }
   }
   ```

3. **Reiniciar o Cursor** para aplicar as mudanças.

## 📖 Uso

### Usando MCP Servers

Após a instalação, você pode usar os servidores MCP no Cursor:

```
"Usando o MCP filesystem, liste todos os arquivos YAML no projeto"
"Com o MCP kubernetes, liste todos os pods no namespace argocd"
"Usando o MCP git, mostre o histórico de commits dos últimos 7 dias"
```

### Usando System Prompts

Os system prompts são aplicados automaticamente quando você menciona o contexto:

```
"Seguindo as regras do kubernetes.md, crie um Deployment com resource limits"
"Como agente SRE, analise os SLIs e SLOs deste serviço"
"Seguindo as diretrizes do argocd.md, configure uma aplicação ArgoCD"
```

### Gerenciar Servidores MCP via CLI

```bash
# Listar servidores configurados
cursor-agent mcp list

# Listar ferramentas de um servidor
cursor-agent mcp list-tools filesystem
cursor-agent mcp list-tools kubernetes

# Desativar um servidor
cursor-agent mcp disable postgres
```

## 🎭 Como Acionar Agentes

Para usar agentes especializados com nomes específicos, consulte o guia completo:

👉 **[AGENTES.md](AGENTES.md)** - Guia completo de como acionar agentes especializados

### Resumo Rápido

Você pode acionar agentes mencionando o nome do agente:

```
"Datadog Specialist, crie um monitor de CPU alto"
"Kubernetes Specialist, valide este manifest YAML"
"GitOps Specialist, configure uma aplicação ArgoCD"
"SRE Specialist, analise os SLIs deste serviço"
```

**Nomes disponíveis para Datadog:**
- "Datadog Specialist" (recomendado)
- "Datadog Agent"
- "Datadog Expert"
- "DD Agent"
- "Monitor Specialist"
- "Observability Expert"

Veja o [guia completo de agentes](AGENTES.md) para todos os nomes e exemplos detalhados.

## 🔧 Configurações Disponíveis

### Base (`mcp/base.json`)
- **filesystem**: Acesso ao sistema de arquivos
- **git**: Operações Git

### Kubernetes (`mcp/kubernetes.json`)
- **kubernetes**: Operações no cluster Kubernetes
- Requer: `KUBECONFIG` (padrão: `~/.kube/config`)

### GitOps (`mcp/gitops.json`)
- **github**: Operações no GitHub
- Requer: `GITHUB_TOKEN`

### Databases (`mcp/databases.json`)
- **postgres**: Acesso a PostgreSQL
- **sqlite**: Acesso a SQLite
- Requer: `POSTGRES_CONNECTION_STRING` ou `SQLITE_DB_PATH`

### Cloud (`mcp/cloud.json`)
- **aws**: Operações AWS
- **brave-search**: Busca na web
- Requer: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `BRAVE_API_KEY`

### Datadog (`mcp/datadog.json`)
- **datadog**: Integração completa com Datadog
  - Criar e gerenciar monitores
  - Criar e gerenciar dashboards
  - Consultar métricas e análises
  - Gerenciar workflows e automação
  - Gerar post-mortems e relatórios
  - Gerenciar incidentes
- Requer: `DATADOG_API_KEY`, `DATADOG_APP_KEY`
- Opcional: `DATADOG_SITE` (padrão: datadoghq.com)

## 📝 System Prompts

### Kubernetes (`rules/kubernetes/kubernetes.md`)
Regras para operações Kubernetes:
- Validação e segurança
- Resource management
- Secrets e ConfigMaps
- Health checks
- Troubleshooting

### ArgoCD (`rules/argocd/argocd.md`)
Regras para GitOps e ArgoCD:
- Estrutura de overlays
- Sync policies
- Application manifests
- Troubleshooting

### DevOps (`rules/devops/devops.md`)
Diretrizes gerais DevOps:
- Infraestrutura como Código
- CI/CD
- Monitoring
- Segurança

### SRE (`rules/sre/sre.md`)
Práticas SRE:
- SLIs, SLOs e SLAs
- Error Budget
- Incident Management
- Capacity Planning

### Datadog (`rules/datadog/datadog.md`)
Regras para operações Datadog:
- Criar e gerenciar monitores
- Criar e gerenciar dashboards
- Consultar métricas e análises
- Workflows e automação
- Post-mortems e relatórios
- Incident management
- Best practices de monitoramento

## 🔐 Segurança

### Variáveis de Ambiente

Nunca commite secrets ou tokens. Use variáveis de ambiente:

```bash
# No seu ~/.bashrc ou ~/.zshrc
export GITHUB_TOKEN="seu-token-github"
export AWS_ACCESS_KEY_ID="sua-key"
export AWS_SECRET_ACCESS_KEY="sua-secret"
export POSTGRES_CONNECTION_STRING="postgresql://..."
export DATADOG_API_KEY="sua-api-key-datadog"
export DATADOG_APP_KEY="sua-app-key-datadog"
export DATADOG_SITE="datadoghq.com"  # ou datadoghq.eu, us3.datadoghq.com, etc.
```

### GitHub Secrets (Recomendado para Times)

Para usar GitHub Secrets com Datadog:

```bash
# Configurar secrets no repositório
gh secret set DATADOG_API_KEY --repo seu-org/seu-repo
gh secret set DATADOG_APP_KEY --repo seu-org/seu-repo

# Usar script de setup automático
./scripts/setup-datadog-from-github.sh seu-org/seu-repo
```

👉 Veja o guia completo: **[GITHUB-SECRETS.md](GITHUB-SECRETS.md)**

### .gitignore

Se você criar configurações locais com secrets, adicione ao `.gitignore`:

```gitignore
# Cursor
.cursor/mcp.local.json
.cursor/mcp.json  # Se contiver secrets
```

## 🛠️ Scripts

### `install-global.sh`
Instala configurações globalmente em `~/.cursor/`

```bash
./scripts/install-global.sh
```

### `setup-project.sh`
Configura um projeto específico com MCP servers selecionados

```bash
./scripts/setup-project.sh <project-path> <config1> <config2> ...
```

### `merge-configs.sh`
Faz merge de múltiplas configurações MCP

```bash
./scripts/merge-configs.sh output.json config1.json config2.json ...
```

## 📚 Exemplos

### Exemplo 1: Projeto Kubernetes Simples

```bash
./scripts/setup-project.sh ~/projects/my-k8s-app base kubernetes
```

Isso cria `.cursor/mcp.json` com filesystem, git e kubernetes.

### Exemplo 2: Projeto GitOps Completo

```bash
./scripts/setup-project.sh ~/projects/gitops-repo base kubernetes gitops
```

Isso cria configuração com filesystem, git, kubernetes e github.

### Exemplo 3: Projeto com Datadog

```bash
./scripts/setup-project.sh ~/projects/my-monitoring-app base datadog
```

Isso cria configuração com filesystem, git e servidor Datadog.

### Exemplo 4: Customização Manual

```bash
# Fazer merge customizado
./scripts/merge-configs.sh \
  ~/.cursor/mcp.json \
  mcp/base.json \
  mcp/kubernetes.json \
  mcp/datadog.json

# Editar manualmente
nano ~/.cursor/mcp.json
```

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-config`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova configuração'`)
4. Push para a branch (`git push origin feature/nova-config`)
5. Abra um Pull Request

### Adicionando Nova Configuração MCP

1. Crie arquivo em `mcp/nome-da-config.json`
2. Siga o formato:
   ```json
   {
     "mcpServers": {
       "nome-do-servidor": {
         "command": "npx",
         "args": [...],
         "env": {...},
         "description": "Descrição"
       }
     }
   }
   ```
3. Atualize este README

### Adicionando Nova Rule

1. Crie arquivo em `rules/contexto/contexto.md`
2. Documente regras e diretrizes
3. Atualize este README

## 📄 Licença

Este projeto é parte do Codeia Tech e segue as políticas da organização.

## 🔗 Links Úteis

- [Documentação MCP](https://modelcontextprotocol.io/)
- [Documentação Cursor](https://docs.cursor.com/)
- [Cursor MCP Documentation](https://docs.cursor.com/context/mcp)

## 💡 Dicas

- Use `cursor-agent mcp list` para ver servidores ativos
- Reinicie o Cursor após mudanças em `mcp.json`
- Use variáveis de ambiente para secrets
- Mantenha `.cursor/mcp.json` versionado apenas se não tiver secrets
- Use templates para começar rapidamente

---

**Desenvolvido com ❤️ pela equipe Codeia Tech**
