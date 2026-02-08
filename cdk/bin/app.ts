#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { KMSStack } from '../lib/kms-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { NetworkStack } from '../lib/network-stack';
import { ECSStack } from '../lib/ecs-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { getConfig } from '../config/config';

/**
 * Account Platform CDK Application
 *
 * This application creates the complete infrastructure for the Account Platform:
 * 1. DynamoDB tables for data storage
 * 2. KMS encryption key for credential security
 * 3. Cognito User Pool for authentication
 * 4. VPC and networking infrastructure
 * 5. ECS Fargate service for the backend API
 *
 * Usage:
 *   # Deploy to development environment
 *   cdk deploy --all
 *
 *   # Deploy to production environment
 *   ENVIRONMENT=prod cdk deploy --all
 */

const app = new cdk.App();

// Get environment configuration
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'dev';
const config = getConfig(environment);

console.log(`\nDeploying Account Platform to ${config.environment} environment`);
console.log(`Region: ${config.region}`);
console.log(`Account: ${config.account || 'default'}\n`);

// Stack environment
const env = {
  account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  region: config.region || process.env.CDK_DEFAULT_REGION,
};

// ===================================================================
// Stack 1: DynamoDB Tables
// ===================================================================
const dynamodbStack = new DynamoDBStack(
  app,
  `AccountPlatform-DynamoDB-${config.environment}`,
  config,
  {
    env,
    description: `DynamoDB tables for Account Platform (${config.environment})`,
  }
);

// ===================================================================
// Stack 2: KMS Encryption Key
// ===================================================================
const kmsStack = new KMSStack(
  app,
  `AccountPlatform-KMS-${config.environment}`,
  config,
  {
    env,
    description: `KMS encryption key for Account Platform (${config.environment})`,
  }
);

// ===================================================================
// Stack 3: Cognito User Pool
// ===================================================================
const cognitoStack = new CognitoStack(
  app,
  `AccountPlatform-Cognito-${config.environment}`,
  config,
  {
    env,
    description: `Cognito User Pool for Account Platform (${config.environment})`,
  }
);

// ===================================================================
// Stack 4: Network Infrastructure
// ===================================================================
const networkStack = new NetworkStack(
  app,
  `AccountPlatform-Network-${config.environment}`,
  config,
  {
    env,
    description: `Network infrastructure for Account Platform (${config.environment})`,
  }
);

// ===================================================================
// Stack 5: ECS Service
// ===================================================================
const ecsStack = new ECSStack(
  app,
  `AccountPlatform-ECS-${config.environment}`,
  config,
  {
    vpc: networkStack.vpc,
    ecsSecurityGroup: networkStack.ecsSecurityGroup,
    targetGroup: networkStack.targetGroup,
    accountsTable: dynamodbStack.accountsTable,
    usersTable: dynamodbStack.usersTable,
    auditLogsTable: dynamodbStack.auditLogsTable,
    encryptionKey: kmsStack.encryptionKey,
    userPool: cognitoStack.userPool,
    userPoolClient: cognitoStack.userPoolClient,
  },
  {
    env,
    description: `ECS Service for Account Platform (${config.environment})`,
  }
);

// Define dependencies
ecsStack.addDependency(dynamodbStack);
ecsStack.addDependency(kmsStack);
ecsStack.addDependency(cognitoStack);
ecsStack.addDependency(networkStack);

// ===================================================================
// Stack 6: Frontend (S3 + CloudFront)
// ===================================================================
const frontendStack = new FrontendStack(
  app,
  `AccountPlatform-Frontend-${config.environment}`,
  config,
  networkStack.alb.loadBalancerDnsName,
  {
    env,
    description: `Frontend infrastructure for Account Platform (${config.environment})`,
  }
);

// Frontend depends on Network stack to get ALB DNS
frontendStack.addDependency(networkStack);

// Synth the app
app.synth();
