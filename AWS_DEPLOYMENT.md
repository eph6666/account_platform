# 🚀 AWS部署 - 快速开始

## 一键部署

```bash
# 开发环境
./deploy.sh dev

# 生产环境
./deploy.sh prod
```

就这么简单！脚本会自动完成所有部署步骤。

## 部署后的访问地址

脚本执行完成后，会输出：

```
🌐 Access URLs:
  Frontend: https://xxxxx.cloudfront.net
  Backend API: https://account-platform-alb-xxx.elb.amazonaws.com
  API Docs: https://account-platform-alb-xxx.elb.amazonaws.com/docs
```

## 创建管理员用户

```bash
# 使用脚本输出的User Pool ID
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

## 架构组件

部署包含以下AWS服务：

| 组件 | 用途 | 成本（月） |
|------|------|-----------|
| **S3** | 前端静态文件托管 | ~$1 |
| **CloudFront** | 全球CDN加速 | ~$5 |
| **ALB** | 后端负载均衡 | ~$20 |
| **ECS Fargate** | 后端容器运行 | ~$50 |
| **DynamoDB** | 数据存储 | ~$10 |
| **Cognito** | 用户认证 | 免费 |
| **KMS** | 密钥加密 | ~$1 |
| **NAT Gateway** | 网络出口 | ~$5 |
| **总计** | | **~$92/月** |

## 详细文档

- 📖 [完整部署指南](DEPLOYMENT_GUIDE.md) - 手动部署步骤和故障排查
- 📚 [CDK文档](cdk/README.md) - 基础设施详细说明
- 🔧 [后端文档](backend/README.md) - API和配置说明
- 🎨 [前端实现](FRONTEND_IMPLEMENTATION.md) - UI和功能说明

## 快速验证

```bash
# 检查后端健康
curl https://<ALB_DNS>/health

# 查看API文档
open https://<ALB_DNS>/docs

# 访问前端
open https://<CloudFront_URL>
```

## 更新部署

### 更新前端
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://<BucketName>/ --delete
aws cloudfront create-invalidation --distribution-id <DistId> --paths "/*"
```

### 更新后端
```bash
cd backend
docker build -t account-platform-backend .
docker tag account-platform-backend:latest <ECR_URI>:latest
docker push <ECR_URI>:latest
aws ecs update-service --cluster <Cluster> --service <Service> --force-new-deployment
```

## 清理资源

```bash
cd cdk
cdk destroy --all
```

**警告：这会删除所有数据！**

## 需要帮助？

查看 [故障排查指南](DEPLOYMENT_GUIDE.md#故障排查)
