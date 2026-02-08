#!/bin/bash

# Account Platform API 快速测试脚本
# 测试所有公共端点

API_URL=${API_URL:-"http://localhost:8000"}

echo "========================================"
echo "Account Platform API 快速测试"
echo "API URL: $API_URL"
echo "========================================"
echo ""

# 测试1: 健康检查
echo "📋 测试 1: 健康检查"
echo "GET /health"
response=$(curl -s -w "\n%{http_code}" $API_URL/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo "✅ 成功 (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ 失败 (HTTP $http_code)"
    echo "$body"
fi
echo ""

# 测试2: 根端点
echo "📋 测试 2: 根端点"
echo "GET /"
response=$(curl -s -w "\n%{http_code}" $API_URL/)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo "✅ 成功 (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ 失败 (HTTP $http_code)"
    echo "$body"
fi
echo ""

# 测试3: Cognito配置（公共端点）
echo "📋 测试 3: Cognito配置"
echo "GET /api/auth/config"
response=$(curl -s -w "\n%{http_code}" $API_URL/api/auth/config)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo "✅ 成功 (HTTP $http_code)"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ 失败 (HTTP $http_code)"
    echo "$body"
fi
echo ""

# 测试4: API文档（公共端点）
echo "📋 测试 4: API文档"
echo "GET /docs"
response=$(curl -s -w "\n%{http_code}" $API_URL/docs)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" == "200" ]; then
    echo "✅ 成功 (HTTP $http_code)"
    echo "API文档可访问"
else
    echo "❌ 失败 (HTTP $http_code)"
fi
echo ""

# 测试5: OpenAPI规范
echo "📋 测试 5: OpenAPI规范"
echo "GET /openapi.json"
response=$(curl -s -w "\n%{http_code}" $API_URL/openapi.json)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "200" ]; then
    echo "✅ 成功 (HTTP $http_code)"
    # 只显示基本信息
    echo "$body" | jq '{title: .info.title, version: .info.version, paths: (.paths | keys)}' 2>/dev/null || echo "OpenAPI规范已加载"
else
    echo "❌ 失败 (HTTP $http_code)"
fi
echo ""

# 测试6: 需要认证的端点（预期401）
echo "📋 测试 6: 需要认证的端点（预期返回401）"
echo "GET /api/auth/me"
response=$(curl -s -w "\n%{http_code}" $API_URL/api/auth/me)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" == "401" ]; then
    echo "✅ 认证机制正常工作 (HTTP $http_code)"
    echo "$body" | jq '.detail' 2>/dev/null || echo "$body"
else
    echo "⚠️  意外状态码 (HTTP $http_code)"
    echo "$body"
fi
echo ""

echo "========================================"
echo "✅ 基础测试完成！"
echo ""
echo "📚 下一步："
echo "1. 访问 $API_URL/docs 查看完整API文档"
echo "2. 使用Cognito获取JWT token进行完整测试"
echo "3. 测试需要认证的端点"
echo "========================================"
