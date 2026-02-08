# 快速参考指南

## 🚀 快速访问

**前端**: https://d1za69pdgag6u0.cloudfront.net
**管理员**: admin@example.com / Admin123456!

## 📋 常用命令

### 查看日志
```bash
aws logs tail /ecs/account-platform-dev --since 10m --format short
```

### 重启ECS服务
```bash
aws ecs update-service \
  --cluster account-platform-cluster-dev \
  --service account-platform-service-dev \
  --force-new-deployment
```

### 重新部署前端
```bash
cd /home/ubuntu/account_platform/frontend
npm run build
aws s3 sync dist/ s3://account-platform-frontend-dev-111706684826/ --delete
aws cloudfront create-invalidation --distribution-id ENJCIBEAZEHXX --paths "/*"
```

### 重新部署后端
```bash
cd /home/ubuntu/account_platform/backend
sudo docker build -t account-platform-backend:latest .
sudo docker tag account-platform-backend:latest 111706684826.dkr.ecr.us-east-1.amazonaws.com/account-platform-backend:latest
aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin 111706684826.dkr.ecr.us-east-1.amazonaws.com
sudo docker push 111706684826.dkr.ecr.us-east-1.amazonaws.com/account-platform-backend:latest
aws ecs update-service --cluster account-platform-cluster-dev --service account-platform-service-dev --force-new-deployment
```

## 🔑 关键配置

```
CloudFront ID:     ENJCIBEAZEHXX
User Pool ID:      us-east-1_P8gca7rhJ
Client ID:         6t8o2v653biag8r4odopklvlsa
S3 Bucket:         account-platform-frontend-dev-111706684826
ECS Cluster:       account-platform-cluster-dev
ECS Service:       account-platform-service-dev
```

## ⚠️ 重要提醒

1. **前端访问前务必清除浏览器缓存**
2. **后端运行在production模式，会调用真实AWS API**
3. **TPM quota查询需要AWS账号有Service Quotas权限**

详细文档见: [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md)
