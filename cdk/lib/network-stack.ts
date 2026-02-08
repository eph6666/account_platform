import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/config';

/**
 * Network Stack for Account Platform
 *
 * Creates:
 * - VPC with public and private subnets across multiple AZs
 * - Application Load Balancer (ALB)
 * - Security Groups for ALB and ECS tasks
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, config: EnvironmentConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===================================================================
    // VPC Configuration
    // ===================================================================
    this.vpc = new ec2.Vpc(this, 'VPC', {
      vpcName: `account-platform-vpc-${config.environment}`,
      maxAzs: config.vpc.maxAzs,
      natGateways: config.vpc.natGateways,

      // IP Address Configuration
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),

      // Subnet Configuration
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],

      // Enable DNS
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // ===================================================================
    // Security Group for ALB
    // ===================================================================
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `account-platform-alb-sg-${config.environment}`,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from anywhere
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Allow HTTPS traffic from anywhere
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // ===================================================================
    // Security Group for ECS Tasks
    // ===================================================================
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `account-platform-ecs-sg-${config.environment}`,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    // Allow traffic from ALB on port 8000
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8000),
      'Allow traffic from ALB'
    );

    // ===================================================================
    // Application Load Balancer
    // ===================================================================
    this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: this.vpc,
      loadBalancerName: `account-platform-alb-${config.environment}`,
      internetFacing: true,
      securityGroup: this.albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      deletionProtection: config.environment === 'prod',
    });

    // ===================================================================
    // Target Group (for ECS tasks)
    // ===================================================================
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: this.vpc,
      targetGroupName: `account-platform-tg-${config.environment}`,
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,

      // Health check configuration
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: '200',
      },

      // Deregistration delay
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // ===================================================================
    // HTTP Listener (port 80)
    // ===================================================================
    this.alb.addListener('HTTPListener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // ===================================================================
    // CloudFormation Outputs
    // ===================================================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.environment}-VpcId`,
    });

    new cdk.CfnOutput(this, 'ALBDnsName', {
      value: this.alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
      exportName: `${config.environment}-ALBDnsName`,
    });

    new cdk.CfnOutput(this, 'ALBArn', {
      value: this.alb.loadBalancerArn,
      description: 'ALB ARN',
      exportName: `${config.environment}-ALBArn`,
    });

    new cdk.CfnOutput(this, 'TargetGroupArn', {
      value: this.targetGroup.targetGroupArn,
      description: 'Target Group ARN',
      exportName: `${config.environment}-TargetGroupArn`,
    });

    // Add tags
    cdk.Tags.of(this).add('Environment', config.environment);
    cdk.Tags.of(this).add('Project', 'AccountPlatform');
  }
}
