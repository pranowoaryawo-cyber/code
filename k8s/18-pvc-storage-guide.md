# PVC 存储类配置说明

本文档说明 Dify-Plus Kubernetes 部署中各类 PVC 使用的存储类。

## 存储类分配规则

### 1. 数据库类存储 (使用 Longhorn + StatefulSet VolumeClaimTemplates)

数据库服务使用 StatefulSet 的 `volumeClaimTemplates` 自动创建 PVC，使用 **Longhorn** 存储类：

| 服务 | StatefulSet | 存储类 | 访问模式 | 大小 | 用途 |
|------|-------------|--------|---------|------|------|
| PostgreSQL | db-postgres | longhorn | ReadWriteOnce | 10Gi | 主数据库数据 |
| Redis | redis | longhorn | ReadWriteOnce | 5Gi | 缓存数据持久化 |

**自动创建的 PVC 名称：**
- PostgreSQL: `postgres-data-db-postgres-0`
- Redis: `redis-data-redis-0`

**使用 volumeClaimTemplates 的优势：**
1. **自动管理**: StatefulSet 自动创建和删除 PVC，无需手动管理
2. **Pod 绑定**: 每个 Pod 实例绑定独立的 PVC，保证数据一致性
3. **有序部署**: 支持多副本有序扩展，每个副本有自己的存储
4. **数据安全**: Pod 重建时，会重新挂载原来的 PVC，保证数据不丢失
5. **命名规范**: PVC 名称格式为 `<volume-name>-<statefulset-name>-<ordinal-index>`

**特点：**
- 块存储，适合数据库工作负载
- Longhorn 提供快照、备份功能
- 单节点访问 (ReadWriteOnce)

### 2. 应用存储类 (使用 CephFS)

应用共享存储使用 **CephFS** 存储类：

| 服务 | PVC 名称 | 存储类 | 访问模式 | 大小 | 用途 |
|------|---------|--------|---------|------|------|
| API/Worker | app-storage-pvc | cephfs | ReadWriteMany | 10Gi | 应用文件存储 |
| Sandbox | sandbox-dependencies-pvc | cephfs | ReadWriteMany | 2Gi | 沙盒依赖库 |
| Sandbox | sandbox-conf-pvc | cephfs | ReadWriteMany | 1Gi | 沙盒配置文件 |
| Plugin Daemon | plugin-storage-pvc | cephfs | ReadWriteMany | 5Gi | 插件存储 |

**特点：**
- 分布式文件系统，支持多节点同时访问
- 适合应用文件共享
- 多节点访问 (ReadWriteMany)

## PVC 创建方式对比

### 方式 1：StatefulSet volumeClaimTemplates (推荐用于数据库)

StatefulSet 自动创建 PVC，无需手动创建：

```yaml
# StatefulSet 配置示例
volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      storageClassName: longhorn
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

**自动创建的 PVC：**
```bash
kubectl get pvc -n dify-plus
NAME                          STATUS   VOLUME                                     
postgres-data-db-postgres-0   Bound    pvc-xxx-xxx                              
redis-data-redis-0            Bound    pvc-yyy-yyy
```

**优点：**
- ✅ StatefulSet 全生命周期管理
- ✅ Pod 重建自动挂载原 PVC
- ✅ 支持有状态扩展（每个 Pod 独立存储）
- ✅ 命名规范，易于识别

### 方式 2：静态 PVC (用于共享存储)

需要手动创建 PVC，然后在 Deployment 中引用：

```bash
# 手动创建 PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-storage-pvc
  namespace: dify-plus
spec:
  storageClassName: cephfs
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
EOF
```

```yaml
# Deployment 中引用
volumes:
  - name: app-storage
    persistentVolumeClaim:
      claimName: app-storage-pvc
