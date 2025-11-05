# Regras Específicas para ArgoCD e GitOps

## Agente GitOps Specialist

Quando trabalhar com ArgoCD, você deve:

### 1. Estrutura de Overlays

- **Organização**:
  ```
  gitops/
  ├── base/              # Recursos comuns
  ├── overlays/
  │   ├── dev/          # Customizações DEV
  │   ├── stg/          # Customizações STG
  │   └── prod/         # Customizações PROD
  └── argocd-project/   # Configurações ArgoCD
  ```

- **Kustomization**:
  - Mantenha `kustomization.yaml` atualizado
  - Use `patchesStrategicMerge` para mudanças específicas
  - Use `patchesJson6902` para patches precisos

### 2. Sync Policies

- **Configuração recomendada**:
  ```yaml
  syncPolicy:
    automated:
      prune: true           # Remove recursos deletados
      selfHeal: true        # Auto-correção de drift
      allowEmpty: false     # Não permitir aplicação vazia
    syncOptions:
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
      - ApplyOutOfSyncOnly=true
      - ServerSideApply=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ```

- **Para produção**:
  - Considere `automated: false` para mudanças críticas
  - Use sync windows para evitar deploys em horários críticos
  - Configure manual approval para ambientes sensíveis

### 3. Application Manifests

- **Variáveis de ambiente**:
  ```yaml
  spec:
    source:
      repoURL: https://github.com/org/repo.git
      path: gitops/overlays/${ENV}
      targetRevision: HEAD
    destination:
      server: https://kubernetes.default.svc
      namespace: ${ENV}
  ```

- **Ignore Differences**:
  ```yaml
  ignoreDifferences:
    - group: argoproj.io
      kind: Rollout
      jsonPointers:
        - /spec/replicas  # Replicas gerenciadas por HPA/KEDA
    - group: keda.sh
      kind: ScaledObject
      jsonPointers:
        - /status
  ```

### 4. AppProjects

- **Isolamento e RBAC**:
  ```yaml
  apiVersion: argoproj.io/v1alpha1
  kind: AppProject
  metadata:
    name: projeto-gitops
  spec:
    sourceRepos:
      - 'https://github.com/org/repo.git'
    destinations:
      - namespace: 'dev'
        server: https://kubernetes.default.svc
      - namespace: 'stg'
        server: https://kubernetes.default.svc
      - namespace: 'prod'
        server: https://kubernetes.default.svc
    roles:
      - name: read-only
        policies:
          - p, proj:projeto-gitops:read-only, applications, get, projeto-gitops/*, allow
  ```

### 5. Health Checks

- **Recursos suportados**:
  - Deployments, StatefulSets, DaemonSets
  - Services, Ingress
  - Custom Resources (CRDs)

- **Custom health checks**:
  - Configure health checks customizados para CRDs
  - Use annotations para melhorar detecção de saúde

### 6. Sync Waves

- **Ordem de sincronização**:
  ```yaml
  metadata:
    annotations:
      argocd.argoproj.io/sync-wave: "0"  # Pronto primeiro
      argocd.argoproj.io/sync-wave: "1"  # Depois
      argocd.argoproj.io/sync-wave: "-1" # Por último
  ```

- **Sync hooks**:
  ```yaml
  metadata:
    annotations:
      argocd.argoproj.io/hook: PreSync|Sync|PostSync
      argocd.argoproj.io/hook-delete-policy: HookSucceeded|HookFailed
  ```

### 7. Troubleshooting

- **Comandos úteis**:
  ```bash
  # Ver status da aplicação
  argocd app get <app-name>
  argocd app list
  
  # Ver histórico
  argocd app history <app-name>
  
  # Sync manual
  argocd app sync <app-name>
  argocd app sync <app-name> --prune
  
  # Ver diferenças
  argocd app diff <app-name>
  
  # Ver logs
  argocd app logs <app-name>
  argocd app logs <app-name> --tail=100
  ```

- **Verificar problemas**:
  ```bash
  # Ver eventos
  kubectl get events -n argocd --sort-by='.lastTimestamp'
  
  # Ver logs do ArgoCD
  kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
  ```

### 8. Best Practices

- **Versionamento**:
  - Use tags ou branches para versões específicas
  - Sempre use `targetRevision` explícito em produção
  - Documente mudanças em CHANGELOG

- **Rollback**:
  ```bash
  # Rollback via Git
  git revert HEAD
  git push
  
  # Rollback via ArgoCD
  argocd app rollback <app-name> <previous-revision>
  ```

- **Multi-cluster**:
  - Configure múltiplos destinations quando necessário
  - Use AppProjects para gerenciar múltiplos clusters
  - Configure cluster secrets apropriadamente

### 9. Observability

- **Métricas**:
  - ArgoCD expõe métricas Prometheus
  - Configure alertas para sync failures
  - Monitore health status das aplicações

- **Notificações**:
  - Configure webhooks para notificações
  - Integre com Slack, Teams, etc.
  - Configure alertas para sync failures críticos

