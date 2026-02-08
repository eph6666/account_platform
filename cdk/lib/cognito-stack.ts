import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/config';

/**
 * Cognito Stack for Account Platform
 *
 * Creates:
 * - User Pool for authentication
 * - User Pool Client for frontend application
 * - Custom attributes for user roles (admin/user)
 */
export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, config: EnvironmentConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===================================================================
    // User Pool
    // ===================================================================
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: config.cognito.userPoolName,

      // Sign-in Configuration
      signInAliases: {
        email: true,
        username: false,
      },

      // Auto-verify email
      autoVerify: {
        email: true,
      },

      // Standard attributes
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },

      // Custom attributes for role management
      customAttributes: {
        role: new cognito.StringAttribute({
          minLen: 4,
          maxLen: 10,
          mutable: true,
        }),
      },

      // Password policy
      passwordPolicy: {
        minLength: config.cognito.passwordPolicy.minLength,
        requireLowercase: config.cognito.passwordPolicy.requireLowercase,
        requireUppercase: config.cognito.passwordPolicy.requireUppercase,
        requireDigits: config.cognito.passwordPolicy.requireDigits,
        requireSymbols: config.cognito.passwordPolicy.requireSymbols,
        tempPasswordValidity: cdk.Duration.days(3),
      },

      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Email configuration (using Cognito's built-in email for now)
      email: cognito.UserPoolEmail.withCognito(),

      // Self sign-up disabled (admin creates users)
      selfSignUpEnabled: false,

      // User invitation
      userInvitation: {
        emailSubject: 'Welcome to Account Platform',
        emailBody: `
          <p>Hello {username},</p>
          <p>You have been invited to join the Account Platform.</p>
          <p>Your temporary password is: <strong>{####}</strong></p>
          <p>Please sign in and change your password.</p>
        `,
      },

      // User verification
      userVerification: {
        emailSubject: 'Verify your email for Account Platform',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },

      // Advanced security (MFA optional)
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },

      // Device tracking
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },

      // Deletion protection
      deletionProtection: config.environment === 'prod',

      // Removal policy
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ===================================================================
    // User Pool Client (for frontend application)
    // ===================================================================
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: config.cognito.userPoolClientName,

      // OAuth flows
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: false,
      },

      // Token validity
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),

      // Token revocation
      enableTokenRevocation: true,

      // Prevent user existence errors
      preventUserExistenceErrors: true,

      // Read/Write attributes
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          emailVerified: true,
          givenName: true,
          familyName: true,
        })
        .withCustomAttributes('role'),

      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({
          email: true,
          givenName: true,
          familyName: true,
        }),
    });

    // ===================================================================
    // CloudFormation Outputs
    // ===================================================================
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${config.environment}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${config.environment}-UserPoolArn`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${config.environment}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'CognitoRegion', {
      value: cdk.Stack.of(this).region,
      description: 'Cognito Region',
      exportName: `${config.environment}-CognitoRegion`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', 'AccountPlatform');
  }
}
