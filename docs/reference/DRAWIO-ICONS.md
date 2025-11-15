# 🎨 Bibliotecas de Ícones no draw.io

Guia completo para usar ícones profissionais de cloud providers no draw.io.

## 🌟 Ícones Disponíveis

O draw.io possui bibliotecas oficiais de ícones para:

### ☁️ Cloud Providers
- **AWS** (Amazon Web Services) - Completo
- **Azure** (Microsoft) - Completo  
- **GCP** (Google Cloud Platform) - Completo
- **IBM Cloud** - Completo
- **Oracle Cloud** - Completo

### 🔧 Ferramentas e Plataformas
- **Kubernetes** - Pods, Services, Deployments
- **Docker** - Containers
- **Terraform** - IaC
- **Ansible** - Automação
- **Jenkins** - CI/CD
- **GitHub/GitLab** - DevOps

### 📊 Outras
- **Network** - Switches, Routers, Firewalls
- **Security** - Locks, Shields
- **Database** - SQL, NoSQL
- **Mobile** - iOS, Android

---

## 🚀 Como Usar no Nosso Gerador

### Diagrama com Ícones AWS (Automático)

```bash
# Gera diagrama com ícones AWS automaticamente
node scripts/generate-motor-porto-aws-diagram.js
```

**O que isso faz:**
- ✅ Identifica automaticamente o tipo de serviço
- ✅ Usa ícone apropriado (EC2, RDS, ElastiCache, etc.)
- ✅ Carrega bibliotecas AWS no draw.io
- ✅ Cria arquivo editável

### Ícones Usados Automaticamente

| Serviço | Ícone AWS |
|---------|-----------|
| **motor-porto-tomcat** | 🖥️ EC2 Instance |
| **Databases** | 🗄️ RDS |
| **Redis/Cache** | ⚡ ElastiCache |
| **Containers/ECS** | 🐳 ECS |
| **Kubernetes** | ☸️ K8s Pod |
| **Lambda/Workers** | ⚡ Lambda |
| **API Gateway** | 🚪 API Gateway |

---

## ✏️ Adicionar Mais Ícones no draw.io

### Método 1: Ao Abrir o Arquivo

1. Clique em **"Editar no draw.io"** no HTML gerado
2. As bibliotecas AWS já estarão carregadas automaticamente!

### Método 2: Carregar Bibliotecas Manualmente

1. Abra https://app.diagrams.net/
2. **File → Open Library from → ...** escolha:
   - **AWS4** (AWS Architecture Icons)
   - **AWS 19** (Versão mais recente)
   - **Azure** (Microsoft Azure)
   - **GCP** (Google Cloud)
   - **Kubernetes**

3. Ou procure na barra lateral esquerda: **More Shapes...**

### Método 3: URL com Bibliotecas Pré-carregadas

Nosso gerador já adiciona as bibliotecas na URL:

```
https://app.diagrams.net/?libs=aws4;kubernetes
```

Você pode adicionar mais:

```
https://app.diagrams.net/?libs=aws4;azure;gcp;kubernetes
```

---

## 🎨 Ícones AWS Disponíveis

### Compute
- **EC2** - Instâncias virtuais
- **Lambda** - Serverless functions
- **ECS** - Container service
- **EKS** - Kubernetes managed
- **Elastic Beanstalk** - PaaS

### Database
- **RDS** - Relational databases
- **DynamoDB** - NoSQL
- **DocumentDB** - MongoDB compatible
- **Aurora** - High performance
- **Redshift** - Data warehouse

### Storage
- **S3** - Object storage
- **EBS** - Block storage
- **EFS** - File system
- **Glacier** - Archive

### Networking
- **VPC** - Virtual network
- **CloudFront** - CDN
- **Route 53** - DNS
- **API Gateway** - API management
- **Elastic Load Balancer** - Load balancing

### Cache & Queue
- **ElastiCache** - Redis/Memcached
- **SQS** - Message queue
- **SNS** - Notifications
- **Kinesis** - Streaming

### Security
- **IAM** - Identity management
- **Secrets Manager** - Secrets
- **WAF** - Web firewall
- **Shield** - DDoS protection

### Monitoring
- **CloudWatch** - Monitoring
- **X-Ray** - Tracing
- **CloudTrail** - Audit

