# Account Platform 开发进度和问题处理记录

**最后更新时间**: 2026-02-08 14:50 UTC

---

## 📊 当前部署状态

### ✅ 已完成部署的组件

1. **基础设施 (CloudFormation Stacks)**
   - ✅ AccountPlatform-KMS-dev - KMS加密密钥
   - ✅ AccountPlatform-Cognito-dev - 用户认证
   - ✅ AccountPlatform-DynamoDB-dev - 数据库
   - ✅ AccountPlatform-Frontend-dev - 前端托管 (S3 + CloudFront)
   - ✅ AccountPlatform-Network-dev - 网络和ALB
   - ✅ AccountPlatform-ECS-dev - 后端容器服务

2. **后端服务**
   - 状态: ✅ 运行中
   - 模式: Production (查询真实AWS API)
   - Docker镜像: 已推送到ECR (最新版本)
   - ECS任务: 1个Fargate任务正在运行

3. **前端应用**
   - 状态: ✅ 已部署
   - 文件: 已同步到S3，CloudFront缓存已刷新
   - 版本: index--QxH2Xaq.js

### 🌐 访问信息

```
前端URL:    https://d1za69pdgag6u0.cloudfront.net
后端API:    https://d1za69pdgag6u0.cloudfront.net/api
API文档:    https://d1za69pdgag6u0.cloudfront.net/docs
健康检查:   https://d1za69pdgag6u0.cloudfront.net/health

CloudFront Distribution ID: ENJCIBEAZEHXX
ALB DNS: account-platform-alb-dev-923706164.us-east-1.elb.amazonaws.com
```

### 🔐 Cognito 配置

```
User Pool ID:     us-east-1_P8gca7rhJ
Client ID:        6t8o2v653biag8r4odopklvlsa
Region:           us-east-1
```

### 👤 管理员账号

```
邮箱:     admin@example.com
密码:     Admin123456!
角色:     admin
状态:     CONFIRMED (已激活)
```

---

## 🐛 已解决的问题

### 问题 1: 前端无限刷新

**现象**: 访问前端页面时不断刷新，无法显示内容

**原因**:
1. `useAuth` hook在未认证时自动调用`api.auth.getMe()`
2. API返回401 Unauthorized
3. API拦截器捕获401并重定向到`/login`
4. 页面重新加载，形成无限循环
5. Dashboard和Accounts的query在未认证时仍然执行

**解决方案**:
1. 禁用`useAuth`中的自动user query: `enabled: false`
2. 为`useDashboard`和`useAccounts`添加认证守卫: `enabled: isAuthenticated`
3. 禁用全局query重试: `retry: false`
4. 修复401拦截器避免在login页面重复重定向
5. 添加App初始化防护避免重复调用

**修改文件**:
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/hooks/useAccounts.ts`
- `frontend/src/services/api.ts`
- `frontend/src/App.tsx`

### 问题 2: 前端显示空白页面

**现象**: 页面不再无限刷新，但显示空白

**原因**: API返回的`client_id`为空字符串，导致Amplify无法正确初始化

**解决方案**:
1. 在`config.py`添加`cognito_client_id`字段
2. 修改`auth.py`返回正确的client_id
3. 在ECS Stack中添加`COGNITO_CLIENT_ID`环境变量
4. 从Cognito Stack传递`userPoolClient`到ECS Stack
5. 重新构建Docker镜像并推送到ECR
6. 强制ECS服务重新部署

**修改文件**:
- `backend/app/core/config.py`
- `backend/app/api/auth.py`
- `cdk/lib/ecs-stack.ts`
- `cdk/bin/app.ts`

### 问题 3: 后端开发模式返回模拟数据

**现象**: 创建账号后TPM quota显示的是模拟数据而不是真实值

**原因**: ECS环境变量`ENVIRONMENT`设置为`development`，触发了mock模式

**解决方案**:
1. 修改`cdk/lib/ecs-stack.ts`将`ENVIRONMENT`固定为`production`
2. 重新部署ECS stack
3. 后端现在会调用真实的AWS Service Quotas API

**修改文件**:
- `cdk/lib/ecs-stack.ts` (line 163)

### 问题 4: TPM Quota查询逻辑错误

**现象**: 无法正确查询到Bedrock Claude 4.5的TPM配额

**原因**:
1. 代码查找`"tpm"`关键字，但实际quota名称是`"tokens per minute"`
2. 只返回第一个匹配的quota，而实际有3个quota需要查询
3. 没有区分Sonnet和Opus模型

**解决方案**:
修改`aws_service.py`中的`_get_quota_from_service_quotas`方法:
1. 查找`"token"`而不是`"tpm"`
2. 区分Sonnet和Opus模型
3. 分别返回两个TPM值

**目标Quota名称**:
- `Global cross-region model inference tokens per minute for Anthropic Claude Sonnet 4.5 V1`
- `Global cross-region model inference tokens per minute for Anthropic Claude Opus 4.5`

**修改文件**:
- `backend/app/services/aws_service.py` (line 215-247)

---

## ⚠️ 待解决的问题

### 需要验证: TPM Quota是否正确显示

**当前状态**: 代码已修复，但需要实际测试

**测试步骤**:
1. 登录系统: https://d1za69pdgag6u0.cloudfront.net
2. 添加一个有Bedrock权限的AWS账号
3. 查看账号详情中的TPM quota
4. 点击"Refresh Quota"按钮刷新数据
5. 验证是否显示正确的值（例如: Sonnet 5M, Opus 2M）

**如果TPM还是不对**:
```bash
# 检查后端日志
aws logs tail /ecs/account-platform-dev --since 5m --format short