```

**适用场景：**
- 多个 Pod 共享同一个存储（如 CephFS）
- 无状态服务需要持久化存储
- 需要预先分配特定存储资源

## 创建 PVC

### 数据库 PVC (自动创建)

数据库 StatefulSet 会自动创建 PVC，无需手动操作。部署后查看：

```bash
kubectl get pvc -n dify-plus | grep -E "postgres|redis"
```

### 应用共享 PVC (手动创建)

### 方法 2：使用 StorageClass 默认设置

如果集群配置了默认 StorageClass，可以不指定 storageClassName：

```yaml
spec:
  # 不指定 storageClassName，使用集群默认
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## 验证 PVC 状态

```bash
# 查看所有 PVC
kubectl get pvc -n dify-plus

# 查看 PVC 详情
kubectl describe pvc postgres-data-pvc -n dify-plus
kubectl describe pvc app-storage-pvc -n dify-plus

# 查看对应的 PV
kubectl get pv | grep dify-plus
```

## 扩容 PVC

### 方法 1：编辑 PVC

```bash
# 编辑 PVC 增加存储空间
kubectl edit pvc app-storage-pvc -n dify-plus
# 修改 spec.resources.requests.storage 为更大的值
```

### 方法 2：使用 patch

```bash
# 扩容 app-storage-pvc 到 20Gi
kubectl patch pvc app-storage-pvc -n dify-plus -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

**注意：**
- 扩容前确保存储类支持在线扩容
- 部分存储类需要重启 Pod 才能生效
- 缩容通常不被支持

## 备份策略

### Longhorn 备份 (数据库)

```bash
# 创建 Longhorn 快照
# 通过 Longhorn UI 或使用 Longhorn CSI

# 创建 RecurringJob 自动备份
cat <<EOF | kubectl apply -f -
apiVersion: longhorn.io/v1beta1
kind: RecurringJob
metadata:
  name: postgres-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: backup
  groups:
    - postgres
  retain: 7
  concurrency: 1
  labels:
    app: postgres
EOF
```

### CephFS 备份 (应用数据)

```bash
# 使用 Ceph 工具创建快照
# 或使用 Velero 进行应用级备份

# 示例：使用 Velero
velero backup create dify-plus-app-storage --include-resources pvc --selector "app.kubernetes.io/part-of=dify-plus"
```

## 故障排查

### PVC 处于 Pending 状态

```bash
# 检查 StorageClass 是否存在
kubectl get storageclass

# 检查 PVC 事件
kubectl describe pvc <pvc-name> -n dify-plus

# 检查存储提供者日志
# Longhorn
kubectl logs -n longhorn-system -l app=longhorn-manager

# CephFS
kubectl logs -n rook-ceph -l app=cephfs-provisioner
```

### Pod 无法挂载 PVC

```bash
# 检查 PVC 和 Pod 是否在同一个节点
kubectl get pod -o wide -n dify-plus

# 检查 PVC 访问模式
# ReadWriteOnce 要求 Pod 必须在同一节点
# ReadWriteMany 允许跨节点访问

# 查看 Pod 事件
kubectl describe pod <pod-name> -n dify-plus
```

### 存储性能问题

```bash
# 测试存储性能
kubectl exec -it <pod-name> -n dify-plus -- dd if=/dev/zero of=/data/test.img bs=1M count=100 conv=fdatasync

# 清理测试文件
kubectl exec -it <pod-name> -n dify-plus -- rm /data/test.img
```

## 最佳实践

1. **数据库使用块存储**: PostgreSQL、Redis 等数据库使用 Longhorn 块存储
2. **应用文件使用共享存储**: 多个 Pod 需要共享的数据使用 CephFS
3. **定期备份**: 配置自动备份策略，特别是数据库 PVC
4. **监控存储**: 使用 Prometheus + Grafana 监控存储使用情况
5. **设置告警**: PVC 使用率超过 80% 时发送告警

## 参考文档

- [Longhorn 文档](https://longhorn.io/docs/)
- [CephFS 文档](https://docs.ceph.com/en/latest/cephfs/)
- [Kubernetes 存储文档](https://kubernetes.io/docs/concepts/storage/)
