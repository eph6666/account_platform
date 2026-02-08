# Account Platform - 云原生AWS账号管理平台

一个基于云原生架构的AWS账号管理平台，采用前后端分离设计，用于安全管理多个AWS账号的凭证、配额信息和账单地址。

## 🚀 快速部署到AWS

```bash
# 一键部署（推荐）
./deploy.sh dev
```

📖 **详细文档:**
- [AWS部署快速指南](AWS_DEPLOYMENT.md) - 5分钟快速部署
- [完整部署指南](DEPLOYMENT_GUIDE.md) - 详细步骤和故障排查
- [本地开发指南](QUICK_START.md) - 本地运行和测试

## 📋 项目概述

Account Platform 提供：
- **账号管理** - 集中管理多个AWS账号的AKSK凭证
- **安全加密** - 使用AWS KMS加密所有敏感凭证
- **配额监控** - 实时查看Bedrock Claude 4.5 TPM配额
- **角色权限** - Admin和普通用户的细粒度权限控制
- **审计日志** - 完整的操作审计追踪
- **多语言支持** - 中英文界面

## 🏗️ 技术架构

### 后端
- **Python 3.12** + **FastAPI** - 高性能异步Web框架
- **DynamoDB** - NoSQL数据库
- **AWS KMS** - 凭证加密
- **AWS SDK (boto3)** - AWS服务集成
- **Pydantic** - 数据验证
- **Docker** - 容器化部署

### 前端
- **React 18** + **TypeScript** - 现代化UI框架
- **Vite** - 快速构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **TanStack Query** - 数据获取和状态管理
- **AWS Amplify** - Cognito认证集成
- **i18next** - 国际化

### 基础设施
- **AWS CDK** (TypeScript) - 基础设施即代码
- **ECS Fargate** - 无服务器容器服务
- **Application Load Balancer** - 负载均衡
- **Amazon Cognito** - 用户认证
- **CloudWatch** - 日志和监控

## 📁 项目结构

```
account_platform/
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── main.py
│   │   ├── api/         # API 路由
│   │   ├── services/    # 业务逻辑
│   │   ├── db/          # 数据访问
│   │   ├── schemas/     # Pydantic 模型
│   │   ├── middleware/  # 中间件
│   │   └── core/        # 核心配置
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/             # React 前端
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # UI 组件
│   │   ├── hooks/       # React Hooks
│   │   ├── services/    # API 服务
│   │   └── types/       # TypeScript 类型
│   ├── package.json
│   └── vite.config.ts
├── cdk/                  # AWS CDK 基础设施
│   ├── bin/
│   ├── lib/
│   │   ├── dynamodb-stack.ts
│   │   ├── kms-stack.ts
│   │   ├── cognito-stack.ts
│   │   ├── network-stack.ts
│   │   └── ecs-stack.ts
│   └── config/
└── docs/                 # 文档
```

## 🚀 快速开始

### 前置要求

- **Node.js** 20+
- **Python** 3.12+
- **AWS CLI** 已配置
- **Docker** (可选，用于本地开发)
- **AWS CDK CLI**: `npm install -g aws-cdk`

### 1. 部署基础设施

```bash
# 进入 CDK 目录
cd cdk

# 安装依赖
npm install

# 首次部署需要 bootstrap
cdk bootstrap

# 部署所有 Stack (开发环境)
npm run deploy

# 或部署到生产环境
ENVIRONMENT=prod npm run deploy
```

部署完成后，记录输出的以下信息：
- `ALBDnsName` - API地址
- `UserPoolId` - Cognito用户池ID
- `UserPoolClientId` - 客户端ID
- `EncryptionKeyId` - KMS密钥ID

### 2. 创建Admin用户

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=custom:role,Value=admin \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --password YourSecurePassword123! \
  --permanent
```

### 3. 本地开发后端

```bash
# 进入后端目录
cd backend

# 安装 uv (高性能包管理器)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 创建虚拟环境并安装依赖
uv venv
uv sync

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 AWS 配置

# 启动开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API文档: http://localhost:8000/docs

### 4. 本地开发前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 Cognito 配置

