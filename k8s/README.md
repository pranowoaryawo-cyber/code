# Dify-Plus Kubernetes 部署文档

本文档描述了如何将 Dify-Plus 项目部署到 Kubernetes 集群，包括自动扩缩容配置。

## 目录结构

```
k8s/
├── 01-namespace.yaml           # 命名空间配置
├── 02-configmap.yaml           # 所有服务的 ConfigMap 配置
├── 03-secrets.yaml             # 敏感信息 Secret 配置
├── 04-postgres-statefulset.yaml # PostgreSQL StatefulSet (Longhorn)
├── 05-redis-statefulset.yaml   # Redis StatefulSet (Longhorn)
├── 06-api-deployment.yaml      # API 服务 Deployment (CephFS)
├── 07-worker-deployments.yaml  # Worker 服务 Deployment (共享 CephFS)
├── 08-web-deployment.yaml      # Web 前端 Deployment
├── 09-sandbox-deployment.yaml  # Sandbox Deployment (CephFS)
├── 10-sandbox-full-deployment.yaml # Sandbox Full Deployment
├── 11-plugin-daemon-deployment.yaml # Plugin Daemon Deployment (CephFS)
├── 12-ssrf-proxy-deployment.yaml # SSRF Proxy Deployment
├── 13-nginx-deployment.yaml    # Nginx Gateway Deployment
├── 14-admin-deployments.yaml   # Admin Web 和 Admin Server Deployment
├── 15-services.yaml            # 所有服务的 Service 配置
├── 16-hpa.yaml                 # 自动扩缩容 HPA 配置
├── 17-additional-pvcs.yaml     # 额外的 PVC 配置
├── 18-pvc-storage-guide.md     # PVC 存储类配置指南
└── README.md                   # 本文档
```

## 快速开始

### 1. 前置要求

- Kubernetes 集群 (v1.19+)
- kubectl 命令行工具
- **StorageClass 已配置**:
  - `longhorn`: 用于数据库存储 (PostgreSQL, Redis)
  - `cephfs`: 用于应用共享存储 (API, Worker, Sandbox, Plugin)
- metrics-server 已安装 (用于 HPA)

#### 1.1 存储类配置

本部署使用两种存储类：

**Longhorn (块存储)** - 用于数据库
- PostgreSQL StatefulSet
- Redis StatefulSet
- 特点：单节点访问 (ReadWriteOnce)，适合数据库工作负载

**CephFS (分布式文件系统)** - 用于应用存储
- API/Worker 应用文件存储
- Sandbox 依赖和配置
- Plugin Daemon 存储
- 特点：多节点访问 (ReadWriteMany)，支持文件共享

如需使用其他存储类名称，请修改各 YAML 文件中的 `storageClassName` 字段。

### 2. 修改配置

在部署之前，需要修改以下配置：

#### 2.1 修改 Secrets

编辑 `03-secrets.yaml`，将所有 base64 编码的占位符替换为实际值：

```bash
# 生成 base64 编码的密码
echo -n 'your-password' | base64
```

必须修改的密钥：
- `SECRET_KEY`: 应用密钥
- `DB_PASSWORD`: 数据库密码
- `REDIS_PASSWORD`: Redis 密码
- `PLUGIN_DAEMON_KEY`: 插件守护进程密钥
- `SANDBOX_API_KEY`: 沙盒 API 密钥

#### 2.2 修改 ConfigMap

编辑 `02-configmap.yaml`，根据实际需求调整环境变量：
- 外部访问 URL
- 存储配置
- 向量数据库配置

#### 2.3 调整资源限制

根据需要调整各 Deployment 的 resources 部分。

### 3. 部署应用

按顺序执行以下命令：

