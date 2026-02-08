import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/config';

/**
 * ECS Stack Props
 */
export interface ECSStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  ecsSecurityGroup: ec2.SecurityGroup;
  targetGroup: elbv2.ApplicationTargetGroup;
  accountsTable: dynamodb.Table;
  usersTable: dynamodb.Table;
  auditLogsTable: dynamodb.Table;
  encryptionKey: kms.Key;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
}

/**
 * ECS Stack for Account Platform
 *
 * Creates:
 * - ECS Cluster
 * - Fargate Task Definition with IAM roles
 * - ECS Service with auto-scaling
 */
export class ECSStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    ecsProps: ECSStackProps,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // ===================================================================
    // ECS Cluster
    // ===================================================================
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: config.ecs.clusterName,
      vpc: ecsProps.vpc,
      containerInsights: config.environment === 'prod',
    });

    // ===================================================================
    // CloudWatch Log Group
    // ===================================================================
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/account-platform-${config.environment}`,
      retention: config.environment === 'prod'
        ? logs.RetentionDays.ONE_MONTH
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ===================================================================
    // Task Execution Role (for pulling images and writing logs)
    // ===================================================================
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      roleName: `account-platform-task-execution-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // ===================================================================
    // Task Role (for application permissions)
    // ===================================================================
    const taskRole = new iam.Role(this, 'TaskRole', {
      roleName: `account-platform-task-role-${config.environment}`,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant DynamoDB permissions
    ecsProps.accountsTable.grantReadWriteData(taskRole);
    ecsProps.usersTable.grantReadWriteData(taskRole);
    ecsProps.auditLogsTable.grantReadWriteData(taskRole);

    // Grant KMS permissions for encryption/decryption
    ecsProps.encryptionKey.grantEncryptDecrypt(taskRole);

    // Grant permissions to call AWS services for account management
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // STS - for verifying AKSK
          'sts:GetCallerIdentity',

          // Account API - for billing address
          'account:GetContactInformation',

          // Service Quotas - for Bedrock quota
          'servicequotas:GetServiceQuota',
          'servicequotas:ListServiceQuotas',

          // Bedrock - for listing models and checking access
          'bedrock:ListFoundationModels',
          'bedrock:GetFoundationModel',
        ],
        resources: ['*'],
      })
    );

    // Grant Cognito read permissions (for JWT validation)
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:GetUser',
          'cognito-idp:DescribeUserPool',
        ],
        resources: [ecsProps.userPool.userPoolArn],
      })
    );

    // ===================================================================
    // Task Definition
    // ===================================================================
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `account-platform-${config.environment}`,
      cpu: config.ecs.taskCpu,
      memoryLimitMiB: config.ecs.taskMemory,
      executionRole,
      taskRole,
    });

    // Reference ECR repository
    const ecrRepository = ecr.Repository.fromRepositoryName(
      this,
      'BackendRepository',
      'account-platform-backend'
    );

    // Add container
    const container = this.taskDefinition.addContainer('AppContainer', {
      containerName: 'account-platform-backend',
      // Use the image from ECR with proper permissions
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'account-platform',
        logGroup,
      }),
      environment: {
        // Application settings
        APP_NAME: 'Account Platform API',
        // Production mode - requires JWT token validation
        ENVIRONMENT: 'production',
        LOG_LEVEL: config.environment === 'prod' ? 'INFO' : 'DEBUG',

        // AWS settings
        AWS_REGION: cdk.Stack.of(this).region,

        // DynamoDB settings
        DYNAMODB_ACCOUNTS_TABLE: ecsProps.accountsTable.tableName,
        DYNAMODB_USERS_TABLE: ecsProps.usersTable.tableName,
        DYNAMODB_AUDIT_LOGS_TABLE: ecsProps.auditLogsTable.tableName,

        // KMS settings
        KMS_KEY_ID: ecsProps.encryptionKey.keyId,

        // Cognito settings
        COGNITO_USER_POOL_ID: ecsProps.userPool.userPoolId,
        COGNITO_CLIENT_ID: ecsProps.userPoolClient.userPoolClientId,
        COGNITO_REGION: cdk.Stack.of(this).region,

        // Server settings
        HOST: '0.0.0.0',
        PORT: '8000',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:8000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(120),
      },
    });

    // Expose port 8000
    container.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // ===================================================================
    // ECS Service
    // ===================================================================
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      serviceName: config.ecs.serviceName,
      taskDefinition: this.taskDefinition,
      desiredCount: config.ecs.desiredCount,
      securityGroups: [ecsProps.ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(300),
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      circuitBreaker: {
        rollback: false,  // Disable auto-rollback for debugging
      },
    });

    // Attach to target group
    this.service.attachToApplicationTargetGroup(ecsProps.targetGroup);

    // ===================================================================
    // Auto Scaling
    // ===================================================================
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: config.ecs.minCapacity,
      maxCapacity: config.ecs.maxCapacity,
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ===================================================================
    // CloudFormation Outputs
    // ===================================================================
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${config.environment}-ClusterName`,
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: this.service.serviceName,
      description: 'ECS Service Name',
      exportName: `${config.environment}-ServiceName`,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group Name',
      exportName: `${config.environment}-LogGroupName`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', 'AccountPlatform');
  }
}
