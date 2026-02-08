# Account Platform CDK

AWS CDK infrastructure for Account Platform - a cloud-native AWS account management system.

## Architecture

The infrastructure consists of 5 stacks:

1. **DynamoDB Stack** - Data storage tables
   - AWS Accounts table (with encrypted credentials)
   - Users table
   - Audit logs table

2. **KMS Stack** - Encryption key for AWS credentials

3. **Cognito Stack** - User authentication
   - User Pool with email sign-in
   - Custom role attribute (admin/user)

4. **Network Stack** - VPC and load balancing
   - VPC with public/private subnets
   - Application Load Balancer
   - Security Groups

5. **ECS Stack** - Containerized backend service
   - ECS Fargate cluster
   - Auto-scaling service
   - IAM roles with necessary permissions

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20+ and npm
- AWS CDK CLI: `npm install -g aws-cdk`

## Installation

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap
```

## Deployment

### Development Environment

```bash
# Deploy all stacks to development
npm run deploy

# Or deploy specific stack
cdk deploy AccountPlatform-DynamoDB-dev
```

### Production Environment

```bash
# Deploy to production
ENVIRONMENT=prod npm run deploy

# Or
cdk deploy --all --context environment=prod
```

## Useful Commands

```bash
# Compile TypeScript
npm run build

# Watch for changes
npm run watch

# Synthesize CloudFormation template
npm run synth

# Show differences with deployed stack
npm run diff

# Destroy stacks (be careful!)
cdk destroy --all
```

## Configuration

Environment-specific configuration is in [`config/config.ts`](config/config.ts).

Key settings:
- Database table names
- ECS task sizes and scaling
- VPC configuration
- Cognito password policies

## Stack Outputs

After deployment, you'll get:

**DynamoDB:**
- `AccountsTableName`
- `UsersTableName`
- `AuditLogsTableName`

**KMS:**
- `EncryptionKeyId`
- `EncryptionKeyArn`

**Cognito:**
- `UserPoolId`
- `UserPoolClientId`
- `CognitoRegion`

**Network:**
- `VpcId`
- `ALBDnsName` - Use this to access your API

**ECS:**
- `ClusterName`
- `ServiceName`
- `LogGroupName`

## Initial Setup After Deployment

### 1. Create Admin User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=custom:role,Value=admin \
  --message-action SUPPRESS
```

### 2. Set Permanent Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id <UserPoolId> \
  --username admin@example.com \
  --password <YourSecurePassword> \
  --permanent
```

### 3. Update ECS Service with Backend Image

After building your backend Docker image:

```bash
# Build and push image to ECR
cd ../backend
docker build -t account-platform-backend .
docker tag account-platform-backend:latest <ECR_URI>:latest
docker push <ECR_URI>:latest

# Update ECS service
aws ecs update-service \
  --cluster <ClusterName> \
  --service <ServiceName> \
  --force-new-deployment
```

## Security

- All credentials are encrypted with KMS before storage
- DynamoDB tables use AWS-managed encryption
- ECS tasks run in private subnets
- ALB handles SSL termination
- Audit logs automatically expire after 90 days

## Cost Estimation

Monthly costs for development environment (~$86):
- ECS Fargate: ~$50 (0.5 vCPU, 1GB RAM, 1 task)
- ALB: ~$20
- DynamoDB: ~$10 (low traffic)
- NAT Gateway: ~$5
- KMS: ~$1
- Cognito: Free (<50k MAU)

## Troubleshooting

### Stack deployment fails

Check:
1. AWS credentials are configured
2. Region supports all services
3. No resource name conflicts

### ECS tasks fail to start

Check:
1. Docker image is available in ECR
2. Task role has necessary permissions
3. CloudWatch logs for error messages

### Cannot create Cognito user

Check:
1. Email format is valid
2. Password meets policy requirements
3. User doesn't already exist

## Clean Up

To destroy all resources:

```bash
# Development
cdk destroy --all

# Production
ENVIRONMENT=prod cdk destroy --all
```

**Warning:** This will delete all data. Make sure to backup DynamoDB tables first.
