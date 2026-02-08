# 🚀 Account Platform - AWS部署指南

本指南将帮助你完成Account Platform到AWS的完整部署。

## 📋 部署前检查

### 1. 系统要求

确保你的系统已安装：
- AWS CLI (v2+)
- Docker
- Node.js (v20+)
- npm
- AWS CDK CLI

```bash
# 安装AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 安装AWS CDK
npm install -g aws-cdk

# 验证安装
aws --version
docker --version
node --version
npm --version
cdk --version
```

### 2. AWS 凭证配置

```bash
# 配置AWS凭证
aws configure

# 输入：
# AWS Access Key ID: [你的Access Key]
# AWS Secret Access Key: [你的Secret Key]
# Default region name: us-east-1
# Default output format: json

# 验证凭证
aws sts get-caller-identity
```

## 🎯 一键部署（推荐）

我们提供了自动化部署脚本，可以一键完成所有部署步骤：

```bash
# 开发环境部署
./deploy.sh dev

# 生产环境部署
./deploy.sh prod
```

部署脚本会自动完成：
1. ✅ 检查必要的工具
2. ✅ 安装CDK依赖
3. ✅ Bootstrap CDK（首次）
4. ✅ 部署所有基础设施栈
5. ✅ 构建并推送后端Docker镜像
6. ✅ 构建并部署前端到S3/CloudFront
7. ✅ 更新ECS服务

## 📦 手动部署步骤

如果你想手动控制每个部署步骤：

### 第1步：部署基础设施

```bash
cd cdk

# 安装依赖
npm install

# Bootstrap CDK（仅首次需要）
cdk bootstrap

# 部署所有栈
cdk deploy --all

# 或者单独部署
cdk deploy AccountPlatform-DynamoDB-dev
cdk deploy AccountPlatform-KMS-dev
cdk deploy AccountPlatform-Cognito-dev
cdk deploy AccountPlatform-Network-dev
cdk deploy AccountPlatform-ECS-dev
cdk deploy AccountPlatform-Frontend-dev
```

### 第2步：获取部署输出

部署完成后，记录以下重要输出：

```bash
# DynamoDB表名
AccountsTableName
UsersTableName
AuditLogsTableName

# KMS密钥
EncryptionKeyId
EncryptionKeyArn

# Cognito
UserPoolId
UserPoolClientId
CognitoRegion

# 网络
VpcId
ALBDnsName  # 后端API地址

# ECS
ClusterName
ServiceName
ECRRepositoryUri

# 前端
BucketName
DistributionId
FrontendURL  # 前端访问地址
```

### 第3步：构建并推送后端镜像

```bash
cd backend

# 登录ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ECR_URI>

# 构建镜像
docker build -t account-platform-backend .

# 标记镜像
docker tag account-platform-backend:latest <ECR_URI>:latest

# 推送到ECR
docker push <ECR_URI>:latest

# 更新ECS服务
aws ecs update-service \
  --cluster <ClusterName> \
  --service <ServiceName> \
  --force-new-deployment
```

### 第4步：构建并部署前端

```bash
cd frontend

# 创建生产环境配置
cat > .env.production << EOF
VITE_API_BASE_URL=https://<ALB_DNS_NAME>
VITE_COGNITO_USER_POOL_ID=<UserPoolId>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId>
VITE_COGNITO_REGION=us-east-1
EOF

# 安装依赖
npm install

# 构建生产版本
npm run build

# 部署到S3
aws s3 sync dist/ s3://<BucketName>/ --delete

# 清除CloudFront缓存
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

## 👤 创建管理员用户

部署完成后，需要创建第一个管理员用户：

```bash
# 1. 创建用户
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes \
    Name=email,Value=admin@example.com \
    Name=custom:role,Value=admin \
  --message-action SUPPRESS

# 2. 设置永久密码
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --password YourSecurePassword123! \
  --permanent
```

密码要求：
- 最小长度：8个字符（dev）/ 12个字符（prod）
- 包含大小写字母
- 包含数字
- 生产环境还需要包含特殊字符

## 🔍 验证部署

### 1. 检查后端健康状态

```bash
# 健康检查
curl https://<ALB_DNS>/health

# 预期输出：
# {"status":"healthy","service":"Account Platform API","version":"1.0.0"}

# 查看API文档
open https://<ALB_DNS>/docs
```

### 2. 访问前端

打开浏览器访问CloudFront URL：
```
https://<CloudFront_Domain>.cloudfront.net
```

使用创建的管理员账号登录。

### 3. 查看ECS日志

```bash
# 获取日志组名称
aws cloudformation describe-stacks \
  --stack-name AccountPlatform-ECS-dev \
  --query "Stacks[0].Outputs[?OutputKey=='LogGroupName'].OutputValue" \
  --output text

