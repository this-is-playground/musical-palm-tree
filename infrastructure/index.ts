import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as path from "path";

// Configuration
const config = new pulumi.Config();
const appName = "qr-generator";
const environment = "dev";

// Resource naming helper
const resourceName = (resource: string) => `${appName}-${environment}-${resource}`;

// Create VPC for Lambda to access ElastiCache
const vpc = new awsx.ec2.Vpc(resourceName("vpc"), {
    numberOfAvailabilityZones: 2,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    natGateways: {
        strategy: "OnePerAz", // Required for Lambda to access internet
    },
});

// Security group for ElastiCache
const redisSg = new aws.ec2.SecurityGroup(resourceName("redis-sg"), {
    vpcId: vpc.vpcId,
    description: "Security group for ElastiCache Redis",
    ingress: [{
        protocol: "tcp",
        fromPort: 6379,
        toPort: 6379,
        self: true,
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

// Security group for Lambda
const lambdaSg = new aws.ec2.SecurityGroup(resourceName("lambda-sg"), {
    vpcId: vpc.vpcId,
    description: "Security group for Lambda function",
    ingress: [], // Lambda doesn't need inbound rules for Function URLs
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

// Allow Lambda to connect to Redis
new aws.ec2.SecurityGroupRule(resourceName("lambda-to-redis"), {
    type: "ingress",
    fromPort: 6379,
    toPort: 6379,
    protocol: "tcp",
    securityGroupId: redisSg.id,
    sourceSecurityGroupId: lambdaSg.id,
});

// ElastiCache subnet group
const cacheSubnetGroup = new aws.elasticache.SubnetGroup(resourceName("cache-subnet"), {
    subnetIds: vpc.privateSubnetIds,
});

// ElastiCache Redis cluster
const redisCluster = new aws.elasticache.ReplicationGroup(resourceName("redis"), {
    description: "Redis cluster for QR code stats",
    engine: "redis",
    nodeType: "cache.t3.micro", // Small instance for dev
    numCacheClusters: 1, // Single node for dev
    automaticFailoverEnabled: false,
    subnetGroupName: cacheSubnetGroup.name,
    securityGroupIds: [redisSg.id],
    atRestEncryptionEnabled: true,
    transitEncryptionEnabled: false, // Simplify for dev
    tags: {
        Name: resourceName("redis"),
        Environment: environment,
    },
});

// Lambda execution role
const lambdaRole = new aws.iam.Role(resourceName("lambda-role"), {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ 
        Service: "lambda.amazonaws.com" 
    }),
});

// Attach policies to Lambda role
new aws.iam.RolePolicyAttachment(resourceName("lambda-basic"), {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

// VPC execution policy for Lambda
new aws.iam.RolePolicyAttachment(resourceName("lambda-vpc"), {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
});

// Create Lambda deployment package from service directory
const lambdaCode = new pulumi.asset.FileArchive("../service/lambda_package");

// Lambda function
const lambdaFunction = new aws.lambda.Function("qr-generator-dev-function", {
    runtime: aws.lambda.Runtime.Python3d9,
    handler: "app.lambda_handler",
    role: lambdaRole.arn,
    code: lambdaCode,
    timeout: 30,
    memorySize: 512,
    vpcConfig: {
        subnetIds: vpc.privateSubnetIds,
        securityGroupIds: [lambdaSg.id],
    },
    environment: {
        variables: {
            REDIS_URL: pulumi.interpolate`redis://${redisCluster.primaryEndpointAddress}:6379`,
            LAMBDA_DEPLOYMENT: "true",
        },
    },
    tags: {
        Name: resourceName("function"),
        Environment: environment,
    },
});

// Lambda Function URL for direct access
const functionUrl = new aws.lambda.FunctionUrl(resourceName("function-url"), {
    functionName: lambdaFunction.name,
    authorizationType: "NONE", // Public access
    cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST"],
        allowHeaders: ["*"],
    },
});

// CloudWatch Log Group for Lambda
const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
    name: pulumi.interpolate`/aws/lambda/${lambdaFunction.name}`,
    retentionInDays: 7, // 7 days for dev
});

// Outputs
export const functionUrlEndpoint = functionUrl.functionUrl;
export const lambdaFunctionName = lambdaFunction.name;
export const redisEndpoint = redisCluster.primaryEndpointAddress;
export const vpcId = vpc.vpcId;
