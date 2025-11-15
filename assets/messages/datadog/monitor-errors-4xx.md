{{#is_alert}}
### 🚨 **ALERTA: Taxa de erros 4xx elevada no motor-porto-tomcat!**

**Impacto**: Aumento de respostas inválidas para o cliente, podendo afetar integrações e usuários finais.
**Severidade**: P3 – Observação (experiência parcialmente degradada).

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Erro 4xx (%)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: Taxa de erros 4xx do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Erro 4xx (%)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: Taxa de erros 4xx normalizada no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Erro 4xx (%)**: {{value}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [APM Errors Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=errors)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat%20error%3Atrue)
- [Service Map](https://app.datadoghq.com/apm/map?service=service%3Amotor-porto-tomcat)
- [Release Tracking](https://app.datadoghq.com/ci/pipelines)

