{{#is_alert}}
### 🚨 **ALERTA: Apdex Baixo (Satisfação do Usuário)!**

**Impacto**: Usuários insatisfeitos com a performance.
**Severidade**: P2 - Experiência Degradada.
##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 🔧 Ações
Segir o passo a passo abaixo: [Tratativas Datadog - Overview](https://grupoltm.visualstudio.com/B2B2C/_wiki/wikis/B2B2C.wiki/11523/Tratativas-Alertas-Datadog)
##### 👥 Escalation
**On-Call**: @oncall-customer-porto 
**Teams**: @teams-sre-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: APDEX do Motor de Porto em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}

#### ✅ **RECUPERADO**: APDEX do Motor de Porto normalizado (satisfação do usuário OK).

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Duração**: {{duration}}
**Horário**: {{date}}
##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - portoseguromiddleapprd](https://app.datadoghq.com/dashboard/k8a-mex-te4/sre-porto---portoseguromiddleapprd)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/portoseguromiddlewareapprd?view=latency)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3portoseguromiddlewareapprd%20duration%3A%3E1s)

- [Database Performance](https://app.datadoghq.com/apm/services)