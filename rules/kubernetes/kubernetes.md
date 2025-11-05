# Regras Específicas para Kubernetes

## Agente Kubernetes Specialist

Quando trabalhar com recursos Kubernetes, você deve:

### 1. Validação e Segurança

- **Sempre validar antes de aplicar**:
  ```bash
  kubectl apply --dry-run=client -f arquivo.yaml
  kubectl diff -f arquivo.yaml
  ```

- **Usar namespaces apropriados**:
  - `dev` para desenvolvimento
  - `stg` para staging  
  - `prod` para produção
  - `argocd` para recursos do ArgoCD
  - `kube-system` apenas quando absolutamente necessário

### 2. Resource Management

- **Sempre definir `requests` e `limits`**:
  ```yaml
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
  ```

- **Auto-scaling**:
  - Use HorizontalPodAutoscaler ou KEDA para auto-scaling
  - Configure `minReplicaCount` apropriado (nunca 0 em produção)
  - Configure `maxReplicaCount` baseado em capacidade esperada

- **PodDisruptionBudgets**:
  - Sempre configure PDBs para aplicações críticas
  - Use `minAvailable` ou `maxUnavailable` conforme necessário

### 3. Secrets e ConfigMaps

- **Nunca hardcode secrets**:
  - Use Secrets do Kubernetes
  - Use External Secrets Operator quando possível
  - Versionar ConfigMaps com sufixo hash quando necessário

- **Boas práticas**:
  ```yaml
  # ✅ Correto
  env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
  
  # ❌ Incorreto
  env:
    - name: DB_PASSWORD
      value: "senha123"
  ```

### 4. Health Checks

- **Sempre configurar probes**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 30
    periodSeconds: 10
    timeoutSeconds: 5
    failureThreshold: 3
  
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
  
  startupProbe:
    httpGet:
      path: /startup
      port: 8080
    initialDelaySeconds: 0
    periodSeconds: 10
    failureThreshold: 30
  ```

### 5. Labels e Annotations

- **Labels obrigatórias**:
  ```yaml
  labels:
    app: nome-da-app
    version: v1.0.0
    managed-by: kustomize
    environment: dev|stg|prod
  ```

- **Annotations úteis**:
  ```yaml
  annotations:
    description: "Descrição do recurso"
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
  ```

### 6. Troubleshooting

- **Comandos úteis**:
  ```bash
  # Ver logs
  kubectl logs <pod> -n <namespace>
  kubectl logs <pod> -n <namespace> --previous
  
  # Descrever recurso
  kubectl describe pod <pod> -n <namespace>
  
  # Ver eventos
  kubectl get events -n <namespace> --sort-by='.lastTimestamp'
  
  # Debug
  kubectl exec -it <pod> -n <namespace> -- /bin/sh
  kubectl port-forward <pod> 8080:8080 -n <namespace>
  ```

### 7. RBAC e Segurança

- **ServiceAccounts**:
  - Use ServiceAccounts específicos por aplicação
  - Privilégios mínimos necessários
  - Nunca use `default` ServiceAccount para aplicações

- **Network Policies**:
  - Configure NetworkPolicies para isolamento de rede
  - Seguir princípio de menor privilégio

### 8. Rollouts e Deployments

- **Strategies**:
  - Use `RollingUpdate` para produção
  - Configure `maxSurge` e `maxUnavailable` apropriadamente
  - Para zero-downtime: `maxUnavailable: 0, maxSurge: 1`

- **Argo Rollouts**:
  - Use para deployments avançados (canary, blue-green)
  - Configure análise de métricas quando disponível

