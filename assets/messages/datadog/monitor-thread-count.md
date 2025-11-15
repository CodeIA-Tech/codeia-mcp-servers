{{#is_alert}}
### 🚨 **ALERTA: Thread count elevado no motor-porto-tomcat!**

**Impacto**: Número excessivo de threads pode indicar saturação do Tomcat e causar degradação de performance.
**Severidade**: P2 – Performance degradada.

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**On-Call**: @oncall-customer-porto  
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: Thread count do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: Thread count normalizado no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [Thread Pool Metrics](https://app.datadoghq.com/apm/service/motor-porto-tomcat/resources?metrics=jvm)
- [JVM Metrics](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat)