# 启动开发服务器
npm run dev
```

前端访问: http://localhost:5173

## 🔐 安全特性

- ✅ **AKSK加密** - 所有AWS凭证使用KMS加密存储
- ✅ **JWT认证** - 基于Cognito的安全认证
- ✅ **角色权限** - Admin和User的细粒度权限控制
- ✅ **审计日志** - 完整的操作记录和追踪
- ✅ **数据加密** - DynamoDB表使用AWS托管加密
- ✅ **网络隔离** - ECS任务运行在私有子网
- ✅ **HTTPS** - ALB处理SSL终止

## 📊 核心功能

### Dashboard (Home页)
- 总账号数统计
- 活跃账号数
- 总TPM配额展示
- 配额使用趋势图表

### 账号列表 (AccountList页)
- 展示所有管理的AWS账号
- Admin: 可以通过AKSK录入新账号
- User: 只能查看自己创建的账号
- 卡片式展示，支持筛选和搜索
- 点击跳转到账号详情

### 账号详情 (AccountDetail页)
- 基本信息: 账号ID、状态、创建时间
- 账单地址: 完整地址信息 (Admin可编辑)
- Bedrock配额: Claude 4.5 TPM配额展示 (Admin可刷新)
- AKSK导出: 安全的凭证导出功能 (仅Admin)

### 用户权限

**Admin用户:**
- 录入新的AWS账号
- 导出AKSK凭证
- 更新账单地址
- 刷新Bedrock配额
- 查看所有账号
- 管理所有账号

**普通用户:**
- 查看自己创建的账号
- 查看账号详情和配额
- 不能导出AKSK
- 不能编辑账号信息

## 📖 API文档

后端提供完整的RESTful API，详细文档见部署后的 `/docs` 端点。

主要端点:
- `GET /health` - 健康检查
- `GET /api/auth/me` - 获取当前用户
- `GET /api/dashboard/stats` - Dashboard统计
- `GET /api/accounts` - 账号列表
- `POST /api/accounts` - 创建账号 (Admin)
- `GET /api/accounts/{id}` - 账号详情
- `GET /api/accounts/{id}/credentials` - 导出AKSK (Admin)
- `GET /api/accounts/{id}/quota` - 获取Bedrock配额
- `POST /api/accounts/{id}/quota/refresh` - 刷新配额 (Admin)

## 🧪 测试

### 后端测试

```bash
cd backend

# 运行所有测试
uv run pytest

# 运行带覆盖率的测试
uv run pytest --cov=app --cov-report=html

# 运行特定测试
uv run pytest tests/unit/test_services.py
```

### 前端测试

```bash
cd frontend

# 运行测试
npm test

# E2E测试
npm run test:e2e
```

## 📝 环境变量

### 后端环境变量 (.env)

```bash
# AWS Settings
AWS_REGION=us-east-1

# DynamoDB Tables
DYNAMODB_ACCOUNTS_TABLE=account-platform-aws-accounts-dev
DYNAMODB_USERS_TABLE=account-platform-users-dev
DYNAMODB_AUDIT_LOGS_TABLE=account-platform-audit-logs-dev

# KMS
KMS_KEY_ID=<your-kms-key-id>

# Cognito
COGNITO_USER_POOL_ID=<your-user-pool-id>
COGNITO_REGION=us-east-1

# Application
ENVIRONMENT=development
LOG_LEVEL=DEBUG
```

### 前端环境变量 (.env)

```bash
# API
VITE_API_URL=http://localhost:8000

# Cognito
VITE_COGNITO_USER_POOL_ID=<your-user-pool-id>
VITE_COGNITO_CLIENT_ID=<your-client-id>
VITE_COGNITO_REGION=us-east-1
```

## 🛠️ 开发工具

### 后端代码质量

```bash
cd backend

# 代码格式化
uv run black app/

# 代码检查
uv run ruff check app/

# 类型检查
uv run mypy app/
```

### 前端代码质量

```bash
cd frontend

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 格式化
npm run format
```

## 📈 监控和日志

- **CloudWatch Logs** - ECS任务日志
  - 日志组: `/ecs/account-platform-{env}`
- **CloudWatch Metrics** - 系统指标
  - CPU/内存使用率
  - 请求延迟
  - 错误率
- **DynamoDB Metrics** - 数据库性能
  - 读写容量
  - 限流事件
- **ALB Access Logs** - 访问日志

## 💰 成本估算

月度成本（开发环境）：约 $86

| 服务 | 配置 | 月费用 (USD) |
|------|------|------------|
| ECS Fargate | 0.5 vCPU, 1GB RAM, 1个任务 | ~$50 |
| ALB | 标准配置 | ~$20 |
| DynamoDB | 按需计费, 低流量 | ~$10 |
| NAT Gateway | 1个 | ~$5 |
| KMS | 20k次/月免费 | ~$1 |
| Cognito | <50k MAU | 免费 |
| **总计** | | **~$86** |

生产环境（2个任务，多AZ）：约 $150/月

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

本项目参考了以下优秀项目的设计模式：
- [anthropic_api_converter](https://github.com/yourusername/anthropic_api_converter) - FastAPI + DynamoDB 架构

## 📞 支持

如有问题或建议，请：
- 提交 [Issue](https://github.com/yourusername/account_platform/issues)
- 查看 [文档](./docs)
- 联系维护者

---

**Note:** 本项目仅用于学习和演示目的。在生产环境使用前，请进行全面的安全审计和测试。