# 手动测试API（需要登录token）
curl -s https://d1za69pdgag6u0.cloudfront.net/api/accounts
```

---

## 🏗️ 系统架构

### 后端服务架构

```
CloudFront (HTTPS)
  ↓
  ├─ / (前端) → S3 bucket
  ├─ /api/* → ALB (HTTP) → ECS Fargate
  │   ↓
  │   └─ FastAPI 后端
  │       ├─ Cognito 认证
  │       ├─ DynamoDB 数据存储
  │       ├─ KMS 加密AKSK
  │       └─ AWS Service Quotas API
  │
  ├─ /health → ALB → ECS
  └─ /docs → ALB → ECS
```

### 数据流

1. **用户登录**: Cognito → 获取JWT token
2. **查询账号**: Frontend → CloudFront → ALB → ECS → DynamoDB
3. **创建账号**:
   - 验证AKSK → AWS STS
   - 加密凭据 → KMS
   - 查询quota → AWS Service Quotas API
   - 存储数据 → DynamoDB
4. **刷新quota**: 解密AKSK → 查询Service Quotas API → 更新DynamoDB

---

## 📁 重要文件位置

### 配置文件

```
/home/ubuntu/account_platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py              # 认证API (client_id修复)
│   │   │   ├── accounts.py          # 账号管理API
│   │   │   └── dashboard.py         # Dashboard API
│   │   ├── services/
│   │   │   └── aws_service.py       # AWS API集成 (TPM查询修复)
│   │   └── core/
│   │       └── config.py            # 后端配置 (添加client_id)
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # 认证hook (禁用自动查询)
│   │   │   ├── useDashboard.ts      # Dashboard hook (添加认证守卫)
│   │   │   └── useAccounts.ts       # 账号hook (添加认证守卫)
│   │   ├── services/
│   │   │   └── api.ts               # API客户端 (修复401重定向)
│   │   └── App.tsx                  # 主应用 (防止重复初始化)
│   └── .env.production              # 前端环境配置
│
└── cdk/
    ├── lib/
    │   ├── ecs-stack.ts              # ECS配置 (添加COGNITO_CLIENT_ID)
    │   └── cognito-stack.ts          # Cognito配置
    └── bin/
        └── app.ts                    # CDK主入口 (传递userPoolClient)
```

### 环境变量 (ECS Task Definition)

```bash
APP_NAME=Account Platform API
ENVIRONMENT=production                # 使用真实AWS API
LOG_LEVEL=DEBUG
AWS_REGION=us-east-1

# DynamoDB
DYNAMODB_ACCOUNTS_TABLE=account-platform-aws-accounts-dev
DYNAMODB_USERS_TABLE=account-platform-users-dev
DYNAMODB_AUDIT_LOGS_TABLE=account-platform-audit-logs-dev

# KMS
KMS_KEY_ID=ff8eee2a-029c-43c6-9f92-c3d1abe5de0b

# Cognito
COGNITO_USER_POOL_ID=us-east-1_P8gca7rhJ
COGNITO_CLIENT_ID=6t8o2v653biag8r4odopklvlsa
COGNITO_REGION=us-east-1

# Server
HOST=0.0.0.0
PORT=8000
```

---

## 🔄 下次继续开发的步骤

### 1. 验证系统功能

```bash
# 1. 清除浏览器缓存或使用无痕模式
# 2. 访问: https://d1za69pdgag6u0.cloudfront.net
# 3. 使用 admin@example.com / Admin123456! 登录
# 4. 添加一个AWS账号测试TPM查询
```

### 2. 如果需要调试

```bash
# 查看后端日志
aws logs tail /ecs/account-platform-dev --since 10m --format short

# 查看ECS服务状态
aws ecs describe-services \
  --cluster account-platform-cluster-dev \
  --services account-platform-service-dev

# 测试API健康
curl https://d1za69pdgag6u0.cloudfront.net/health

# 查看Cognito配置
curl https://d1za69pdgag6u0.cloudfront.net/api/auth/config
```

### 3. 重新构建和部署

```bash
# 如果修改了后端代码
cd /home/ubuntu/account_platform/backend
sudo docker build -t account-platform-backend:latest .
sudo docker tag account-platform-backend:latest \
  111706684826.dkr.ecr.us-east-1.amazonaws.com/account-platform-backend:latest
aws ecr get-login-password --region us-east-1 | \
  sudo docker login --username AWS --password-stdin \
  111706684826.dkr.ecr.us-east-1.amazonaws.com
sudo docker push 111706684826.dkr.ecr.us-east-1.amazonaws.com/account-platform-backend:latest
aws ecs update-service \
  --cluster account-platform-cluster-dev \
  --service account-platform-service-dev \
  --force-new-deployment

# 如果修改了前端代码
cd /home/ubuntu/account_platform/frontend
npm run build
aws s3 sync dist/ s3://account-platform-frontend-dev-111706684826/ --delete
aws cloudfront create-invalidation \
  --distribution-id ENJCIBEAZEHXX \
  --paths "/*"

# 如果修改了CDK配置
cd /home/ubuntu/account_platform/cdk
ENVIRONMENT=dev cdk deploy AccountPlatform-ECS-dev --require-approval never
```

---

## 💡 常见问题排查

### 前端无法加载

1. 检查CloudFront缓存是否刷新
2. 清除浏览器缓存
3. 检查S3文件是否上传成功
4. 查看浏览器Console的错误信息

### API返回401

1. 检查是否已登录
2. 验证Cognito token是否有效
3. 检查后端COGNITO_CLIENT_ID配置

### TPM显示为0或错误值

1. 检查后端ENVIRONMENT是否为production
2. 查看后端日志确认API调用
3. 验证AWS账号是否有Service Quotas权限
4. 确认选择的region有Bedrock服务

### ECS任务无法启动

1. 查看CloudWatch日志: `/ecs/account-platform-dev`
2. 检查任务定义的环境变量
3. 验证Docker镜像是否正确推送
4. 检查IAM角色权限

---

## 📝 Git Commit 建议

完成验证后，建议提交以下commit：

```bash
cd /home/ubuntu/account_platform

git add .
git commit -m "fix: resolve frontend infinite refresh and blank page issues

- Fix infinite refresh loop by disabling auto-queries when not authenticated
- Add authentication guards to useDashboard and useAccounts hooks
- Fix blank page by adding COGNITO_CLIENT_ID environment variable
- Update ECS environment to production mode for real AWS API calls
- Fix TPM quota query logic to correctly identify Sonnet and Opus models
- Update Docker image and deploy to ECS

Fixes:
- Frontend infinite refresh loop
- Blank page due to missing Cognito client ID
- TPM quota showing mock data instead of real values
- Incorrect quota query logic

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 📞 技术支持信息

- **AWS Region**: us-east-1
- **AWS Account ID**: 111706684826
- **Project Path**: /home/ubuntu/account_platform
- **CDK Version**: 2.x
- **Node Version**: v20.x
- **Python Version**: 3.12
- **Docker**: 使用sudo运行

---

**注意**: 此文档包含敏感信息（密码、Client ID等），请妥善保管，不要提交到公开仓库。
