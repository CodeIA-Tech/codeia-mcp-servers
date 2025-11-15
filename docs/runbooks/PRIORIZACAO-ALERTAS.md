# 🚨 Priorização de Alertas - Vertem

**Versão:** 1.0.0  
**Data:** Novembro 2025  
**Autor:** Equipe SRE - Vertem  
**Status:** Ativo

---

## 📋 Índice

- [1. Objetivo](#1-objetivo)
- [2. Escopo](#2-escopo)
- [3. Níveis de Severidade](#3-níveis-de-severidade)
- [4. Matriz de Priorização](#4-matriz-de-priorização)
- [5. Tempos de Resposta (SLA)](#5-tempos-de-resposta-sla)
- [6. Critérios de Classificação](#6-critérios-de-classificação)
- [7. Fluxo de Escalação](#7-fluxo-de-escalação)
- [8. Exemplos Práticos](#8-exemplos-práticos)
- [9. Responsabilidades](#9-responsabilidades)
- [10. Revisão e Atualização](#10-revisão-e-atualização)

---

## 1. Objetivo

Definir critérios claros e objetivos para priorização de alertas de monitoramento, garantindo:

- ✅ Resposta rápida e eficiente a incidentes
- ✅ Otimização do uso de recursos da equipe
- ✅ Redução de fadiga de alertas (alert fatigue)
- ✅ Alinhamento com impacto no negócio
- ✅ Melhoria contínua da disponibilidade dos serviços

---

## 2. Escopo

Esta documentação aplica-se a:

- **Plataformas:** Datadog, AWS CloudWatch
- **Ambientes:** Produção
- **Serviços:** APIs, Aplicações Web, Bancos de Dados, Infraestrutura
- **Times:** SRE, Infra Cloud e Desenvolvimento

---

## 3. Níveis de Severidade

### 🔴 P1 - CRÍTICO

**Definição:** Indisponibilidade total ou perda de funcionalidade crítica afetando clientes em produção.

**Características:**
- Serviço completamente indisponível
- Perda de dados iminente ou ocorrendo
- Violação de SLA crítico
- Impacto financeiro significativo
- Exposição de segurança crítica

**Exemplos:**
- API principal retornando 100% de erros 5xx
- Database down em produção
- Aplicação web inacessível
- Breach de segurança detectado
- Perda de dados em progresso

**Ação Requerida:** 
- ⚡ **Resposta imediata** (24/7)
- 📞 Acionamento de plantão
- 🚨 Comunicação para stakeholders
- 📊 War room se necessário

---

### 🟠 P2 - ALTO

**Definição:** Degradação significativa de serviço ou funcionalidade afetando múltiplos usuários.

**Características:**
- Serviço operando com degradação
- Funcionalidades importantes indisponíveis
- Performance severamente impactada
- Impacto em múltiplos clientes
- Possibilidade de escalar para P1

**Exemplos:**
- Latência de API acima de 2000ms (P95)
- Taxa de erro entre 10-25%
- Fila de processamento travada
- CPU consistentemente acima de 90%
- Memória próxima ao limite

**Ação Requerida:**
- 🔥 Resposta prioritária (horário comercial)
- 📱 Notificação de plantão fora do horário
- 📝 Acompanhamento ativo
- 🔄 Updates regulares

---

### 🟡 P3 - MÉDIO

**Definição:** Problema que afeta funcionalidade secundária ou número limitado de usuários.

**Características:**
- Funcionalidade não-crítica afetada
- Workaround disponível
- Impacto limitado a poucos usuários
- Sem risco de escalar para P2
- Recursos redundantes disponíveis

**Exemplos:**
- Cache miss rate elevado
- Disco acima de 75% em servidor não-crítico
- Latência entre 1000-2000ms
- Instância secundária indisponível (com redundância)
- Taxa de erro entre 5-10%

**Ação Requerida:**
- 📅 Resposta em horário comercial
- 📧 Notificação via email/Teams
- 📈 Monitoramento contínuo
- 🔍 Investigação programada

---

### 🟢 P4 - BAIXO

**Definição:** Alertas informativos ou de tendências que não requerem ação imediata.

**Características:**
- Alertas informativos
- Tendências que precisam atenção
- Métricas fora do ideal mas aceitáveis
- Prevenção de problemas futuros
- Otimizações recomendadas

**Exemplos:**
- Disco acima de 60%
- Memória acima de 70%
- Certificado SSL expira em 30 dias
- Backup completou com warnings
- Performance abaixo do ideal

**Ação Requerida:**
- 📋 Revisar em daily/weekly
- 📊 Incluir em relatórios
- 🔧 Agendar manutenção preventiva
- 📝 Documentar para futuras melhorias

---

### ⚪ P5 - INFORMATIVO

**Definição:** Notificações que não requerem ação, apenas registro.

**Características:**
- Eventos esperados
- Mudanças planejadas
- Logs de auditoria
- Métricas normais
- Status de sucesso

**Exemplos:**
- Deploy concluído com sucesso
- Backup completou normalmente
- Scaling automático executado
- Healthcheck passou
- Manutenção programada iniciou

**Ação Requerida:**
- 📚 Apenas registro/log
- 📈 Análise em retrospectivas
- ✅ Validação de processos

---

## 4. Matriz de Priorização

### Tabela de Decisão Rápida

| Impacto | Urgência | Prioridade | Tempo Resposta |
|---------|----------|------------|----------------|
| **Alto** | **Alta** | 🔴 P1 | Imediato (0-15min) |
| **Alto** | **Média** | 🟠 P2 | 30 min - 2h |
| **Médio** | **Alta** | 🟠 P2 | 30 min - 2h |
| **Médio** | **Média** | 🟡 P3 | 4h - 1 dia útil |
| **Baixo** | **Alta** | 🟡 P3 | 4h - 1 dia útil |
| **Baixo** | **Média** | 🟢 P4 | 1-3 dias úteis |
| **Baixo** | **Baixa** | ⚪ P5 | Sem prazo |

### Critérios de Impacto

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| **Alto** | Afeta produção e clientes externos | API principal, Database principal, Aplicação web |
| **Médio** | Afeta operação interna ou funcionalidades secundárias | Dashboards internos, Reports, Backups |
| **Baixo** | Sem impacto direto em operação | Métricas, Logs, Ambientes de dev/staging |

### Critérios de Urgência

| Nível | Descrição | Tempo até Impacto Crítico |
|-------|-----------|---------------------------|
| **Alta** | Problema atual afetando usuários | Já está acontecendo |
| **Média** | Problema iminente (pode piorar) | Menos de 4 horas |
| **Baixa** | Tendência ou risco futuro | Mais de 24 horas |

---

## 5. Tempos de Resposta (SLA)

### SLA por Prioridade

| Prioridade | Tempo de Resposta | Tempo de Resolução | Horário |
|------------|-------------------|-------------------|---------|
| 🔴 **P1** | **15 minutos** | 4 horas | 24x7 |
| 🟠 **P2** | **30 minutos** | 8 horas | 24x7 |
| 🟡 **P3** | **4 horas** | 2 dias úteis | Comercial |
| 🟢 **P4** | **1 dia útil** | 5 dias úteis | Comercial |
| ⚪ **P5** | Sem SLA | Sem SLA | N/A |

### Definições

- **Tempo de Resposta:** Início da análise/troubleshooting
- **Tempo de Resolução:** Problema completamente resolvido ou mitigado
- **Horário Comercial:** Segunda a Sexta, 9h às 18h
- **Horário Extendido:** Segunda a Sexta, 18h às 22hs
- **24x7:** Plantão disponível incluindo fins de semana e feriados

---

## 6. Critérios de Classificação

### 6.1 Por Tipo de Recurso

#### Aplicações

| Métrica | P1 | P2 | P3 | P4 |
|---------|----|----|----|----|
| **Error Rate** | > 25% | 10-25% | 5-10% | 1-5% |
| **Latência (P95)** | > 5s | 2-5s | 1-2s | 500ms-1s |
| **Availability** | < 95% | 95-98% | 98-99% | 99-99.5% |
| **Request Rate** | Queda > 90% | Queda 50-90% | Queda 25-50% | Queda < 25% |

#### Infraestrutura

| Métrica | P1 | P2 | P3 | P4 |
|---------|----|----|----|----|
| **CPU** | > 95% por 15min | > 90% por 30min | > 80% por 1h | > 70% |
| **Memória** | > 95% | > 90% | > 85% | > 75% |
| **Disco** | > 95% | > 90% | > 85% | > 75% |
| **Network** | Packet loss > 5% | Loss 2-5% | Loss 1-2% | Loss < 1% |

#### Database

| Métrica | P1 | P2 | P3 | P4 |
|---------|----|----|----|----|
| **Connections** | > 95% pool | > 85% pool | > 75% pool | > 65% pool |
| **Query Time** | > 10s | 5-10s | 2-5s | 1-2s |
| **Replication Lag** | > 60s | 30-60s | 10-30s | 5-10s |
| **Deadlocks** | > 10/min | 5-10/min | 1-5/min | Ocasionais |

---

## 7. Fluxo de Escalação

A cadeia de escalação é dividida em dois cenários principais:

- **Incidentes de Infraestrutura:** atendimento primário pela Tivit em regime **24x7**. Durante o horário comercial (09h–18h) e horário estendido (18h–22h) o acompanhamento é dedicado; a partir das 22h a Tivit segue em modo de plantão. Quando não houver resposta dentro dos tempos definidos, o chamado escala para o plantão 24x7 da Vertem (SRE/Infra) e, na sequência, para lideranças.
- **Incidentes de Aplicação:** atendimento primário pelo time de desenvolvimento Vertem. Caso não haja resposta, as lideranças e diretoria são envolvidas progressivamente.

> **Uso de OnCall:**
> - 🔴 P1 – acionamento via Datadog OnCall (Call + SMS + Teams) em qualquer horário.
> - 🟠 P2 – acionamento via Datadog OnCall somente entre 09h e 22h (horário comercial + estendido). Fora dessa janela, o alerta deve ser reclassificado/reativado como P1 caso continue causando impacto.
> - 🟡 P3, 🟢 P4 e ⚪ P5 – notificações através de Microsoft Teams e e-mail; sem acionamento telefônico.

### 7.1 Incidentes de Aplicação (Vertem)

#### 🔴 P1 – Crítico (qualquer horário)
| Tempo | Ação | Canal |
|-------|------|-------|
| T0 | Datadog OnCall notifica Desenvolvedor(a) de plantão | Telefone + SMS + Teams |
| T0 + 10 min | Sem ack → Team Leader Dev + Team Leader SRE | Teams @mention + telefone |
| T0 + 30 min | Escalar Diretoria Vertem | Teams + telefone + e-mail |

#### 🟠 P2 – Alto (09h–22h)
| Tempo | Ação | Canal |
|-------|------|-------|
| T0 | Teams @channel para squad responsável + SRE | Teams |
| T0 + 15 min | Sem ack → Team Leader Dev + Team Leader Dev | Teams + telefone |
| T0 + 30 min | Sem solução → Coordenador(a) SRE/Infra + SRE Senior de plantão | Teams + telefone |
| T0 + 60 min | Persistindo → Diretoria TI Vertem | Teams + telefone |
| Após 22h | Reclassificar para P1 se houver impacto |  |

#### 🟡 P3 / 🟢 P4 / ⚪ P5 – Monitoramento Preventivo
- Notificação em Microsoft Teams (canal Vertem Dev/SRE) e e-mail.
- Acompanhamento durante horário comercial.
- Escalonar para liderança se não houver posicionamento em até 4h (P3) ou na daily seguinte (P4/P5).
- Registrar/atualizar ticket no Zendesk e manter histórico no follow-up diário.

### 7.2 Incidentes de Infraestrutura (Tivit + Vertem)

#### 🔴 P1 – Crítico (24x7)
| Tempo | Ação | Canal |
|-------|------|-------|
| T0 | Integração Zabbix aciona NOC Tivit + abre ticket (Zendesk) | Call + SMS + Teams + Zendesk |
| T0 + 10 min | Sem ack → Tivit N2/N3 | Telefone + Teams |
| T0 + 15 min | Sem resposta → Plantonista Vertem | Datadog OnCall |
| T0 + 30 min | Persistindo → Coordenador(a) SRE/Infra + SRE Seniors + Team Leader Dev | Teams + telefone |
| T0 + 45 min | Persistindo → Diretoria TI Vertem + comunicação ao cliente | Teams + telefone + e-mail |

#### 🟠 P2 – Alto (09h–22h)
| Tempo | Ação | Canal |
|-------|------|-------|
| T0 | Acionar Tivit via Teams + telefone (ou OnCall dentro da janela 09h–22h) | Teams + telefone |
| T0 + 15 min | Sem retorno → Escalar Tivit N2/N3 | Telefone + Teams |
| T0 + 30 min | Sem ack → Acionar Vertem SRE/Infra (Team Leader Dev + Lead SRE) | Teams |
| T0 + 60 min | Persistindo → Lead SRE + Team Leader Dev | Teams + telefone |
| Após 22h | Se incidente permanecer, reclassificar para P1 e acionar 24x7 | Datadog OnCall |

#### 🟡 P3 / 🟢 P4 / ⚪ P5 – Monitoramento Preventivo
- Ticket automático no Zendesk e notificação via Teams (canal Vertem/Tivit) e e-mail.
- SRE acompanha dentro do horário comercial; caso seja necessário, alinha com Tivit em horário estendido.
- Escalonar para liderança se não houver atualização em 4h (P3) ou na daily seguinte (P4/P5).

### Canais de Notificação

| Prioridade | Canal Principal | Janela | Destinatários | Observações |
|------------|-----------------|--------|---------------|-------------|
| 🔴 **P1** | Datadog OnCall (Call + SMS) + Teams @channel | 24x7 | Plantonista (Dev ou Infra) + Lideranças + Tivit (Infra) | Envolve cliente/diretoria quando necessário |
| 🟠 **P2** | Microsoft Teams @channel + telefone (OnCall 09h–22h) | Horário comercial + estendido (09h–22h) | Time responsável + Tivit (Infra) + Lideranças em caso de atraso | Fora da janela: reclassificar/reativar como P1 se impacto persistir |
| 🟡 **P3** | Microsoft Teams @channel + E-mail | Horário comercial | Time SRE + Squad responsável | Acompanhamento em até 4h; sem acionamento telefônico |
| 🟢 **P4** | Microsoft Teams (sem menção) + E-mail | Horário comercial | Time SRE + Squad responsável | Revisado em daily/weekly |
| ⚪ **P5** | Registro (Zendesk / Confluence) + E-mail informativo | N/A | Stakeholders interessados | Informativo; sem SLA |

---

## 8. Exemplos Práticos

### Caso 1: API Produção com Erros

**Cenário:** API de pagamentos retornando 30% de erro 503

**Análise:**
- ✅ Ambiente: Produção
- ✅ Impacto: Alto (clientes não conseguem pagar)
- ✅ Error Rate: > 25
%
- ✅ Urgência: Alta (já está acontecendo)

**Classificação:** 🔴 **P1 - CRÍTICO**

**Ação:**
1. Acionar plantão imediatamente (OnCall)
2. Iniciar troubleshooting
3. Comunicar stakeholders
4. Abrir war room se necessário
5. Documentar timeline do incidente

---

### Caso 2: Disco em 85% no Servidor Web

**Cenário:** Servidor web secundário com disco em 85%

**Análise:**
- ✅ Ambiente: Produção
- ⚠️ Impacto: Médio (servidor redundante disponível)
- ⚠️ Disco: 85% (não crítico ainda)
- ⚠️ Urgência: Média (pode piorar)

**Classificação:** 🟡 **P3 - MÉDIO**

**Ação:**
1. Criar ticket no sistema
2. Notificar time SRE via Microsoft Teams
3. Agendar limpeza de logs/arquivos
4. Monitorar crescimento

---

### Caso 3: Backup Completou com Warnings

**Cenário:** Backup diário completou mas com 3 warnings

**Análise:**
- ✅ Ambiente: Produção
- ⚠️ Impacto: Baixo (backup completou)
- ⚠️ Warnings: Não críticos
- ⚠️ Urgência: Baixa (investigação preventiva)

**Classificação:** 🟢 **P4 - BAIXO**

**Ação:**
1. Registrar no log
2. Incluir em daily standup
3. Investigar na próxima janela de manutenção
4. Ajustar configurações se necessário

---

### Caso 4: CPU em 92% por 45 minutos

**Cenário:** Servidor de aplicação com CPU em 92% constante

**Análise:**
- ✅ Ambiente: Produção
- ✅ Impacto: Alto (pode afetar performance)
- ✅ CPU: > 90% por > 30min
- ✅ Urgência: Alta (degradação atual)

**Classificação:** 🟠 **P2 - ALTO**

**Ação:**
1. Notificar plantonista (Datadog OnCall)
2. Iniciar investigação (processo, query, load)
3. Considerar scaling se necessário
4. Monitorar outras métricas
5. Atualizar status a cada 30min

---

## 9. Responsabilidades

### 9.1 Time SRE

**Responsabilidades:**
- ✅ Configurar e manter alertas no Datadog
- ✅ Responder a alertas conforme SLA
- ✅ Realizar troubleshooting e correção
- ✅ Documentar incidentes e RCAs
- ✅ Propor melhorias contínuas

**Horários:**
- **P1/P2:** Plantão 24x7 (escala de revezamento)
- **P3/P4:** Horário comercial

---

### 9.2 Coordenador SRE

**Responsabilidades:**
- ✅ Revisar e aprovar critérios de priorização
- ✅ Acompanhar incidentes P1 e P2
- ✅ Conduzir retrospectivas de incidentes
- ✅ Escalar para gerência quando necessário
- ✅ Garantir cumprimento de SLAs

---

### 9.3 Time de Desenvolvimento

**Responsabilidades:**
- ✅ Implementar instrumentação adequada
- ✅ Colaborar em troubleshooting de P1/P2
- ✅ Corrigir root causes identificados
- ✅ Participar de retrospectivas

---

### 9.4 Diretoria

**Responsabilidades:**
- ✅ Aprovar mudanças nos critérios
- ✅ Garantir recursos adequados para plantão
- ✅ Revisar relatórios de incidentes
- ✅ Tomar decisões de negócio em incidentes críticos

---

## 10. Revisão e Atualização

### Ciclo de Revisão

| Frequência | Responsável | Atividade |
|------------|-------------|-----------|
| **Mensal** | Coordenador SRE | Revisar métricas de alertas e SLA |
| **Trimestral** | Time SRE + Dev | Ajustar thresholds baseado em dados |
| **Semestral** | Diretoria + Coordenador SRE | Revisar documento completo |
| **Anual** | Diretoria | Aprovar mudanças estratégicas |

### Métricas de Acompanhamento

**KPIs a monitorar:**
- 📊 Taxa de alertas falso-positivos
- ⏱️ Tempo médio de resposta por prioridade
- ✅ Percentual de SLA cumprido
- 🔄 Número de escalações
- 📈 Tempo médio de resolução (MTTR)
- 🎯 Correlação entre prioridade e impacto real

---

## 📚 Referências

- [Google SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Datadog Alert Best Practices](https://docs.datadoghq.com/monitors/best-practices/)
- [ITIL Incident Management](https://www.axelos.com/certifications/itil-service-management)
- [AWS Well-Architected - Reliability](https://wa.aws.amazon.com/wat.pillar.reliability.en.html)

---

## 📝 Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | Nov 2025 | Equipe SRE | Versão inicial |

---

## 📞 Contatos

**Equipe SRE Vertem:**
- 📧 Email: sre@vertem.com
- 💬 Teams: #sre-team
- 🔗 Datadog OnCall: https://vertem.pagerduty.com

---

**Documento mantido por:** Equipe SRE - Vertem  
**Última atualização:** Novembro 2025
**Próxima revisão:** Fevereiro 2026

---

<p align="center">
  <strong>Vertem - Transformando tecnologia em resultados para seu negócio</strong>
</p>

