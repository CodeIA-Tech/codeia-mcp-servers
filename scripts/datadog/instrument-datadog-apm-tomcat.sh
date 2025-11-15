#!/bin/bash
#
# Script para instrumentação APM do Datadog no Tomcat (Java Agent)
# Uso: ./scripts/instrument-datadog-apm-tomcat.sh
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

# Tags do Datadog
TAG_ENV="env:prd"
TAG_SERVICE="service:tomcat-app"
TAG_VERSION="version:1.0.0"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Instrumentação APM do Datadog no Tomcat${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar se a chave SSH existe
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ Erro: Chave SSH não encontrada em: $SSH_KEY_PATH${NC}"
    exit 1
fi

# Ajustar permissões da chave SSH
chmod 600 "$SSH_KEY_PATH"

# Carregar variáveis de ambiente do .env se existir
if [ -f "$WORKSPACE_DIR/.env" ]; then
    export $(grep -v '^#' "$WORKSPACE_DIR/.env" | grep '=' | xargs)
fi

echo "📋 Configurações:"
echo "   • Host: $EC2_HOST"
echo "   • Usuário: $EC2_USER"
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

echo -e "${YELLOW}🔍 Verificando conexão SSH...${NC}"
if ! remote_exec "echo 'Conexão OK'"; then
    echo -e "${RED}❌ Erro: Não foi possível conectar ao servidor${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Conexão estabelecida${NC}"
echo ""

# Verificar se o Datadog Agent está instalado
echo -e "${YELLOW}🔍 Verificando instalação do Datadog Agent...${NC}"
DD_AGENT_INSTALLED=$(remote_exec "command -v datadog-agent || echo 'not_installed'")

if [ "$DD_AGENT_INSTALLED" = "not_installed" ]; then
    echo -e "${RED}❌ Datadog Agent não está instalado${NC}"
    echo -e "${YELLOW}   Execute primeiro: ./scripts/instrument-datadog-tomcat.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Datadog Agent está instalado${NC}"

# Verificar se o Java Agent do Datadog já está instalado
echo ""
echo -e "${YELLOW}🔍 Verificando Java Agent do Datadog...${NC}"
DD_JAVA_AGENT_PATH="/opt/datadog-agent/lib/libdd-java-agent.jar"

if remote_exec "sudo test -f $DD_JAVA_AGENT_PATH"; then
    echo -e "${GREEN}✅ Java Agent do Datadog encontrado${NC}"
else
    echo -e "${YELLOW}📦 Baixando Java Agent do Datadog...${NC}"
    
    # Baixar o Java Agent
    remote_exec "sudo mkdir -p /opt/datadog-agent/lib"
    remote_exec "sudo curl -L https://dtdg.co/latest-java-tracer -o /tmp/dd-java-agent.jar"
    remote_exec "sudo mv /tmp/dd-java-agent.jar $DD_JAVA_AGENT_PATH"
    remote_exec "sudo chmod 644 $DD_JAVA_AGENT_PATH"
    
    echo -e "${GREEN}✅ Java Agent baixado${NC}"
fi

# Verificar versão do Java Agent
JAVA_AGENT_VERSION=$(remote_exec "sudo java -jar $DD_JAVA_AGENT_PATH --version 2>&1 | head -1 || echo 'unknown'")
echo "   • Versão do Java Agent: $JAVA_AGENT_VERSION"

# Configurar variáveis de ambiente do Java Agent
echo ""
echo -e "${YELLOW}📝 Configurando variáveis de ambiente do Java Agent...${NC}"

# Verificar se o DD_SERVICE está configurado (usar service:tomcat-app sem o prefixo)
DD_SERVICE_NAME="tomcat-app"

# Obter DD_API_KEY do datadog.yaml
DD_API_KEY=$(remote_exec "sudo cat /etc/datadog-agent/datadog.yaml 2>/dev/null | grep '^api_key:' | awk '{print \$2}' || echo ''")

if [ -z "$DD_API_KEY" ]; then
    # Tentar obter do .env local
    DD_API_KEY="${DATADOG_API_KEY:-${DD_API_KEY:-}}"
    
    if [ -z "$DD_API_KEY" ]; then
        echo -e "${RED}❌ DD_API_KEY não encontrado${NC}"
        exit 1
    fi
fi

# Obter DD_SITE do datadog.yaml ou usar padrão
DD_SITE=$(remote_exec "sudo cat /etc/datadog-agent/datadog.yaml 2>/dev/null | grep '^site:' | awk '{print \$2}' || echo 'datadoghq.com'")

# Criar arquivo de configuração do Java Agent
remote_exec "sudo bash -c 'cat > /etc/datadog-agent/java-agent.env << EOF
# Configuração do Java Agent do Datadog
DD_SERVICE=$DD_SERVICE_NAME
DD_ENV=prd
DD_VERSION=1.0.0
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
DD_LOGS_INJECTION=true
DD_PROFILING_ENABLED=true
DD_TRACE_SAMPLE_RATE=1.0
DD_TRACE_STARTUP_LOGS=true
DD_TAGS=env:prd,service:tomcat-app,version:1.0.0
EOF
'"

echo -e "${GREEN}✅ Variáveis de ambiente configuradas${NC}"

# Configurar o Tomcat para usar o Java Agent
echo ""
echo -e "${YELLOW}📝 Configurando Tomcat para usar o Java Agent...${NC}"

# Verificar se o diretório do systemd do Tomcat existe
remote_exec "sudo mkdir -p /etc/systemd/system/tomcat.service.d"

# Verificar configuração atual do CATALINA_OPTS
CURRENT_CATALINA_OPTS=$(remote_exec "sudo cat /etc/systemd/system/tomcat.service.d/*.conf 2>/dev/null | grep -i CATALINA_OPTS || echo ''")

# Preparar CATALINA_OPTS com Java Agent
JAVA_AGENT_OPTS="-javaagent:$DD_JAVA_AGENT_PATH"

# Verificar se o Java Agent já está configurado
HAS_JAVA_AGENT=$(remote_exec "sudo grep -q 'javaagent:$DD_JAVA_AGENT_PATH' /etc/systemd/system/tomcat.service.d/*.conf 2>/dev/null && echo 'yes' || echo 'no'")

if [ "$HAS_JAVA_AGENT" = "no" ]; then
    # Verificar se já existe configuração do CATALINA_OPTS
    if [ -n "$CURRENT_CATALINA_OPTS" ]; then
        # Adicionar Java Agent às opções existentes
        remote_exec "sudo bash -c 'cat > /etc/systemd/system/tomcat.service.d/datadog-java-agent.conf << EOF
[Service]
# Configuração JMX (se existir)
$CURRENT_CATALINA_OPTS
# Java Agent do Datadog para APM
Environment=\"CATALINA_OPTS=\${CATALINA_OPTS} $JAVA_AGENT_OPTS\"
EOF
'"
    else
        # Criar nova configuração
        remote_exec "sudo bash -c 'cat > /etc/systemd/system/tomcat.service.d/datadog-java-agent.conf << EOF
[Service]
# Java Agent do Datadog para APM
Environment=\"CATALINA_OPTS=$JAVA_AGENT_OPTS\"
EOF
'"
    fi
    
    echo -e "${GREEN}✅ Java Agent configurado no Tomcat${NC}"
else
    echo -e "${GREEN}✅ Java Agent já está configurado no Tomcat${NC}"
fi

# Verificar se o arquivo de configuração JMX existe e mesclar se necessário
if remote_exec "sudo test -f /etc/systemd/system/tomcat.service.d/datadog-jmx.conf"; then
    echo -e "${YELLOW}📝 Mesclando configurações JMX e Java Agent...${NC}"
    
    # Ler configuração JMX
    JMX_CONFIG=$(remote_exec "sudo cat /etc/systemd/system/tomcat.service.d/datadog-jmx.conf")
    
    # Criar arquivo unificado
    remote_exec "sudo bash -c 'cat > /etc/systemd/system/tomcat.service.d/datadog.conf << EOF
[Service]
# Configuração JMX do Datadog
$JMX_CONFIG
# Java Agent do Datadog para APM
Environment=\"CATALINA_OPTS=\${CATALINA_OPTS} $JAVA_AGENT_OPTS\"
EOF
'"
    
    # Remover arquivos individuais
    remote_exec "sudo rm -f /etc/systemd/system/tomcat.service.d/datadog-jmx.conf /etc/systemd/system/tomcat.service.d/datadog-java-agent.conf"
    
    echo -e "${GREEN}✅ Configurações mescladas${NC}"
fi

# Recarregar systemd
remote_exec "sudo systemctl daemon-reload"

# Verificar status do Tomcat
echo ""
echo -e "${YELLOW}🔍 Verificando status do Tomcat...${NC}"
TOMCAT_STATUS=$(remote_exec "sudo systemctl is-active tomcat 2>/dev/null || echo 'inactive'")

if [ "$TOMCAT_STATUS" = "active" ]; then
    echo -e "${GREEN}✅ Tomcat está rodando${NC}"
    echo -e "${YELLOW}⚠️  O Tomcat precisa ser reiniciado para aplicar a instrumentação APM${NC}"
    echo ""
    echo "Para reiniciar o Tomcat, execute:"
    echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo systemctl restart tomcat'"
else
    echo -e "${YELLOW}⚠️  Tomcat não está rodando${NC}"
    echo "   A instrumentação será aplicada quando o Tomcat iniciar"
fi

# Verificar se o APM está habilitado no Datadog Agent
echo ""
echo -e "${YELLOW}🔍 Verificando configuração do APM no Datadog Agent...${NC}"

# Verificar se o APM está habilitado
APM_ENABLED=$(remote_exec "sudo cat /etc/datadog-agent/datadog.yaml 2>/dev/null | grep -i '^apm_config:' -A 5 | grep -i 'enabled:' | awk '{print \$2}' || echo 'true'")

if [ "$APM_ENABLED" != "false" ]; then
    echo -e "${GREEN}✅ APM está habilitado no Datadog Agent${NC}"
    
    # Verificar se a porta APM está configurada
    APM_PORT=$(remote_exec "sudo cat /etc/datadog-agent/datadog.yaml 2>/dev/null | grep -i 'apm_config:' -A 10 | grep -i 'apm_non_local_traffic:' | awk '{print \$2}' || echo 'false'")
    
    if [ "$APM_PORT" = "false" ]; then
        echo -e "${YELLOW}📝 Configurando APM para aceitar tráfego local...${NC}"
        
        # Adicionar configuração APM se não existir
        if ! remote_exec "sudo grep -q '^apm_config:' /etc/datadog-agent/datadog.yaml"; then
            remote_exec "sudo bash -c 'cat >> /etc/datadog-agent/datadog.yaml << EOF

# Configuração APM
apm_config:
  enabled: true
  apm_non_local_traffic: false
EOF
'"
        fi
    fi
else
    echo -e "${YELLOW}📝 Habilitando APM no Datadog Agent...${NC}"
    remote_exec "sudo bash -c 'cat >> /etc/datadog-agent/datadog.yaml << EOF

# Configuração APM
apm_config:
  enabled: true
  apm_non_local_traffic: false
EOF
'"
fi

# Reiniciar Datadog Agent para aplicar configurações APM
echo ""
echo -e "${YELLOW}🔄 Reiniciando Datadog Agent...${NC}"
remote_exec "sudo systemctl restart datadog-agent"

sleep 3
echo -e "${GREEN}✅ Datadog Agent reiniciado${NC}"

# Verificar status do Agent
echo ""
echo -e "${YELLOW}🔍 Verificando status do Datadog Agent...${NC}"
remote_exec "sudo systemctl status datadog-agent --no-pager | head -15"

echo ""
echo -e "${GREEN}✅ Instrumentação APM do Datadog concluída!${NC}"
echo ""
echo "📋 Resumo:"
echo "   • Java Agent do Datadog instalado: $DD_JAVA_AGENT_PATH"
echo "   • Versão: $JAVA_AGENT_VERSION"
echo "   • Configuração: /etc/datadog-agent/java-agent.env"
echo "   • Tomcat configurado para usar Java Agent"
echo "   • APM habilitado no Datadog Agent"
echo ""
echo "⚠️  Próximos passos:"
echo "   1. Reinicie o Tomcat para aplicar a instrumentação:"
echo "      ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo systemctl restart tomcat'"
echo ""
echo "   2. Verifique os logs do Tomcat para confirmar que o Java Agent iniciou:"
echo "      ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'sudo journalctl -u tomcat -n 50 | grep -i datadog'"
echo ""
echo "   3. Verifique os traces no Datadog:"
echo "      https://app.datadoghq.com/apm/traces"
echo ""
echo "   4. Verifique as métricas APM no Datadog Dashboard"
echo ""

