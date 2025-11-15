# Runbook - Troubleshooting API Gateway

**Versão:** 1.0.0  
**Data:** 7 de novembro de 2025  
**Autor:** Equipe SRE - Vertem  
**Status:** Ativo

---

## 📋 Índice



---

## 1. Objetivo

Guia de troubleshooting para problemas comuns no API Gateway.

---

## 2. Escopo

API Gateway em produção (AWS)

---

## 3. Troubleshooting


### Problema 1: Alta Latência

**Sintomas:**
- Latência P95 > 2000ms
- Clientes reportando lentidão

**Diagnóstico:**
```bash
# Verificar métricas no Datadog
aws cloudwatch get-metric-statistics --metric-name Latency

# Verificar logs
aws logs tail /aws/apigateway/prod --follow
```

**Solução:**
1. Identificar endpoint específico
2. Verificar caches
3. Analisar queries do database
4. Considerar scaling

### Problema 2: Erros 5xx

**Sintomas:**
- Taxa de erro > 5%
- Logs com stack traces

**Diagnóstico:**
```bash
# Verificar logs de erro
kubectl logs -l app=api-gateway --tail=100
```


---

## 4. Responsabilidades

### 4.1 Time SRE

**Responsabilidades:**
Executar troubleshooting

---

### 4.2 Desenvolvimento

**Responsabilidades:**
Corrigir bugs identificados

---

## 5. Processo

Seguir procedimentos descritos acima

---

## 6. Métricas e KPIs

MTTR < 1h para P1/P2

---

## 7. Revisão e Atualização

### Ciclo de Revisão

| Frequência | Responsável | Atividade |
|------------|-------------|-----------|
| **Mensal** | SRE | Atualizar troubleshooting |
| **Trimestral** | SRE + Dev | Revisar procedimentos |

---

## 📚 Referências

Documentação AWS API Gateway

---

## 📝 Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0.0 | 7 de novembro de 2025 | Equipe SRE - Vertem | Versão inicial |

---

## 📞 Contatos

**Equipe SRE:**
- 📧 Email: sre@vertem.com
- 💬 Slack: #sre-team
- 🔗 Site: https://vertem.com

---

**Documento mantido por:** Vertem  
**Última atualização:** 7 de novembro de 2025  
**Próxima revisão:** Fevereiro 2025

---

<p align="center">
  <strong>Vertem - Transformando tecnologia em resultados para seu negócio</strong><br>
  <a href="https://vertem.com">www.vertem.com</a>
</p>

