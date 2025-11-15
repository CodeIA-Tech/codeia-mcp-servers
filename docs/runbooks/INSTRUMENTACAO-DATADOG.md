# Instrumentação do Datadog no Tomcat e EC2

Este guia descreve como realizar a instrumentação completa do Datadog no servidor Tomcat e na instância EC2, incluindo métricas, logs e APM (Application Performance Monitoring).

## 📋 Pré-requisitos

1. Chave SSH (`ec2-workflow-datadog.pem`) no diretório raiz do workspace
2. Arquivo `.env` com `DATADOG_API_KEY` configurada (ou variável de ambiente)
3. Acesso SSH à instância EC2

## 🚀 Execução

### Passo 1: Instrumentação Básica (Métricas e JMX)

Execute o script de instrumentação básica:

```bash
./scripts/instrument-datadog-tomcat.sh
```

Este script configura:
- Datadog Agent
- Tags da instância e aplicação
- Integração do Tomcat (métricas)
- Integração JMX (métricas detalhadas)

### Passo 2: Instrumentação APM (Application Performance Monitoring)

Execute o script de instrumentação APM:

```bash
./scripts/instrument-datadog-apm-tomcat.sh
```

Este script configura:
- Java Agent do Datadog
- Rastreamento de transações (traces)
- Profiling de performance
- Injeção de logs
- Métricas de latência e throughput

## 🔧 O que os scripts fazem

### Script 1: `instrument-datadog-tomcat.sh`

#### 1. Instalação do Datadog Agent
- Verifica se o Datadog Agent já está instalado
- Instala o Agent 7 se necessário
- Configura o API Key automaticamente

#### 2. Configuração de Tags
Adiciona as seguintes tags à instância EC2:
- `env:prd`
- `service:tomcat-app`
- `version:1.0.0`
- Tags automáticas de metadados EC2 (instance_type, instance_id, availability_zone)

#### 3. Integração do Tomcat
- Configura a integração do Tomcat no Datadog Agent
- Monitora métricas do Tomcat na porta 8080

#### 4. Integração JMX
- Configura JMX no Tomcat (porta 9999)
- Habilita coleta de métricas via JMX
- Métricas coletadas:
  - Thread pools (max, busy, count)
  - Request processors (bytes, errors, requests, processing time)

#### 5. Configuração do Tomcat
- Adiciona variáveis de ambiente JMX no systemd
- Configura o Tomcat para expor métricas via JMX

### Script 2: `instrument-datadog-apm-tomcat.sh`

#### 1. Instalação do Java Agent
- Baixa e instala o Java Agent do Datadog (APM)
- Configura o caminho do agent: `/opt/datadog-agent/lib/libdd-java-agent.jar`

#### 2. Configuração do Java Agent
- Cria arquivo de configuração: `/etc/datadog-agent/java-agent.env`
- Configura variáveis:
  - `DD_SERVICE=tomcat-app`
  - `DD_ENV=prd`
  - `DD_VERSION=1.0.0`
  - `DD_LOGS_INJECTION=true`
  - `DD_PROFILING_ENABLED=true`
  - `DD_TRACE_SAMPLE_RATE=1.0`

#### 3. Integração com Tomcat
- Adiciona `-javaagent` ao `CATALINA_OPTS`
- Mescla configurações JMX e APM
- Configura via systemd

#### 4. Configuração APM no Datadog Agent
- Habilita APM no `datadog.yaml`
- Configura porta APM (8126)
- Reinicia o Datadog Agent

#### 5. Funcionalidades APM Habilitadas
- **Distributed Tracing**: Rastreamento de transações distribuídas
- **Performance Profiling**: Análise de performance do código
- **Log Injection**: Injeção de trace IDs nos logs
- **Error Tracking**: Rastreamento de erros e exceções
- **Database Query Tracing**: Rastreamento de queries de banco de dados

## 📊 Tags Aplicadas

### Instância EC2
- `env:prd` - Ambiente de produção
- `service:tomcat-app` - Serviço Tomcat
- `version:1.0.0` - Versão da aplicação
- `instance_type:*` - Tipo da instância EC2
- `instance_id:*` - ID da instância EC2
- `availability_zone:*` - Zona de disponibilidade

### Aplicação Tomcat
- `env:prd`
- `service:tomcat-app`
- `version:1.0.0`

## ⚙️ Configurações

### Arquivos Criados/Modificados

#### Script 1 (`instrument-datadog-tomcat.sh`)

1. **`/etc/datadog-agent/datadog.yaml`**
   - API Key
   - Tags da instância
   - Site do Datadog

2. **`/etc/datadog-agent/conf.d/tomcat.d/conf.yaml`**
   - Configuração da integração do Tomcat
   - Tags da aplicação

3. **`/etc/datadog-agent/conf.d/jmx.d/conf.yaml`**
   - Configuração JMX
   - Métricas coletadas

