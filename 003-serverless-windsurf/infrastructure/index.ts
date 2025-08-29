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

// Get default VPC and subnets for Redis (simpler than creating custom VPC)
const defaultVpc = aws.ec2.getVpc({ default: true });
const defaultSubnets = defaultVpc.then(vpc => aws.ec2.getSubnets({ 
    filters: [{ name: "vpc-id", values: [vpc.id] }] 
}));

// Security group for ElastiCache Redis (in default VPC) 
const redisSg = new aws.ec2.SecurityGroup(resourceName("redis-sg"), {
    vpcId: defaultVpc.then(vpc => vpc.id),
    description: "Security group for ElastiCache Redis",
    ingress: [{
        protocol: "tcp",
        fromPort: 6379,
        toPort: 6379,
        cidrBlocks: ["0.0.0.0/0"], // Allow from anywhere (for simplicity)
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

// ElastiCache Serverless Redis cache (in default VPC)
const redisServerlessCache = new aws.elasticache.ServerlessCache(resourceName("redis-serverless-v6"), {
    engine: "redis",
    name: resourceName("redis-serverless-v6"),
    subnetIds: defaultSubnets.then(subnets => subnets.ids),
    securityGroupIds: [redisSg.id],
    description: "Serverless Redis cache for QR code stats",
    dailySnapshotTime: "03:00",
    tags: {
        Name: resourceName("redis-serverless"),
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

// Security group for Lambda to access Redis
const lambdaSg = new aws.ec2.SecurityGroup(resourceName("lambda-sg"), {
    vpcId: defaultVpc.then(vpc => vpc.id),
    description: "Security group for Lambda function",
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

// Lambda function (in VPC with public subnets - no NAT needed)
const lambdaFunction = new aws.lambda.Function(resourceName("function"), {
    runtime: aws.lambda.Runtime.Python3d9,
    handler: "app.lambda_handler",
    role: lambdaRole.arn,
    code: lambdaCode,
    timeout: 30,
    memorySize: 512,
    vpcConfig: {
        subnetIds: defaultSubnets.then(subnets => subnets.ids.slice(0, 2)), // Use first 2 public subnets
        securityGroupIds: [lambdaSg.id],
    },
    environment: {
        variables: {
            REDIS_URL: pulumi.interpolate`rediss://${redisServerlessCache.endpoints.apply(eps => eps[0].address)}:6379`,
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
export const redisEndpoint = redisServerlessCache.endpoints.apply(eps => eps[0].address);
