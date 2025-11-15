{{#is_alert}}
### 🚨 **ALERTA: Network saturation no motor-porto-tomcat!**

**Impacto**: Saturação de rede pode causar filas de requisições, retries e aumento de latência.
**Severidade**: P3 – Observação (degradação moderada).

##### 🔍 Informações do Incidente
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Tráfego (bytes/s)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert}}

{{#is_alert_to_warning}}
### ⚠️ AVISO: Network saturation do motor-porto-tomcat em nível de atenção.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Tráfego (bytes/s)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_to_warning}}

{{#is_alert_recovery}}
#### ✅ **RECUPERADO**: Network saturation normalizada no motor-porto-tomcat.

##### 🔍 Informações
**Ambiente**: {{env}}
**Serviço**: {{service}}
**Tráfego (bytes/s)**: {{value}}
**Host(s)**: {{host}}
**Duração**: {{duration}}
**Horário**: {{date}}

##### 👥 Escalation
**Teams**: @teams-sre-noc @teams-commarket-noc @teams-porto-noc

{{/is_alert_recovery}}

#### 📊 Links Úteis
- [Dashboard SRE - Motor de Porto](https://app.datadoghq.com/dashboard/i7f-cqg-7x6/sre-porto---motor-de-porto)
- [Network Usage](https://app.datadoghq.com/metrics/summary?query=system.net.bytes_sent)
- [Infra Hosts](https://app.datadoghq.com/infrastructure?filter=service%3Amotor-porto-tomcat)
- [APM Traffic Dashboard](https://app.datadoghq.com/apm/service/motor-porto-tomcat?view=throughput)
- [Service Map](https://app.datadoghq.com/apm/map?service=service%3Amotor-porto-tomcat)