4. **`/etc/systemd/system/tomcat.service.d/datadog-jmx.conf`**
   - Variáveis de ambiente JMX
   - Configurações do Tomcat

#### Script 2 (`instrument-datadog-apm-tomcat.sh`)

5. **`/opt/datadog-agent/lib/libdd-java-agent.jar`**
   - Java Agent do Datadog (APM)
   - Versão: 1.55.0+

6. **`/etc/datadog-agent/java-agent.env`**
   - Configuração do Java Agent
   - Variáveis de ambiente APM

7. **`/etc/systemd/system/tomcat.service.d/datadog.conf`**
   - Configuração unificada (JMX + APM)
   - Java Agent configurado no `CATALINA_OPTS`

8. **`/etc/datadog-agent/datadog.yaml`** (atualizado)
   - Configuração APM habilitada
   - Porta APM: 8126

## 🔄 Próximos Passos

Após a execução dos scripts:

1. **Reiniciar o Tomcat** (obrigatório para aplicar APM):
   ```bash
   sudo systemctl restart tomcat
   ```

2. **Verificar logs do Tomcat** (confirmar que o Java Agent iniciou):
   ```bash
   sudo journalctl -u tomcat -n 50 | grep -i datadog
   ```

3. **Verificar logs do Datadog Agent**:
   ```bash
   sudo tail -f /var/log/datadog/agent.log
   ```

4. **Verificar status do Agent**:
   ```bash
   sudo systemctl status datadog-agent
   ```

5. **Verificar métricas no Datadog Dashboard**:
   - Acesse: https://app.datadoghq.com
   - Navegue para: Infrastructure > Hosts
   - Procure pela instância EC2 com as tags configuradas

6. **Verificar Traces APM**:
   - Acesse: https://app.datadoghq.com/apm/traces
   - Filtre por: `service:tomcat-app`, `env:prd`
   - Visualize distribuições de latência, throughput e erros

7. **Verificar Profiling**:
   - Acesse: https://app.datadoghq.com/profiling
   - Analise performance do código Java

## 📝 Verificações

### Verificar Tags
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo datadog-agent tag show"
```

### Verificar Configuração JMX
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo cat /etc/datadog-agent/conf.d/jmx.d/conf.yaml"
```

### Verificar Configuração APM
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo cat /etc/datadog-agent/java-agent.env"
```

### Verificar Java Agent no Tomcat
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo cat /etc/systemd/system/tomcat.service.d/datadog.conf"
```

### Verificar Status do Tomcat
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo systemctl status tomcat"
```

### Verificar se o Java Agent está ativo
```bash
ssh -i ec2-workflow-datadog.pem ec2-user@ec2-3-84-217-192.compute-1.amazonaws.com \
  "sudo journalctl -u tomcat -n 100 | grep -i 'datadog\|dd-java-agent'"
```

## 🐛 Troubleshooting

### Datadog Agent não está coletando métricas
1. Verifique os logs: `sudo tail -f /var/log/datadog/agent.log`
2. Execute: `sudo datadog-agent status`
3. Verifique se o API Key está correto: `sudo cat /etc/datadog-agent/datadog.yaml | grep api_key`

### JMX não está funcionando
1. Verifique se o Tomcat foi reiniciado após a configuração
2. Verifique se a porta 9999 está aberta: `sudo netstat -tlnp | grep 9999`
3. Verifique as variáveis de ambiente: `sudo systemctl show tomcat | grep CATALINA_OPTS`

### Tags não aparecem no Datadog
1. Aguarde alguns minutos para a sincronização
2. Verifique as tags locais: `sudo datadog-agent tag show`
3. Reinicie o Agent: `sudo systemctl restart datadog-agent`

### APM não está coletando traces
1. Verifique se o Tomcat foi reiniciado após a configuração APM
2. Verifique os logs do Tomcat: `sudo journalctl -u tomcat -n 100 | grep -i datadog`
3. Verifique se o Java Agent está no CATALINA_OPTS: `sudo systemctl show tomcat | grep CATALINA_OPTS`
4. Verifique a porta APM: `sudo netstat -tlnp | grep 8126`
5. Verifique os logs do Agent: `sudo tail -f /var/log/datadog/agent.log | grep -i apm`

### Java Agent não está iniciando
1. Verifique se o arquivo existe: `sudo ls -lh /opt/datadog-agent/lib/libdd-java-agent.jar`
2. Verifique permissões: `sudo chmod 644 /opt/datadog-agent/lib/libdd-java-agent.jar`
3. Teste o Java Agent manualmente: `sudo java -jar /opt/datadog-agent/lib/libdd-java-agent.jar --version`

## 📚 Referências

- [Documentação do Datadog Agent](https://docs.datadoghq.com/agent/)
- [Integração do Tomcat](https://docs.datadoghq.com/integrations/tomcat/)
- [Integração JMX](https://docs.datadoghq.com/integrations/java/)

