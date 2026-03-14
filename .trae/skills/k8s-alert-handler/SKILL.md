---
name: "k8s-alert-handler"
description: "Collects K8s alert messages and executes automated remediation commands. Invoke when receiving K8s pod alerts, crashloop notifications, or node failure warnings."
---

# K8s Alert Handler

This skill handles Kubernetes alert messages and executes automated remediation actions based on predefined rules.

## When to Invoke

Invoke this skill when:
- Receiving K8s pod status alerts (CrashLoopBackOff, Pending, Unknown, etc.)
- Pod stuck in non-running state for extended period
- Node failure or resource pressure alerts
- Container restart loop notifications
- User asks to handle K8s alerts automatically

## Alert Rules and Actions

### Rule 1: Pod Stuck in Non-Running State

**Condition**: Pod is not in `Running` state for more than 5 minutes

**Actions**:
```bash
# Get pod status
kubectl get pod <POD_NAME> -n <NAMESPACE> -o wide

# Describe pod for details
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# Delete pod to force rescheduling
kubectl delete pod <POD_NAME> -n <NAMESPACE>
```

### Rule 2: CrashLoopBackOff

**Condition**: Pod status is `CrashLoopBackOff`

**Actions**:
```bash
# Check pod logs
kubectl logs <POD_NAME> -n <NAMESPACE> --previous

# Check events
kubectl get events -n <NAMESPACE> --field-selector involvedObject.name=<POD_NAME>

# Delete pod to force rescheduling
kubectl delete pod <POD_NAME> -n <NAMESPACE>
```

### Rule 3: MongoDB Pod Not Running

**Condition**: MongoDB pod is not in `Running` state

**Actions**:
```bash
# Check MongoDB pod status
kubectl get pods -l app=mongo -n <NAMESPACE>

# Check MongoDB statefulset
kubectl describe statefulset mongo -n <NAMESPACE>

# Delete pod to force rescheduling on other nodes
kubectl delete pod <POD_NAME> -n <NAMESPACE>

# Verify pod is rescheduled
kubectl get pods -l app=mongo -n <NAMESPACE> -w
```

### Rule 4: PostgreSQL/Database Pod Issues

**Condition**: Database pod (PostgreSQL, MySQL, etc.) not running

**Actions**:
```bash
# Check database pod
kubectl get pods -l <DATABASE_LABEL> -n <NAMESPACE>

# Check PVC status
kubectl get pvc -n <NAMESPACE>

# Delete pod for rescheduling
kubectl delete pod <POD_NAME> -n <NAMESPACE>
```

### Rule 5: Node Not Ready

**Condition**: Node status is `NotReady`

**Actions**:
```bash
# Check node status
kubectl get nodes

# Describe node
kubectl describe node <NODE_NAME>

# Check node conditions
kubectl get node <NODE_NAME> -o jsonpath='{.status.conditions}'

# Cordon node to prevent new scheduling
kubectl cordon <NODE_NAME>

# Drain node if needed (be careful with this)
kubectl drain <NODE_NAME> --ignore-daemonsets --delete-emptydir-data
```

### Rule 6: Persistent Volume Issues

**Condition**: PVC is stuck in `Pending` or `Lost` state

**Actions**:
```bash
# Check PVC status
kubectl get pvc -n <NAMESPACE>

# Check PV status
kubectl get pv

# Check storage class
kubectl get storageclass

# Describe PVC for events
kubectl describe pvc <PVC_NAME> -n <NAMESPACE>
```

## Usage Examples

### Example 1: Handle MongoDB Alert

User input:
```
收到报警: mongo-0 pod 在 default 命名空间一直处于 Pending 状态
```

Expected response:
```bash
# Step 1: Check pod status
kubectl get pod mongo-0 -n default -o wide

# Step 2: Check why it's pending
kubectl describe pod mongo-0 -n default

# Step 3: Check events
kubectl get events -n default --field-selector involvedObject.name=mongo-0

# Step 4: Delete pod to force rescheduling
kubectl delete pod mongo-0 -n default

# Step 5: Verify rescheduling
kubectl get pod mongo-0 -n default -w
```

### Example 2: Handle CrashLoopBackOff

User input:
```
报警: api-xxx pod 在 dify 命名空间处于 CrashLoopBackOff 状态
```

Expected response:
```bash
# Step 1: Check pod logs
kubectl logs api-xxx -n dify --previous

# Step 2: Check events
kubectl describe pod api-xxx -n dify

# Step 3: Delete pod
kubectl delete pod api-xxx -n dify
```

## Alert Information Collection

When processing alerts, collect the following information:

1. **Pod Name**: The name of the problematic pod
2. **Namespace**: The namespace where the pod resides
3. **Current Status**: Current state of the pod
4. **Node**: Which node the pod is scheduled on (if applicable)
5. **Events**: Recent events related to the pod
6. **Logs**: Container logs (if available)

## Safety Precautions

1. **Always check pod status before deletion**
2. **Verify the pod is part of a controller (Deployment/StatefulSet)**
3. **Do not delete standalone pods without user confirmation**
4. **Check if PVC data will be preserved**
5. **For StatefulSets, pods will be recreated with same identity**

## Workflow

1. Parse alert message to extract pod name and namespace
2. Determine the type of issue from alert content
3. Execute diagnostic commands to gather more information
4. Apply appropriate remediation action
5. Verify the action was successful
6. Report results to user
