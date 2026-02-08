import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../config/config';

/**
 * Frontend Stack - S3 + CloudFront for React App
 *
 * This stack creates:
 * - S3 bucket for static website hosting
 * - CloudFront distribution for global CDN
 * - OAI for secure S3 access
 * - API proxy to ALB
 */
export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public albDnsName?: string;

  constructor(
    scope: Construct,
    id: string,
    config: EnvironmentConfig,
    albDnsName?: string,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);
    this.albDnsName = albDnsName;

    // ===================================================================
    // S3 Bucket for Static Website
    // ===================================================================
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `account-platform-frontend-${config.environment}-${config.account}`,
      // Remove websiteIndexDocument and websiteErrorDocument to use S3 Origin with OAI
      // CloudFront error responses will handle SPA routing
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: config.environment === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: config.environment !== 'prod',
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: config.environment === 'prod',
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3600,
        },
      ],
    });

    // ===================================================================
    // CloudFront Origin Access Identity
    // ===================================================================
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OAI',
      {
        comment: `OAI for Account Platform Frontend (${config.environment})`,
      }
    );

    // Grant CloudFront read access to S3 bucket
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    // ===================================================================
    // CloudFront Distribution
    // ===================================================================

    // Prepare additional behaviors for API proxy if ALB DNS is provided
    const additionalBehaviors: Record<string, cloudfront.BehaviorOptions> = {};

    if (this.albDnsName) {
      additionalBehaviors['/api/*'] = {
        origin: new origins.HttpOrigin(this.albDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      };

      additionalBehaviors['/health'] = {
        origin: new origins.HttpOrigin(this.albDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      };

      additionalBehaviors['/docs'] = {
        origin: new origins.HttpOrigin(this.albDnsName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      };
    }

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: Object.keys(additionalBehaviors).length > 0 ? additionalBehaviors : undefined,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: config.environment === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      comment: `Account Platform Frontend (${config.environment})`,
    });

    // ===================================================================
    // Outputs
    // ===================================================================
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for frontend',
      exportName: `AccountPlatform-Frontend-Bucket-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      description: 'S3 bucket ARN',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `AccountPlatform-Frontend-DistributionId-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name (use this URL to access frontend)',
      exportName: `AccountPlatform-Frontend-URL-${config.environment}`,
    });

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Frontend application URL',
    });
  }
}
