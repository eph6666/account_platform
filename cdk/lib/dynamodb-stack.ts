import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/config';

/**
 * DynamoDB Stack for Account Platform
 *
 * Creates four DynamoDB tables:
 * 1. AWS Accounts Table - stores account information and encrypted credentials
 * 2. Users Table - stores user information and roles
 * 3. Audit Logs Table - stores audit logs for sensitive operations
 * 4. Quota Config Table - stores quota configuration for dynamic model management
 */
export class DynamoDBStack extends cdk.Stack {
  public readonly accountsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly auditLogsTable: dynamodb.Table;
  public readonly quotaConfigTable: dynamodb.Table;

  constructor(scope: Construct, id: string, config: EnvironmentConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===================================================================
    // Table 1: AWS Accounts Table
    // ===================================================================
    this.accountsTable = new dynamodb.Table(this, 'AccountsTable', {
      tableName: config.dynamodb.accountsTableName,
      partitionKey: {
        name: 'account_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      removalPolicy: cdk.RemovalPolicy.RETAIN,  // Never delete production data
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,  // Enable streams for future event processing
    });

    // GSI: created_by-index (for querying accounts created by a specific user)
    this.accountsTable.addGlobalSecondaryIndex({
      indexName: 'created_by-index',
      partitionKey: {
        name: 'created_by',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ===================================================================
    // Table 2: Users Table
    // ===================================================================
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: config.dynamodb.usersTableName,
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: email-index (for looking up users by email)
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ===================================================================
    // Table 3: Audit Logs Table
    // ===================================================================
    this.auditLogsTable = new dynamodb.Table(this, 'AuditLogsTable', {
      tableName: config.dynamodb.auditLogsTableName,
      partitionKey: {
        name: 'log_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Audit logs can be deleted when stack is removed
      timeToLiveAttribute: 'ttl',  // Auto-delete logs after 90 days
    });

    // GSI: user_id-timestamp-index (for querying audit logs by user)
    this.auditLogsTable.addGlobalSecondaryIndex({
      indexName: 'user_id-timestamp-index',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ===================================================================
    // Table 4: Quota Config Table
    // ===================================================================
    this.quotaConfigTable = new dynamodb.Table(this, 'QuotaConfigTable', {
      tableName: config.dynamodb.quotaConfigTableName,
      partitionKey: {
        name: 'config_id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: config.environment === 'prod',
      removalPolicy: cdk.RemovalPolicy.RETAIN,  // Configuration should be preserved
    });

    // ===================================================================
    // CloudFormation Outputs
    // ===================================================================
    new cdk.CfnOutput(this, 'AccountsTableName', {
      value: this.accountsTable.tableName,
      description: 'AWS Accounts Table Name',
      exportName: `${config.environment}-AccountsTableName`,
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users Table Name',
      exportName: `${config.environment}-UsersTableName`,
    });

    new cdk.CfnOutput(this, 'AuditLogsTableName', {
      value: this.auditLogsTable.tableName,
      description: 'Audit Logs Table Name',
      exportName: `${config.environment}-AuditLogsTableName`,
    });

    new cdk.CfnOutput(this, 'QuotaConfigTableName', {
      value: this.quotaConfigTable.tableName,
      description: 'Quota Config Table Name',
      exportName: `${config.environment}-QuotaConfigTableName`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', 'AccountPlatform');
  }
}
