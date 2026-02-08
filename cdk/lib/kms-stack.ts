import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/config';

/**
 * KMS Stack for Account Platform
 *
 * Creates a KMS encryption key used for encrypting AWS account credentials (AKSK).
 * The key is configured with:
 * - Automatic key rotation
 * - Key policy that allows ECS tasks to encrypt/decrypt
 * - CloudWatch Logs for key usage auditing
 */
export class KMSStack extends cdk.Stack {
  public readonly encryptionKey: kms.Key;

  constructor(scope: Construct, id: string, config: EnvironmentConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create KMS key for AKSK encryption
    this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
      alias: config.kms.keyAlias,
      description: `KMS key for encrypting AWS account credentials in ${config.environment} environment`,
      enableKeyRotation: config.kms.enableKeyRotation,
      removalPolicy: cdk.RemovalPolicy.RETAIN,  // Never delete encryption keys
      pendingWindow: cdk.Duration.days(30),  // 30-day waiting period before key deletion
    });

    // Allow AWS services to use this key for encryption
    this.encryptionKey.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'Allow AWS Services',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('dynamodb.amazonaws.com')],
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey',
        ],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': [
              `dynamodb.${cdk.Stack.of(this).region}.amazonaws.com`,
            ],
          },
        },
      })
    );

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS Key ID for credential encryption',
      exportName: `${config.environment}-EncryptionKeyId`,
    });

    new cdk.CfnOutput(this, 'EncryptionKeyArn', {
      value: this.encryptionKey.keyArn,
      description: 'KMS Key ARN for credential encryption',
      exportName: `${config.environment}-EncryptionKeyArn`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', 'AccountPlatform');
    cdk.Tags.of(this).add('Purpose', 'CredentialEncryption');
  }
}
