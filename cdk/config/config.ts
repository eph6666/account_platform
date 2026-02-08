/**
 * Environment configuration for Account Platform CDK stacks
 */

export interface EnvironmentConfig {
  // Environment name
  environment: 'dev' | 'staging' | 'prod';

  // AWS Account & Region
  account: string;
  region: string;

  // DynamoDB Configuration
  dynamodb: {
    accountsTableName: string;
    usersTableName: string;
    auditLogsTableName: string;
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  };

  // Cognito Configuration
  cognito: {
    userPoolName: string;
    userPoolClientName: string;
    passwordPolicy: {
      minLength: number;
      requireLowercase: boolean;
      requireUppercase: boolean;
      requireDigits: boolean;
      requireSymbols: boolean;
    };
  };

  // ECS Configuration
  ecs: {
    clusterName: string;
    serviceName: string;
    taskCpu: number;
    taskMemory: number;
    desiredCount: number;
    minCapacity: number;
    maxCapacity: number;
  };

  // Network Configuration
  vpc: {
    maxAzs: number;
    natGateways: number;
  };

  // KMS Configuration
  kms: {
    keyAlias: string;
    enableKeyRotation: boolean;
  };
}

/**
 * Development environment configuration
 */
export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',

  dynamodb: {
    accountsTableName: 'account-platform-aws-accounts-dev',
    usersTableName: 'account-platform-users-dev',
    auditLogsTableName: 'account-platform-audit-logs-dev',
    billingMode: 'PAY_PER_REQUEST',
  },

  cognito: {
    userPoolName: 'account-platform-users-dev',
    userPoolClientName: 'account-platform-client-dev',
    passwordPolicy: {
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: false,
    },
  },

  ecs: {
    clusterName: 'account-platform-cluster-dev',
    serviceName: 'account-platform-service-dev',
    taskCpu: 512,  // 0.5 vCPU
    taskMemory: 1024,  // 1 GB
    desiredCount: 1,
    minCapacity: 1,
    maxCapacity: 2,
  },

  vpc: {
    maxAzs: 2,
    natGateways: 1,  // Cost-saving for dev
  },

  kms: {
    keyAlias: 'account-platform-encryption-key-dev',
    enableKeyRotation: true,
  },
};

/**
 * Production environment configuration
 */
export const prodConfig: EnvironmentConfig = {
  environment: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT || '',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',

  dynamodb: {
    accountsTableName: 'account-platform-aws-accounts-prod',
    usersTableName: 'account-platform-users-prod',
    auditLogsTableName: 'account-platform-audit-logs-prod',
    billingMode: 'PAY_PER_REQUEST',
  },

  cognito: {
    userPoolName: 'account-platform-users-prod',
    userPoolClientName: 'account-platform-client-prod',
    passwordPolicy: {
      minLength: 12,
      requireLowercase: true,
      requireUppercase: true,
      requireDigits: true,
      requireSymbols: true,
    },
  },

  ecs: {
    clusterName: 'account-platform-cluster-prod',
    serviceName: 'account-platform-service-prod',
    taskCpu: 1024,  // 1 vCPU
    taskMemory: 2048,  // 2 GB
    desiredCount: 2,
    minCapacity: 2,
    maxCapacity: 10,
  },

  vpc: {
    maxAzs: 2,
    natGateways: 2,  // Multi-AZ for high availability
  },

  kms: {
    keyAlias: 'account-platform-encryption-key-prod',
    enableKeyRotation: true,
  },
};

/**
 * Get configuration based on environment
 */
export function getConfig(env?: string): EnvironmentConfig {
  const environment = env || process.env.ENVIRONMENT || 'dev';

  switch (environment) {
    case 'prod':
    case 'production':
      return prodConfig;
    case 'dev':
    case 'development':
    default:
      return devConfig;
  }
}
