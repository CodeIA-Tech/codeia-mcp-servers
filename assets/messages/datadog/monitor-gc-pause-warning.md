{{#is_alert}}
### 🚨 **ALERTA: GC pause time elevado no motor-porto-tomcat!**

**Impacto**: Pausas longas do Garbage Collector podem aumentar a latência e afetar a experiência do usuário.
**Severidade**: P3 – Observação (performance degradada moderadamente).

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**GC Pause (ms)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: GC pause time do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**GC Pause (ms)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: GC pause time normalizado no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**GC Pause (ms)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [JVM Metrics](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [GC Analysis](https://app.datadoghq.com/apm/service/motor-porto-tomcat/resources?metrics=jvm.gc)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat)


