# 🧪 测试指南 - Quota配置化功能

本指南帮助你测试新实现的Quota配置化管理功能。

## ✅ 已完成的验证

以下项目已通过静态验证：

- ✅ **前端构建**: TypeScript编译成功，Vite构建通过
- ✅ **后端语法**: Python语法检查通过，所有导入正确
- ✅ **代码质量**: 1159行新代码，23个文件修改
- ✅ **Git提交**: 2个commits已提交到master分支

详细验证报告: `tasks/DEPLOYMENT-VERIFICATION.md`

## 🚀 快速启动测试环境

### 前置条件

确保你的系统已安装：
- Python 3.12+
- Node.js 20+
- pip (Python包管理器)
- npm (Node.js包管理器)

### 方式1: Docker Compose（推荐）

这是最简单的方式，自动启动所有服务。

```bash
# 1. 启动Backend + DynamoDB Local
cd backend
docker compose up -d

# 查看日志
docker compose logs -f api

# 2. 启动Frontend（新终端）
cd ../frontend
npm install  # 首次需要
npm run dev

# 3. 访问应用
open http://localhost:5173
```

**服务地址**:
- 🌐 Frontend: http://localhost:5173
- 🔌 Backend API: http://localhost:8000
- 📚 API文档: http://localhost:8000/docs
- 💾 DynamoDB Local: http://localhost:8001

### 方式2: 本地Python运行

如果Docker不可用，可以直接运行Python。

```bash
# 1. Backend
cd backend

# 安装依赖（首次）
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --reload

# 2. Frontend（新终端）
cd ../frontend
npm install  # 首次需要
npm run dev
```

## 🧪 测试场景

### 测试1: 访问Settings页面

**目标**: 验证admin用户可以看到Settings入口

**步骤**:
1. 以admin身份登录
2. 查看左侧导航栏
3. 应该看到"Settings"链接（普通用户看不到）
4. 点击进入Settings页面

**预期结果**:
- ✅ Admin用户看到Settings链接
- ✅ 普通用户看不到Settings链接
- ✅ Settings页面显示"Quota Configuration"卡片

### 测试2: 查看Quota配置

**目标**: 验证配置页面正常加载

**步骤**:
1. 在Settings页面点击"Quota Configuration"
2. 等待配置加载

**预期结果**:
- ✅ 显示模型列表
- ✅ 默认有3个模型配置：
  - Claude Sonnet 4.5 V1 (启用)
  - Claude Opus 4.5 (启用)
  - Claude Opus 4.6 V1 (禁用)
- ✅ 每个模型显示：
  - 启用/禁用开关
  - Display name
  - Model ID
  - QuotaCode (TPM)
  - 1M Context QuotaCode（如果有）

### 测试3: 启用/禁用模型

**目标**: 测试配置更新功能

**步骤**:
1. 在配置页面找到"Claude Opus 4.6 V1"
2. 点击左侧的开关，启用该模型
3. 点击右上角"Save Changes"按钮
4. 等待保存完成

**预期结果**:
- ✅ 开关状态改变
- ✅ "Save Changes"按钮变为可用
- ✅ 点击后显示"Saving..."
- ✅ 保存成功后显示绿色成功提示
- ✅ "Last updated"时间更新

### 测试4: 重置更改

**目标**: 测试Reset功能

**步骤**:
1. 修改任意模型的启用状态（不保存）
2. 点击"Reset"按钮

**预期结果**:
- ✅ 配置恢复到上次保存的状态
- ✅ "Save Changes"按钮变为禁用

### 测试5: 配置生效验证

**目标**: 验证配置影响quota查询

**步骤**:
1. 确保某个模型已启用
2. 进入Accounts页面
3. 创建或刷新一个账号的quota
4. 查看账号详情页的quota信息

**预期结果**:
- ✅ 启用的模型会查询quota
- ✅ 禁用的模型不会查询quota
- ✅ Quota数据正确显示

### 测试6: 权限控制

**目标**: 验证非admin用户无法访问

**步骤**:
1. 以普通用户身份登录
2. 尝试直接访问 `/settings`
3. 尝试直接访问 `/settings/quota-config`

