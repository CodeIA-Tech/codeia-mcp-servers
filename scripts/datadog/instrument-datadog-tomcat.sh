#!/bin/bash
#
# Script para instrumentação do Datadog no servidor Tomcat e instância EC2
# Uso: ./scripts/instrument-datadog-tomcat.sh
#

set -e

# Modo não interativo para prompts
export DEBIAN_FRONTEND=noninteractive
export NONINTERACTIVE=1

# Configurações
EC2_HOST="ec2-3-84-217-192.compute-1.amazonaws.com"
EC2_USER="ec2-user"
SSH_KEY="ec2-workflow-datadog.pem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_KEY_PATH="$WORKSPACE_DIR/$SSH_KEY"

# Carregar variáveis de ambiente do .env se existir
if [ -f "$WORKSPACE_DIR/.env" ]; then
    export $(grep -v '^#' "$WORKSPACE_DIR/.env" | grep '=' | xargs)
fi

# Tags do Datadog
TAG_ENV="env:prd"
TAG_SERVICE="service:tomcat-app"
TAG_VERSION="version:1.0.0"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Instrumentação do Datadog no Tomcat e EC2${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar se a chave SSH existe
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ Erro: Chave SSH não encontrada em: $SSH_KEY_PATH${NC}"
    exit 1
fi

# Ajustar permissões da chave SSH
chmod 600 "$SSH_KEY_PATH"

echo "📋 Configurações:"
echo "   • Host: $EC2_HOST"
echo "   • Usuário: $EC2_USER"
echo "   • Chave SSH: $SSH_KEY"
echo "   • Tags: $TAG_ENV, $TAG_SERVICE, $TAG_VERSION"
echo ""

# Função para executar comandos remotos
remote_exec() {
    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o ConnectTimeout=10 \
        "$EC2_USER@$EC2_HOST" "$@"
}

# Função para copiar arquivos
remote_copy() {
    scp -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "$@"
}

echo -e "${YELLOW}🔍 Verificando conexão SSH...${NC}"
if ! remote_exec "echo 'Conexão OK'"; then
    echo -e "${RED}❌ Erro: Não foi possível conectar ao servidor${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Conexão estabelecida${NC}"
echo ""

# Verificar se DD_API_KEY está configurado ANTES de instalar
echo -e "${YELLOW}🔍 Verificando configuração do Datadog API Key...${NC}"

# Tentar obter da variável de ambiente local primeiro
LOCAL_DD_API_KEY="${DATADOG_API_KEY:-${DD_API_KEY:-}}"

if [ -n "$LOCAL_DD_API_KEY" ]; then
    echo -e "${GREEN}✅ DD_API_KEY encontrado nas variáveis de ambiente${NC}"
    DD_API_KEY_TO_USE="$LOCAL_DD_API_KEY"
else
    # Verificar se já está configurado no servidor (apenas se o Agent já estiver instalado)
    REMOTE_DD_API_KEY=$(remote_exec "sudo cat /etc/datadog-agent/datadog.yaml 2>/dev/null | grep '^api_key:' | awk '{print \$2}' || echo ''")
    
    if [ -n "$REMOTE_DD_API_KEY" ]; then
        echo -e "${GREEN}✅ DD_API_KEY já está configurado no servidor${NC}"
        DD_API_KEY_TO_USE="$REMOTE_DD_API_KEY"
    else
        echo -e "${RED}❌ DD_API_KEY não encontrado${NC}"
        echo -e "${YELLOW}   Por favor, configure o DD_API_KEY no arquivo .env como DATADOG_API_KEY${NC}"
        echo -e "${YELLOW}   Ou defina a variável de ambiente DD_API_KEY antes de executar este script${NC}"
        exit 1
    fi
fi

# Verificar se o Datadog Agent já está instalado
echo ""
echo -e "${YELLOW}🔍 Verificando instalação do Datadog Agent...${NC}"
DD_AGENT_INSTALLED=$(remote_exec "command -v datadog-agent || echo 'not_installed'")

if [ "$DD_AGENT_INSTALLED" = "not_installed" ]; then
    echo -e "${YELLOW}📦 Instalando Datadog Agent...${NC}"
    
    # Instalar Datadog Agent com o API Key
    REMOTE_SITE="${DATADOG_SITE:-datadoghq.com}"
    remote_exec "DD_API_KEY='$DD_API_KEY_TO_USE' DD_SITE='$REMOTE_SITE' bash -c \"\$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script_agent7.sh)\""
    
    echo -e "${GREEN}✅ Datadog Agent instalado${NC}"
else
    echo -e "${GREEN}✅ Datadog Agent já está instalado${NC}"
    
    # Configurar o API Key no servidor remoto se necessário
    if [ -n "$LOCAL_DD_API_KEY" ]; then
        echo -e "${YELLOW}📝 Atualizando DD_API_KEY no servidor...${NC}"
        remote_exec "sudo bash -c 'sed -i \"s/^api_key:.*/api_key: $DD_API_KEY_TO_USE/\" /etc/datadog-agent/datadog.yaml 2>/dev/null || echo \"api_key: $DD_API_KEY_TO_USE\" >> /etc/datadog-agent/datadog.yaml'"
    fi
fi

# Configurar tags no datadog.yaml
echo ""
echo -e "${YELLOW}📝 Configurando tags no Datadog Agent...${NC}"

# Obter metadados EC2 (usando SSH direto para capturar saída, redirecionando stderr)
INSTANCE_TYPE=$(ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o LogLevel=ERROR \
    "$EC2_USER@$EC2_HOST" \
    "curl -s http://169.254.169.254/latest/meta-data/instance-type 2>/dev/null || echo 'unknown'" 2>/dev/null)

INSTANCE_ID=$(ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o LogLevel=ERROR \
    "$EC2_USER@$EC2_HOST" \
    "curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo 'unknown'" 2>/dev/null)

AVAILABILITY_ZONE=$(ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    -o LogLevel=ERROR \
    "$EC2_USER@$EC2_HOST" \
    "curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null || echo 'unknown'" 2>/dev/null)

# Verificar se os valores foram obtidos
if [ -z "$INSTANCE_TYPE" ] || [ "$INSTANCE_TYPE" = "unknown" ]; then
    echo "   ⚠️  Não foi possível obter metadados EC2 (serão detectados automaticamente pelo Datadog)"
else
    echo "   • Instance Type: $INSTANCE_TYPE"
    echo "   • Instance ID: $INSTANCE_ID"
    echo "   • Availability Zone: $AVAILABILITY_ZONE"
fi

# Remover tags duplicadas anteriores (se existirem)
remote_exec "sudo sed -i '/^# Tags adicionadas pela instrumentação/,/^  - availability_zone:/d' /etc/datadog-agent/datadog.yaml 2>/dev/null || true"
remote_exec "sudo sed -i '/^# Tags adicionadas pela instrumentação/,/^tags:$/d' /etc/datadog-agent/datadog.yaml 2>/dev/null || true"

# Verificar se já existe seção tags
HAS_TAGS=$(remote_exec "sudo grep -q '^tags:' /etc/datadog-agent/datadog.yaml && echo 'yes' || echo 'no'")
HAS_ENV_TAG=$(remote_exec "sudo grep -q '$TAG_ENV' /etc/datadog-agent/datadog.yaml && echo 'yes' || echo 'no'")

if [ "$HAS_TAGS" = "yes" ] && [ "$HAS_ENV_TAG" = "no" ]; then
    # Adicionar tags após a linha 'tags:' existente
    remote_exec "sudo bash -c 'sed -i \"/^tags:/a\\
  - $TAG_ENV\\
  - $TAG_SERVICE\\
  - $TAG_VERSION\" /etc/datadog-agent/datadog.yaml'"
elif [ "$HAS_TAGS" = "no" ]; then
    # Criar nova seção de tags
    remote_exec "sudo bash -c 'cat >> /etc/datadog-agent/datadog.yaml << EOF

# Tags adicionadas pela instrumentação
tags:
  - $TAG_ENV
  - $TAG_SERVICE
  - $TAG_VERSION
EOF
'"
fi

# Nota: O Datadog Agent detecta automaticamente metadados EC2 quando rodando em AWS

echo -e "${GREEN}✅ Tags configuradas${NC}"

# Habilitar integração do Tomcat
echo ""
echo -e "${YELLOW}📝 Configurando integração do Tomcat...${NC}"

# Criar diretório de configuração se não existir
remote_exec "sudo mkdir -p /etc/datadog-agent/conf.d/tomcat.d"

# Criar arquivo de configuração do Tomcat
remote_exec "sudo bash -c 'cat > /etc/datadog-agent/conf.d/tomcat.d/conf.yaml << EOF
init_config:

instances:
  - host: localhost
    port: 8080
    user: \"\"
    password: \"\"
    tomcat: \"tomcat\"
    tags:
      - $TAG_ENV
      - $TAG_SERVICE
      - $TAG_VERSION
EOF
'"

echo -e "${GREEN}✅ Configuração do Tomcat criada${NC}"

# Configurar JMX no Tomcat (sempre, independente do status)
echo ""
echo -e "${YELLOW}🔍 Verificando configuração do Tomcat...${NC}"

# Verificar se o Tomcat está rodando
TOMCAT_RUNNING=$(remote_exec "sudo systemctl is-active tomcat 2>/dev/null || echo 'inactive'")

if [ "$TOMCAT_RUNNING" = "active" ]; then
    echo -e "${GREEN}✅ Tomcat está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  Tomcat não está rodando${NC}"
fi

echo -e "${YELLOW}📝 Configurando JMX no Tomcat...${NC}"

# Criar diretório se não existir
remote_exec "sudo mkdir -p /etc/systemd/system/tomcat.service.d"

# Verificar se já existe configuração do CATALINA_OPTS
EXISTING_OPTS=$(remote_exec "sudo cat /etc/systemd/system/tomcat.service.d/*.conf 2>/dev/null | grep -i CATALINA_OPTS || echo ''")

if [ -z "$EXISTING_OPTS" ]; then
    # Criar novo arquivo de configuração
    remote_exec "sudo bash -c 'cat > /etc/systemd/system/tomcat.service.d/datadog-jmx.conf << EOF
[Service]
Environment=\"CATALINA_OPTS=-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9999 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=localhost -Djava.rmi.server.useLocalHostname=true -Dcom.sun.management.jmxremote.local.only=false\"
EOF
'"
else
    # Adicionar JMX às opções existentes
    remote_exec "sudo bash -c 'cat > /etc/systemd/system/tomcat.service.d/datadog-jmx.conf << EOF
[Service]
$EXISTING_OPTS
Environment=\"CATALINA_OPTS=\${CATALINA_OPTS} -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9999 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=localhost -Djava.rmi.server.useLocalHostname=true -Dcom.sun.management.jmxremote.local.only=false\"
EOF
'"
fi

remote_exec "sudo systemctl daemon-reload"
echo -e "${GREEN}✅ Configuração JMX adicionada${NC}"

if [ "$TOMCAT_RUNNING" = "active" ]; then
    echo -e "${YELLOW}⚠️  O Tomcat está rodando. Será necessário reiniciá-lo para aplicar as mudanças JMX${NC}"
    echo -e "${YELLOW}   Para reiniciar, execute: sudo systemctl restart tomcat${NC}"
else
    echo -e "${GREEN}✅ As configurações serão aplicadas quando o Tomcat iniciar${NC}"
fi

# Configurar JMX no Datadog Agent
echo ""
echo -e "${YELLOW}📝 Configurando integração JMX no Datadog Agent...${NC}"

remote_exec "sudo mkdir -p /etc/datadog-agent/conf.d/jmx.d"

remote_exec "sudo bash -c 'cat > /etc/datadog-agent/conf.d/jmx.d/conf.yaml << EOF
init_config:
  is_jmx: true
  collect_default_metrics: true

instances:
  - host: localhost
    port: 9999
    name: tomcat_app
    tags:
      - $TAG_ENV
      - $TAG_SERVICE
      - $TAG_VERSION
    conf:
      - include:
          domain: Catalina
          type: ThreadPool
          attribute:
            maxThreads:
              alias: tomcat.threads.max
              metric_type: gauge
            currentThreadsBusy:
              alias: tomcat.threads.busy
              metric_type: gauge
            currentThreadCount:
              alias: tomcat.threads.count
              metric_type: gauge
      - include:
          domain: Catalina
          type: GlobalRequestProcessor
          attribute:
            bytesReceived:
              alias: tomcat.bytes_rcvd
              metric_type: counter
            bytesSent:
              alias: tomcat.bytes_sent
              metric_type: counter
            errorCount:
              alias: tomcat.error_count
              metric_type: counter
            requestCount:
              alias: tomcat.request_count
              metric_type: counter
            maxTime:
              alias: tomcat.max_time
              metric_type: gauge
            processingTime:
              alias: tomcat.processing_time
              metric_type: counter
EOF
'"

echo -e "${GREEN}✅ Configuração JMX criada${NC}"

# Verificar e validar configuração
echo ""
echo -e "${YELLOW}🔍 Validando configuração do Datadog Agent...${NC}"
remote_exec "sudo datadog-agent configcheck"

# Reiniciar Datadog Agent
echo ""
echo -e "${YELLOW}🔄 Reiniciando Datadog Agent...${NC}"
remote_exec "sudo systemctl restart datadog-agent"

# Verificar status
echo ""
echo -e "${YELLOW}🔍 Verificando status do Datadog Agent...${NC}"
sleep 3
remote_exec "sudo systemctl status datadog-agent --no-pager | head -20"

echo ""
echo -e "${GREEN}✅ Instrumentação do Datadog concluída!${NC}"
echo ""
echo "📋 Resumo:"
echo "   • Datadog Agent instalado e configurado"
echo "   • Tags configuradas: $TAG_ENV, $TAG_SERVICE, $TAG_VERSION"
echo "   • Integração do Tomcat configurada"
echo "   • Integração JMX configurada"
echo ""
echo "⚠️  Próximos passos:"
echo "   1. Se o Tomcat estiver rodando, reinicie-o para aplicar as configurações JMX:"
echo "      sudo systemctl restart tomcat"
echo "   2. Verifique os logs do Datadog Agent:"
echo "      sudo tail -f /var/log/datadog/agent.log"
echo "   3. Verifique as métricas no Datadog Dashboard"
echo ""

