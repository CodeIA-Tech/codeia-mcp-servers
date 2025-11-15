{{#is_alert}}
### 🚨 **ALERTA: Apdex Baixo (Satisfação do Usuário)!**

**Impacto**: Usuários insatisfeitos com a performance.
**Severidade**: P2 - Experiência Degradada.
##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: APDEX do Motor de Porto em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc 

{{/is_alert_to_warning}}

{{#is_alert_recovery}}

#### ✅ **RECUPERADO**: APDEX do Motor de Porto normalizado (satisfação do usuário OK).

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat%20duration%3A%3E1s)
- [JVM Metrics](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [Database Performance](https://app.datadoghq.com/apm/services)