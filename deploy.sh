#!/bin/bash

###############################################################################
# Account Platform - AWS Deployment Script
#
# This script automates the deployment of the Account Platform to AWS:
# 1. Deploys infrastructure (CDK stacks)
# 2. Builds and pushes backend Docker image to ECR
# 3. Builds and deploys frontend to S3/CloudFront
# 4. Updates ECS service with new backend image
#
# Usage:
#   ./deploy.sh [environment]
#
# Environment: dev (default) | prod
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT="${1:-dev}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Account Platform - AWS Deployment                ║${NC}"
echo -e "${BLUE}║         Environment: ${ENVIRONMENT}                                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo

# Check required tools
echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"
command -v aws >/dev/null 2>&1 || { echo -e "${RED}Error: AWS CLI is not installed${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: Docker is not installed${NC}" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Error: Node.js is not installed${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}Error: npm is not installed${NC}" >&2; exit 1; }
command -v cdk >/dev/null 2>&1 || { echo -e "${RED}Error: AWS CDK is not installed. Run: npm install -g aws-cdk${NC}" >&2; exit 1; }

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo -e "${GREEN}✓ AWS Account: ${AWS_ACCOUNT}${NC}"
echo -e "${GREEN}✓ AWS Region: ${AWS_REGION}${NC}"
echo

# Install CDK dependencies
echo -e "${YELLOW}[2/7] Installing CDK dependencies...${NC}"
cd cdk
if [ ! -d "node_modules" ]; then
  npm install
fi
echo -e "${GREEN}✓ CDK dependencies installed${NC}"
echo

# Bootstrap CDK (if not already done)
echo -e "${YELLOW}[3/7] Checking CDK bootstrap...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $AWS_REGION >/dev/null 2>&1; then
  echo -e "${BLUE}Bootstrapping CDK (one-time setup)...${NC}"
  cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
else
  echo -e "${GREEN}✓ CDK already bootstrapped${NC}"
fi
echo

# Deploy CDK stacks
echo -e "${YELLOW}[4/7] Deploying infrastructure stacks...${NC}"
ENVIRONMENT=$ENVIRONMENT cdk deploy --all --require-approval never

# Get stack outputs
echo -e "${YELLOW}[5/7] Retrieving stack outputs...${NC}"
ECR_REPO=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-ECS-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='ECRRepositoryUri'].OutputValue" \
  --output text --region $AWS_REGION)

ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Network-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text --region $AWS_REGION)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Frontend-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendURL'].OutputValue" \
  --output text --region $AWS_REGION)

S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Frontend-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text --region $AWS_REGION)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Frontend-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text --region $AWS_REGION)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Cognito-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text --region $AWS_REGION)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-Cognito-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
  --output text --region $AWS_REGION)

ECS_CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-ECS-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='ClusterName'].OutputValue" \
  --output text --region $AWS_REGION)

ECS_SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "AccountPlatform-ECS-${ENVIRONMENT}" \
  --query "Stacks[0].Outputs[?OutputKey=='ServiceName'].OutputValue" \
  --output text --region $AWS_REGION)

echo -e "${GREEN}✓ Stack outputs retrieved${NC}"
echo

# Build and push backend Docker image
echo -e "${YELLOW}[6/7] Building and pushing backend Docker image...${NC}"
cd ../backend

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build image
docker build -t account-platform-backend:latest .

# Tag and push
docker tag account-platform-backend:latest $ECR_REPO:latest
docker tag account-platform-backend:latest $ECR_REPO:$(date +%Y%m%d-%H%M%S)
docker push $ECR_REPO:latest
docker push $ECR_REPO:$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}✓ Backend image pushed to ECR${NC}"

# Force new ECS deployment
echo -e "${BLUE}Updating ECS service...${NC}"
aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --force-new-deployment \
  --region $AWS_REGION >/dev/null

echo -e "${GREEN}✓ ECS service updated${NC}"
echo

# Build and deploy frontend
echo -e "${YELLOW}[7/7] Building and deploying frontend...${NC}"
cd ../frontend

# Create environment file for frontend
cat > .env.production << EOF
VITE_API_URL=https://${ALB_DNS}
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${USER_POOL_CLIENT_ID}
VITE_COGNITO_REGION=${AWS_REGION}
EOF

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  npm install
fi

# Build frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$S3_BUCKET/ --delete --region $AWS_REGION

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --region $AWS_REGION >/dev/null

echo -e "${GREEN}✓ Frontend deployed to S3 and CloudFront${NC}"
echo

# Print deployment summary
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete!                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "  ${YELLOW}Environment:${NC} $ENVIRONMENT"
echo -e "  ${YELLOW}AWS Account:${NC} $AWS_ACCOUNT"
echo -e "  ${YELLOW}AWS Region:${NC} $AWS_REGION"
echo
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "  ${YELLOW}Frontend:${NC} $CLOUDFRONT_URL"
echo -e "  ${YELLOW}Backend API:${NC} https://$ALB_DNS"
echo -e "  ${YELLOW}API Docs:${NC} https://$ALB_DNS/docs"
echo
echo -e "${BLUE}🔐 Cognito:${NC}"
echo -e "  ${YELLOW}User Pool ID:${NC} $USER_POOL_ID"
echo -e "  ${YELLOW}Client ID:${NC} $USER_POOL_CLIENT_ID"
echo
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "  1. Create an admin user:"
echo -e "     ${GREEN}aws cognito-idp admin-create-user \\${NC}"
echo -e "       ${GREEN}--user-pool-id $USER_POOL_ID \\${NC}"
echo -e "       ${GREEN}--username admin@example.com \\${NC}"
echo -e "       ${GREEN}--user-attributes Name=email,Value=admin@example.com Name=custom:role,Value=admin \\${NC}"
echo -e "       ${GREEN}--message-action SUPPRESS${NC}"
echo
echo -e "  2. Set admin password:"
echo -e "     ${GREEN}aws cognito-idp admin-set-user-password \\${NC}"
echo -e "       ${GREEN}--user-pool-id $USER_POOL_ID \\${NC}"
echo -e "       ${GREEN}--username admin@example.com \\${NC}"
echo -e "       ${GREEN}--password YourSecurePassword123! \\${NC}"
echo -e "       ${GREEN}--permanent${NC}"
echo
echo -e "  3. Visit: ${BLUE}$CLOUDFRONT_URL${NC}"
echo
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
