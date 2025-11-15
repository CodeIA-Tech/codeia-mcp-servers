#!/bin/bash
#
# Script para verificar métricas JVM/GC/Heap na instância instrumentada
#

set -e

EC2_HOST="ec2-13-221-46-75.compute-1.amazonaws.com"
EC2_USER="ec2-user"
SSH_KEY="ec2-workflow-datadog.pem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SSH_KEY_PATH="$WORKSPACE_DIR/$SSH_KEY"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔍 Verificando Métricas JVM/GC/Heap${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Função para executar comandos remotos
remote_exec() {
    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o LogLevel=ERROR \
        -o ConnectTimeout=10 \
        "$EC2_USER@$EC2_HOST" "$@"
}

echo -e "${YELLOW}1. Status do Datadog Agent...${NC}"
AGENT_STATUS=$(remote_exec "sudo systemctl is-active datadog-agent 2>/dev/null || echo 'inactive'")
if [ "$AGENT_STATUS" = "active" ]; then
    echo -e "${GREEN}✅ Datadog Agent está rodando${NC}"
else
    echo -e "${RED}❌ Datadog Agent não está rodando${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Status do Tomcat...${NC}"
TOMCAT_STATUS=$(remote_exec "sudo systemctl is-active tomcat 2>/dev/null || echo 'inactive'")
if [ "$TOMCAT_STATUS" = "active" ]; then
    echo -e "${GREEN}✅ Tomcat está rodando${NC}"
else
    echo -e "${RED}❌ Tomcat não está rodando${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}3. Verificando porta JMX (9999)...${NC}"
JMX_LISTENING=$(remote_exec "sudo ss -tlnp | grep 9999 || echo 'not_listening'")
if [ "$JMX_LISTENING" != "not_listening" ]; then
    echo -e "${GREEN}✅ JMX está escutando na porta 9999${NC}"
    echo "   $JMX_LISTENING"
else
    echo -e "${RED}❌ JMX não está escutando na porta 9999${NC}"
fi

echo ""
echo -e "${YELLOW}4. Verificando configuração JMX no Datadog Agent...${NC}"
JMX_CONFIG=$(remote_exec "sudo cat /etc/datadog-agent/conf.d/jmx.d/conf.yaml 2>/dev/null || echo 'not_found'")
if [ "$JMX_CONFIG" != "not_found" ]; then
    echo -e "${GREEN}✅ Configuração JMX encontrada${NC}"
    echo "$JMX_CONFIG" | head -30
else
    echo -e "${RED}❌ Configuração JMX não encontrada${NC}"
fi

echo ""
echo -e "${YELLOW}5. Verificando métricas JVM coletadas pelo Agent...${NC}"
echo "   (Isso pode levar alguns segundos...)"
AGENT_STATUS_OUTPUT=$(remote_exec "sudo datadog-agent status 2>/dev/null || echo 'error'")

if [ "$AGENT_STATUS_OUTPUT" != "error" ]; then
    # Extrair métricas JVM/GC/Heap
    JVM_METRICS=$(echo "$AGENT_STATUS_OUTPUT" | grep -i "jvm\|gc\|heap" | head -20)
    if [ -n "$JVM_METRICS" ]; then
        echo -e "${GREEN}✅ Métricas JVM encontradas:${NC}"
        echo "$JVM_METRICS"
    else
        echo -e "${YELLOW}⚠️  Nenhuma métrica JVM encontrada no status do Agent${NC}"
        echo "   Verificando se JMX está coletando..."
    fi
else
    echo -e "${RED}❌ Erro ao obter status do Agent${NC}"
fi

echo ""
echo -e "${YELLOW}6. Verificando logs do Agent (últimas 50 linhas)...${NC}"
AGENT_LOGS=$(remote_exec "sudo tail -50 /var/log/datadog/agent.log 2>/dev/null | grep -i 'jmx\|gc\|jvm\|heap\|error' | tail -15 || echo 'no_logs'")
if [ "$AGENT_LOGS" != "no_logs" ] && [ -n "$AGENT_LOGS" ]; then
    echo "Logs relevantes:"
    echo "$AGENT_LOGS"
else
    echo -e "${YELLOW}⚠️  Nenhum log relevante encontrado${NC}"
fi

echo ""
echo -e "${YELLOW}7. Verificando processo Java do Tomcat...${NC}"
JAVA_PROCESS=$(remote_exec "sudo ps aux | grep -i 'tomcat\|java' | grep -v grep | head -2")
if [ -n "$JAVA_PROCESS" ]; then
    echo "Processo Java encontrado:"
    echo "$JAVA_PROCESS"
    
    # Extrair PID
    TOMCAT_PID=$(echo "$JAVA_PROCESS" | awk '{print $2}' | head -1)
    if [ -n "$TOMCAT_PID" ]; then
        echo ""
        echo -e "${YELLOW}8. Verificando variáveis JVM do processo (PID: $TOMCAT_PID)...${NC}"
        JVM_OPTS=$(remote_exec "sudo cat /proc/$TOMCAT_PID/cmdline 2>/dev/null | tr '\\0' ' ' || echo 'error'")
        if [ "$JVM_OPTS" != "error" ]; then
            echo "Opções JVM:"
            echo "$JVM_OPTS" | grep -oE '(-Xmx[^ ]*|-Xms[^ ]*|-XX:[^ ]*|javaagent[^ ]*)' | head -10
        fi
    fi
fi

echo ""
echo -e "${YELLOW}9. Verificando métricas específicas de GC...${NC}"
echo "   Métricas esperadas:"
echo "   - jvm.gc.parnew.time"
echo "   - jvm.gc.parnew.count"
echo "   - jvm.heap_memory.*"
echo ""
echo "   Para verificar no Datadog:"
echo "   https://app.datadoghq.com/metric/explorer?exp_metric=jvm.gc.parnew.time"
echo "   https://app.datadoghq.com/metric/explorer?exp_metric=jvm.heap_memory"

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Verificação concluída${NC}"
echo ""

