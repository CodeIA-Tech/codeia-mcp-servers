{{#is_alert}}
### 🚨 **ALERTA: GC major time elevado no motor-porto-tomcat!**

**Impacto**: Pausas prolongadas do Garbage Collector podem ampliar a latência das transações críticas do Motor de Porto.
**Severidade**: P2 – Performance degradada.

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**On-Call**: @oncall-customer-porto  
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: GC major time do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: GC major time normalizado no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat%20duration%3A%3E1s)
- [JVM Metrics](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [Database Performance](https://app.datadoghq.com/apm/services)


