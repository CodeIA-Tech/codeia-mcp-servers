{{#is_alert}}
### 🚨 **ALERTA: Uso de memória elevado no motor-porto-tomcat!**

**Impacto**: Saturação de memória pode provocar garbage collections frequentes, latência alta e indisponibilidade do serviço.
**Severidade**: P2 – Performance degradada.

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Memória em uso**: {{value}}%
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**On-Call**: @oncall-customer-porto  
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: Uso de memória do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Memória em uso**: {{value}}%
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: Uso de memória normalizado no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Host**: {{host}}
**Memória em uso**: {{value}}%
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [JVM Metrics](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [Memory & Heap Analysis](https://app.datadoghq.com/apm/service/motor-porto-tomcat/resources?metrics=jvm)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat)


