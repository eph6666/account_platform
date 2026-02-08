# ✅ 部署前检查清单

在部署到AWS之前，请确保完成以下检查：

## 1. ☁️ AWS环境准备

- [ ] AWS CLI已安装并配置
  ```bash
  aws --version
  aws sts get-caller-identity
  ```

- [ ] AWS账号有足够权限创建以下资源：
  - DynamoDB表
  - KMS密钥
  - Cognito用户池
  - VPC、子网、NAT网关
  - Application Load Balancer
  - ECS Fargate集群和服务
  - ECR仓库
  - S3桶
  - CloudFront分发
  - IAM角色和策略

- [ ] 选择合适的AWS区域（推荐us-east-1）

## 2. 🛠️ 本地工具准备

- [ ] Node.js 20+ 已安装
  ```bash
  node --version
  ```

- [ ] npm已安装
  ```bash
  npm --version
  ```

- [ ] AWS CDK CLI已安装
  ```bash
  npm install -g aws-cdk
  cdk --version
  ```

- [ ] Docker已安装并运行
  ```bash
  docker --version
  docker ps
  ```

## 3. 📦 项目文件检查

- [ ] 项目完整性
  ```bash
  ls -la cdk/
  ls -la backend/
  ls -la frontend/
  ```

- [ ] 部署脚本可执行
  ```bash
  chmod +x deploy.sh
  ./deploy.sh --help  # 验证脚本可运行
  ```

## 4. 💰 成本确认

- [ ] 已了解AWS服务成本
  - 开发环境：约$90/月
  - 生产环境：约$200/月

- [ ] 已设置AWS预算警报（推荐）
  ```bash
  # 在AWS Console的Billing中设置预算
  ```

## 5. 🔐 安全准备

- [ ] 准备好Admin用户邮箱
- [ ] 准备好强密码（满足密码策略）
  - 开发环境：最少8字符，包含大小写和数字
  - 生产环境：最少12字符，包含大小写、数字和特殊字符

## 6. 📋 信息记录准备

准备记录以下部署输出信息：

- [ ] 记录表格或文档已准备

| 项目 | 值 | 备注 |
|------|---|------|
| Frontend URL | | CloudFront URL |
| Backend API URL | | ALB DNS |
| User Pool ID | | Cognito |
| User Pool Client ID | | Cognito |
| KMS Key ID | | 加密密钥 |
| Admin Email | | 管理员邮箱 |
| Admin Password | | （安全存储） |

## 7. 🌐 域名（可选）

如果你计划使用自定义域名：

- [ ] 域名已在Route 53或其他DNS提供商注册
- [ ] SSL证书已在ACM中申请（与ALB同区域）
- [ ] 准备好域名CNAME记录配置

## 8. 🚀 最终确认

- [ ] 已阅读[完整部署指南](DEPLOYMENT_GUIDE.md)
- [ ] 已了解部署流程需要15-30分钟
- [ ] 网络连接稳定
- [ ] 有时间完成整个部署流程

---

## ✨ 全部检查完成？

运行部署命令：

```bash
./deploy.sh dev
```

部署过程中：
1. ☕ 准备一杯咖啡
2. 📱 保持终端窗口打开
3. 📝 记录输出的重要信息
4. 🎉 等待部署成功提示

---

## 🆘 遇到问题？

- 部署失败：查看[故障排查](DEPLOYMENT_GUIDE.md#故障排查)
- AWS权限不足：检查IAM策略
- 网络问题：检查AWS区域连接
- Docker问题：重启Docker服务

祝部署顺利！🎊
