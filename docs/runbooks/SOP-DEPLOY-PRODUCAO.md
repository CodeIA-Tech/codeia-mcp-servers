# SOP - Deploy de Aplicação em Produção

**Versão:** 2.0.0  
**Data:** 7 de novembro de 2025  
**Autor:** Equipe SRE - Vertem  
**Status:** Ativo

---

## 📋 Índice

- [1. Objetivo](#1-objetivo)
- [2. Escopo](#2-escopo)
- [3. Pré-requisitos](#3-pr-requisitos)
- [4. Procedimento](#4-procedimento)
- [5. Validação](#5-validao)
- [6. Rollback](#6-rollback)
- [7. Troubleshooting](#7-troubleshooting)
- [8. Responsabilidades](#8-responsabilidades)

---

## 1. Objetivo

Definir o procedimento padrão para deploy seguro de aplicações em ambiente de produção.

---

## 2. Escopo

Este SOP aplica-se a todos os deploys de aplicações backend e frontend nos ambientes de produção AWS e on-premises.

---

## 3. Procedimento de Deploy


### 3.1 Pré-Deploy

- [ ] Code review aprovado
- [ ] Testes automatizados passando (100%)
- [ ] Documentação atualizada
- [ ] Backup do ambiente atual

### 3.2 Deploy

1. **Comunicar** no Slack #deployments
2. **Criar** tag de release no Git
3. **Executar** pipeline de CI/CD
4. **Monitorar** métricas durante deploy
5. **Validar** healthchecks

### 3.3 Pós-Deploy

- [ ] Smoke tests executados
- [ ] Métricas normais
- [ ] Logs sem erros críticos
- [ ] Comunicar sucesso


---

## 4. Responsabilidades

### 4.1 Time SRE

**Responsabilidades:**

- Executar deploy seguindo SOP
- Monitorar métricas durante processo
- Realizar rollback se necessário
- Documentar problemas encontrados


---

### 4.2 Desenvolvimento

**Responsabilidades:**

- Garantir qualidade do código
- Participar de code reviews
- Estar disponível durante deploy
- Corrigir bugs identificados


---

## 5. Processo


### Fluxo do Processo

```
1. Preparação
   ↓
2. Validação (QA)
   ↓
3. Aprovação (Tech Lead)
   ↓
4. Deploy (SRE)
   ↓
5. Validação (Smoke Tests)
   ↓
6. Monitoramento (15 min)
```


---

## 6. Métricas e KPIs


- **Deployment Frequency:** Diária
- **Lead Time for Changes:** < 24h
- **MTTR:** < 1h
- **Change Failure Rate:** < 5%


---

## 7. Revisão e Atualização

### Ciclo de Revisão

| Frequência | Responsável | Atividade |
|------------|-------------|-----------|
| **Mensal** | Coordenador SRE | Revisar métricas de deploy |
| **Trimestral** | Time SRE + Dev | Atualizar procedimento |

---

## 📚 Referências


- [DORA Metrics](https://www.devops-research.com/research.html)
- [Deployment Best Practices](https://aws.amazon.com/builders-library/)
- [Blue-Green Deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)


---

## 📝 Histórico de Versões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 2.0.0 | 7 de novembro de 2025 | Equipe SRE - Vertem | Versão inicial do SOP |

---

## 📞 Contatos

**Equipe SRE Vertem:**
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