```bash
# 1. 创建命名空间
kubectl apply -f k8s/01-namespace.yaml

# 2. 创建 ConfigMap
kubectl apply -f k8s/02-configmap.yaml

# 3. 创建 Secrets
kubectl apply -f k8s/03-secrets.yaml

# 4. 部署数据库 (StatefulSet 会自动创建 PVC)
kubectl apply -f k8s/04-postgres-statefulset.yaml
kubectl apply -f k8s/05-redis-statefulset.yaml

# 5. 等待数据库就绪 (StatefulSet 会自动创建 PVC 并挂载)
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=postgres -n dify-plus --timeout=120s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=redis -n dify-plus --timeout=120s

# 查看自动创建的 PVC
kubectl get pvc -n dify-plus | grep -E "postgres|redis"

# 6. 部署应用服务
kubectl apply -f k8s/06-api-deployment.yaml
kubectl apply -f k8s/07-worker-deployments.yaml
kubectl apply -f k8s/08-web-deployment.yaml
kubectl apply -f k8s/09-sandbox-deployment.yaml
kubectl apply -f k8s/10-sandbox-full-deployment.yaml
kubectl apply -f k8s/11-plugin-daemon-deployment.yaml
kubectl apply -f k8s/12-ssrf-proxy-deployment.yaml
kubectl apply -f k8s/13-nginx-deployment.yaml
kubectl apply -f k8s/14-admin-deployments.yaml

# 7. 创建 Service
kubectl apply -f k8s/15-services.yaml

# 8. 启用自动扩缩容
kubectl apply -f k8s/16-hpa.yaml

# 9. 创建额外的 PVC (可选)
kubectl apply -f k8s/17-additional-pvcs.yaml
```

或者一键部署所有资源：

```bash
kubectl apply -f k8s/
```

### 4. 验证部署

```bash
# 查看所有 Pod 状态
kubectl get pods -n dify-plus

# 查看服务状态
kubectl get svc -n dify-plus

# 查看 HPA 状态
kubectl get hpa -n dify-plus

# 查看 PVC 状态
kubectl get pvc -n dify-plus
```

### 5. 访问应用

默认通过 Nginx LoadBalancer 服务暴露：

```bash
# 获取 Nginx 服务地址
kubectl get svc nginx -n dify-plus

# 如果使用 NodePort，查看端口
kubectl get svc nginx -n dify-plus -o jsonpath='{.spec.ports}'
```

## 自动扩缩容 (HPA)

已配置以下服务的自动扩缩容：

| 服务 | 最小副本 | 最大副本 | CPU 阈值 | 内存阈值 |
|------|---------|---------|---------|---------|
| api | 2 | 10 | 70% | 80% |
| web | 2 | 10 | 70% | 80% |
| worker | 2 | 10 | 70% | 80% |
| worker-gaia | 1 | 5 | 70% | 80% |
| worker-dataset | 1 | 5 | 70% | 80% |

### HPA 策略说明

- **扩容**: 当 CPU 或内存使用率超过阈值时，在 60 秒内最多扩容 100%
- **缩容**: 当负载降低时，在 5 分钟后最多缩容 50%

### 手动调整 HPA

```bash
# 编辑 HPA 配置
kubectl edit hpa api-hpa -n dify-plus

# 临时禁用 HPA
kubectl scale deployment api --replicas=3 -n dify-plus
kubectl delete hpa api-hpa -n dify-plus
```

## 数据库说明

### PostgreSQL (StatefulSet)

- **类型**: StatefulSet (保证数据持久化)
- **副本数**: 1 (单实例，可通过 PVC 备份)
- **存储**: 10Gi
- **存储类**: `longhorn` (块存储，ReadWriteOnce)
- **PVC 创建方式**: `volumeClaimTemplates` 自动创建
- **自动 PVC 名称**: `postgres-data-db-postgres-0`
- **持久化**: 数据保存在 `/var/lib/postgresql/data`

### Redis (StatefulSet)

- **类型**: StatefulSet
- **副本数**: 1
- **存储**: 5Gi
- **存储类**: `longhorn` (块存储，ReadWriteOnce)
- **PVC 创建方式**: `volumeClaimTemplates` 自动创建
- **自动 PVC 名称**: `redis-data-redis-0`
- **持久化**: 开启 AOF 持久化

### 应用存储 (CephFS)

以下服务使用 CephFS 共享存储：