**预期结果**:
- ✅ 看不到Settings导航链接
- ✅ 直接访问显示"Access Denied"
- ✅ 提示需要Admin权限

### 测试7: API直接测试

**目标**: 测试Admin API endpoints

**步骤**:
```bash
# 1. 获取配置
curl -X GET http://localhost:8000/api/admin/quota-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 更新配置
curl -X PUT http://localhost:8000/api/admin/quota-config \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "models": [
      {
        "model_id": "claude-sonnet-4.5-v1",
        "display_name": "Claude Sonnet 4.5 V1",
        "quota_code_tpm": "L-27C57EE8",
        "enabled": true,
        "has_1m_context": true,
        "quota_code_tpm_1m": "L-4B26E44A"
      }
    ]
  }'
```

**预期结果**:
- ✅ GET返回当前配置
- ✅ PUT更新成功，返回200
- ✅ 非admin用户返回403

### 测试8: 开发模式测试

**目标**: 验证dev mode下的mock数据

**步骤**:
1. 确保`.env`中`ENVIRONMENT=development`
2. 创建新账号或刷新quota
3. 查看quota数据

**预期结果**:
- ✅ 返回mock quota数据
- ✅ 不实际调用AWS API
- ✅ 日志显示"DEV: Returned mock quota"

## 🐛 故障排查

### Frontend无法启动

```bash
# 检查Node版本
node --version  # 需要20+

# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend启动失败

```bash
# 检查Python版本
python3 --version  # 需要3.12+

# 检查依赖
pip list | grep fastapi

# 查看详细错误
python -m uvicorn app.main:app --reload --log-level debug
```

### DynamoDB连接失败

```bash
# 检查DynamoDB Local是否运行
docker compose ps

# 重启DynamoDB
docker compose restart dynamodb-local

# 检查连接
curl http://localhost:8001
```

### 配置加载失败

```bash
# 检查API是否可访问
curl http://localhost:8000/health

# 检查Admin API
curl http://localhost:8000/api/admin/quota-config

# 查看后端日志
docker compose logs api
# 或
tail -f backend/logs/app.log
```

### "Access Denied"错误

**原因**: 用户不是admin角色

**解决**:
1. 检查用户角色
2. 确保Cognito中设置了`custom:role=admin`
3. 重新登录获取新token

## 📊 验证清单

完成所有测试后，请确认：

- [ ] Settings页面可访问（admin only）
- [ ] Quota Configuration页面加载正常
- [ ] 3个默认模型正确显示
- [ ] 启用/禁用开关工作正常
- [ ] Save/Reset按钮功能正常
- [ ] 配置保存成功
- [ ] 非admin用户无法访问
- [ ] API endpoints响应正确
- [ ] Quota刷新使用动态配置
- [ ] Dev mode mock数据正常

## 📝 测试报告模板

完成测试后，可使用以下模板记录结果：

```markdown
# 测试报告

**测试日期**: YYYY-MM-DD
**测试人**: Your Name
**环境**: Development/Production

## 测试结果

| 测试场景 | 状态 | 备注 |
|---------|------|------|
| 访问Settings页面 | ✅/❌ | |
| 查看Quota配置 | ✅/❌ | |
| 启用/禁用模型 | ✅/❌ | |
| 重置更改 | ✅/❌ | |
| 配置生效验证 | ✅/❌ | |
| 权限控制 | ✅/❌ | |
| API直接测试 | ✅/❌ | |
| 开发模式测试 | ✅/❌ | |

## 发现的问题

1. [问题描述]
   - 重现步骤:
   - 预期结果:
   - 实际结果:
   - 严重程度: High/Medium/Low

## 建议

[测试过程中的改进建议]
```

## 🎯 下一步

测试通过后：

1. **文档化**: 记录测试结果
2. **生产部署**: 使用CDK部署到AWS
3. **监控**: 设置CloudWatch alerts
4. **反馈**: 收集用户使用反馈

## 📞 获取帮助

遇到问题？查看：
- `tasks/DEPLOYMENT-VERIFICATION.md` - 详细验证报告
- `tasks/TASK-20260209-0130-quota-management.md` - 任务文档
- `backend/README.md` - 后端开发指南
- `frontend/README.md` - 前端开发指南

---

**祝测试顺利！** 🎉