---

## 🔧 Personalizar Diagrama no draw.io

### 1. Trocar Ícones

1. **Selecione** o elemento no diagrama
2. **Edit → Edit Style** (ou F8)
3. Procure por `resIcon=mxgraph.aws4.ec2`
4. Troque para outro ícone, ex: `resIcon=mxgraph.aws4.lambda`

### 2. Adicionar Novos Elementos

1. **Barra lateral esquerda** → procure o ícone
2. **Arraste** para o diagrama
3. **Conecte** com as setas

### 3. Ajustar Layout

- **Layout → Vertical/Horizontal Tree**
- **Arrange → Insert → Grid**
- **View → Format Panel** (Ctrl+Shift+P)

### 4. Exportar

- **File → Export as → PNG** (para documentação)
- **File → Export as → SVG** (vetorial, escalável)
- **File → Export as → PDF** (apresentações)

---

## 📐 Exemplos de Layouts

### Layout AWS 3-Tier

```
┌─────────────────────────────────────────┐
│          CloudFront (CDN)               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       ALB (Load Balancer)               │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐      ┌─────▼────┐
│  EC2 #1  │      │  EC2 #2  │
└────┬─────┘      └─────┬────┘
     │                   │
     └─────────┬─────────┘
               │
┌──────────────▼──────────────────────────┐
│             RDS (Database)              │
└─────────────────────────────────────────┘
```

### Layout Microservices

```
                ┌──────────┐
                │   API    │
                │ Gateway  │
                └─────┬────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
     ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
     │Service A│ │Service B│ │Service C│
     │  (ECS)  │ │  (ECS)  │ │  (ECS)  │
     └────┬────┘ └───┬────┘ └───┬────┘
          │          │          │
          └──────────┼──────────┘
                     │
              ┌──────▼──────┐
              │ElastiCache  │
              │   (Redis)   │
              └─────────────┘
```

---

## 🎯 Dicas Profissionais

### 1. Agrupamento
- Use **containers** para agrupar recursos por VPC, subnet
- **Edit → Group** (Ctrl+G)

### 2. Cores Oficiais AWS
- **Compute**: Laranja (#D05C17)
- **Database**: Azul (#3334B9)
- **Storage**: Verde (#277116)
- **Network**: Roxo (#8C4FFF)

### 3. Nomenclatura
- Use nomes descritivos: `prod-api-ec2-01`
- Adicione tags: `env:prod`, `team:backend`

### 4. Legenda
- Adicione uma **caixa de legenda** explicando:
  - Cores por ambiente (prod=verde, staging=amarelo)
  - Tipos de conexão (HTTP, TCP, async)

### 5. Versionamento
- Salve o `.drawio` no Git
- Use commits descritivos
- Mantenha histórico de mudanças

---

## 📚 Recursos Adicionais

### Bibliotecas Extras

1. **AWS Simple Icons**
   ```
   https://github.com/awslabs/aws-icons-for-plantuml
   ```

2. **Cloudcraft** (alternativa)
   ```
   https://cloudcraft.co/
   ```

3. **Lucidchart** (alternativa)
   ```
   https://lucidchart.com/
   ```

### Templates Prontos

- [AWS Architecture Diagrams](https://aws.amazon.com/architecture/icons/)
- [draw.io AWS Templates](https://github.com/jgraph/drawio-aws-templates)

---

## 🆘 Problemas Comuns

### "Ícones não aparecem"

**Solução:** Bibliotecas não carregadas
- File → Open Library → Procure "AWS4"
- Ou use nosso HTML com bibliotecas pré-carregadas

### "Diagrama muito grande"

**Solução:** Ajuste o zoom e tamanho
- View → Fit Window (Ctrl+Shift+F)
- Page Setup → Scale

### "Exportação em baixa qualidade"

**Solução:** Use SVG ao invés de PNG
- File → Export as → SVG
- Ou aumente DPI: Export → PNG → 300 DPI

---

## 🎨 Próximos Passos

1. **Experimente** os ícones AWS no diagrama gerado
2. **Adicione** mais componentes manualmente
3. **Customize** cores e layout
4. **Exporte** para documentação
5. **Versione** no Git

---

**Desenvolvido com ❤️ pela Equipe Vertem**