| 服务 | PVC 名称 | 存储类 | 访问模式 | 大小 |
|------|---------|--------|---------|------|
| API/Worker | app-storage-pvc | cephfs | ReadWriteMany | 10Gi |
| Sandbox | sandbox-dependencies-pvc | cephfs | ReadWriteMany | 2Gi |
| Sandbox | sandbox-conf-pvc | cephfs | ReadWriteMany | 1Gi |
| Plugin Daemon | plugin-storage-pvc | cephfs | ReadWriteMany | 5Gi |

详细存储配置说明请参考 `18-pvc-storage-guide.md`

## 生产环境建议

### 1. 安全性

- [ ] 修改所有默认密码
- [ ] 使用 HTTPS/TLS
- [ ] 配置网络策略 (NetworkPolicy)
- [ ] 限制容器权限 (SecurityContext)
- [ ] 使用 Sealed Secrets 或 Vault 管理密钥

### 2. 高可用

- [ ] PostgreSQL 使用主从复制或云数据库服务
- [ ] Redis 使用 Sentinel 或 Cluster 模式
- [ ] 配置 PodDisruptionBudget
- [ ] 多可用区部署

### 3. 监控

- [ ] 部署 Prometheus + Grafana
- [ ] 配置日志收集 (ELK/Loki)
- [ ] 设置告警规则

### 4. 存储

- [ ] 使用高性能存储类 (SSD)
- [ ] 配置存储快照和备份策略
- [ ] 考虑使用云存储服务 (S3/MinIO)

## 故障排查

```bash
# 查看 Pod 日志
kubectl logs -f deployment/api -n dify-plus

# 查看 Pod 事件
kubectl describe pod <pod-name> -n dify-plus

# 进入 Pod 调试
kubectl exec -it <pod-name> -n dify-plus -- /bin/sh

# 查看资源使用
kubectl top pods -n dify-plus
```

## 更新部署

```bash
# 滚动更新
kubectl rollout restart deployment/api -n dify-plus

# 查看更新状态
kubectl rollout status deployment/api -n dify-plus

# 回滚
kubectl rollout undo deployment/api -n dify-plus
```

## 清理资源

```bash
# 删除所有资源
kubectl delete namespace dify-plus

# 或者删除所有 YAML 资源
kubectl delete -f k8s/
```

## 注意事项

1. **存储类**: 确保集群已配置默认 StorageClass
2. **资源限制**: 根据实际集群资源调整 requests/limits
3. **镜像仓库**: 确保集群可以拉取镜像 (ccr.ccs.tencentyun.com)
4. **DNS**: 确保 Pod 间可以通过 Service 名称互相访问
5. **健康检查**: 所有服务都配置了 liveness 和 readiness 探针

## 参考

- [Dify 官方文档](https://docs.dify.ai/)
- [Kubernetes 文档](https://kubernetes.io/docs/)
- [Docker Compose 转 Kubernetes](https://kompose.io/)

# 创建缺失表
# 方法1：直接执行（推荐）
kubectl exec -it -n dify-plus db-postgres-0 -- psql -U postgres -d dify << 'EOF'
-- app_extend 表
CREATE TABLE IF NOT EXISTS app_extend (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id UUID NOT NULL,
    retention_number INTEGER
);
CREATE INDEX IF NOT EXISTS app_extend_id_app_id_idx ON app_extend(app_id);
-- end_user_account_joins_extend 表
CREATE TABLE IF NOT EXISTS end_user_account_joins_extend (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    end_user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    app_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS end_user_account_joins_account_id_idx ON end_user_account_joins_extend(account_id);
CREATE INDEX IF NOT EXISTS end_user_account_joins_end_user_id_idx ON end_user_account_joins_extend(end_user_id);
CREATE INDEX IF NOT EXISTS end_user_account_joins_end_user_id_app_id_idx ON end_user_account_joins_extend(end_user_id, app_id);
-- message_context_extend 表
CREATE TABLE IF NOT EXISTS message_context_extend (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    conversation_id VARCHAR(36),
    message_id VARCHAR(36) NOT NULL
);
CREATE INDEX IF NOT EXISTS message_context_conversation_id_idx ON message_context_extend(conversation_id);
CREATE INDEX IF NOT EXISTS message_context_created_at_idx ON message_context_extend(created_at);
EOF