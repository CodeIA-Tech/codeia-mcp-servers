{{#is_alert}}
### 🚨 **ALERTA: Disk I/O elevado no motor-porto-tomcat!**

**Impacto**: Gargalo de escrita/leitura pode gerar lentidão em operações críticas e causar timeouts.
**Severidade**: P3 – Observação (condição degradada moderada).

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Disk I/O (%)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: Disk I/O do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Disk I/O (%)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: Disk I/O normalizado no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Disk I/O (%)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [Infra Hosts](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [Disk Performance](https://app.datadoghq.com/metrics/summary?query=system.io.util)
- [APM Latency Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=latency)
- [Slow Traces](https://app.datadoghq.com/apm/traces?query=service%3Amotor-porto-tomcat)