# 查看最新日志
aws logs tail <LogGroupName> --follow
```

## 🔧 故障排查

### 后端服务无法启动

1. 检查ECS任务状态：
```bash
aws ecs list-tasks --cluster <ClusterName>
aws ecs describe-tasks --cluster <ClusterName> --tasks <TaskArn>
```

2. 查看CloudWatch日志：
```bash
aws logs tail /ecs/account-platform-dev --follow
```

3. 常见问题：
   - Docker镜像不存在：检查ECR仓库
   - 权限不足：检查任务角色IAM权限
   - 环境变量配置错误：检查ECS任务定义

### 前端无法访问

1. 检查S3桶内容：
```bash
aws s3 ls s3://<BucketName>/ --recursive
```

2. 检查CloudFront分发状态：
```bash
aws cloudfront get-distribution --id <DistributionId>
```

3. 清除浏览器缓存和CloudFront缓存

### Cognito用户无法登录

1. 验证用户状态：
```bash
aws cognito-idp admin-get-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com
```

2. 重置密码：
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --password NewPassword123! \
  --permanent
```

## 🔄 更新部署

### 更新后端代码

```bash
# 重新构建并推送镜像
cd backend
docker build -t account-platform-backend .
docker tag account-platform-backend:latest <ECR_URI>:latest
docker push <ECR_URI>:latest

# 强制ECS重新部署
aws ecs update-service \
  --cluster <ClusterName> \
  --service <ServiceName> \
  --force-new-deployment
```

### 更新前端代码

```bash
# 重新构建
cd frontend
npm run build

# 同步到S3
aws s3 sync dist/ s3://<BucketName>/ --delete

# 清除缓存
aws cloudfront create-invalidation \
  --distribution-id <DistributionId> \
  --paths "/*"
```

### 更新基础设施

```bash
cd cdk

# 查看变更
cdk diff

# 应用变更
cdk deploy --all
```

## 💰 成本估算

### 开发环境（每月约$86）
- ECS Fargate: ~$50 (0.5 vCPU, 1GB RAM, 1个任务)
- ALB: ~$20
- CloudFront: ~$5
- DynamoDB: ~$10 (按需计费)
- NAT Gateway: ~$5
- S3: <$1
- KMS: ~$1
- Cognito: 免费 (<50k MAU)

### 生产环境（每月约$200+）
- ECS Fargate: ~$120 (1 vCPU, 2GB RAM, 2-10个任务)
- ALB: ~$30
- CloudFront: ~$15
- DynamoDB: ~$20+
- NAT Gateway: ~$10 (2个AZ)
- S3: ~$2
- KMS: ~$1
- Cognito: 免费 (<50k MAU)

## 🗑️ 清理资源

如果需要删除所有AWS资源：

```bash
# 警告：这将删除所有数据！
cd cdk

# 删除所有栈
cdk destroy --all

# 或者单独删除
cdk destroy AccountPlatform-Frontend-dev
cdk destroy AccountPlatform-ECS-dev
cdk destroy AccountPlatform-Network-dev
cdk destroy AccountPlatform-Cognito-dev
cdk destroy AccountPlatform-KMS-dev
cdk destroy AccountPlatform-DynamoDB-dev

# 清空S3桶（如果需要）
aws s3 rm s3://<BucketName> --recursive

# 删除ECR镜像
aws ecr batch-delete-image \
  --repository-name <RepositoryName> \
  --image-ids imageTag=latest
```

## 📚 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         用户                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   CloudFront     │  (前端CDN)
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   S3 Bucket      │  (前端静态文件)
              └──────────────────┘

                       │
                       ▼
              ┌──────────────────┐
              │   ALB            │  (负载均衡器)
              └────────┬─────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   ECS Fargate           │  (后端容器)
         │   ├─ Task 1             │
         │   └─ Task 2             │
         └──────┬──────────────────┘
                │
    ┌───────────┼───────────┬────────────┐
    ▼           ▼           ▼            ▼
┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│DynamoDB│ │  KMS   │ │ Cognito │ │   ECR    │
└────────┘ └────────┘ └─────────┘ └──────────┘
```

## 🔐 安全最佳实践

1. **启用MFA**：为AWS root账号和IAM用户启用多因素认证
2. **使用IAM角色**：ECS任务使用IAM角色访问AWS服务，不使用长期凭证
3. **加密传输**：HTTPS/TLS用于所有通信
4. **加密存储**：KMS加密所有敏感数据，DynamoDB启用加密
5. **最小权限**：IAM策略遵循最小权限原则
6. **审计日志**：所有操作记录到DynamoDB审计日志（90天TTL）
7. **网络隔离**：ECS任务在私有子网中运行
8. **密钥轮换**：KMS密钥自动年度轮换

## 📞 支持

遇到问题？检查：
1. [故障排查](#故障排查)部分
2. CloudWatch日志
3. AWS CloudFormation事件
4. ECS服务事件

## 🎉 下一步

部署完成后：
1. ✅ 创建管理员用户
2. ✅ 登录前端应用
3. ✅ 添加第一个AWS账号
4. ✅ 查看Bedrock配额
5. ✅ 探索所有功能

祝你部署顺利！🚀
