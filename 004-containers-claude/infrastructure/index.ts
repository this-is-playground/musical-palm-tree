import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Configuration
const config = new pulumi.Config();
const appConfig = {
    appName: config.get("appName") || "qr-tool",
    environment: config.get("environment") || "dev",
    region: config.get("aws:region") || "us-east-1",
    containerPort: config.getNumber("containerPort") || 8080,
};

// Resource naming convention
const resourceName = (resource: string) => 
    `${appConfig.appName}-${appConfig.environment}-${resource}`;

// VPC with public and private subnets
const vpc = new awsx.ec2.Vpc(resourceName("vpc"), {
    enableDnsHostnames: true,
    enableDnsSupport: true,
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    tags: {
        Name: resourceName("vpc"),
        Environment: appConfig.environment,
        Application: appConfig.appName,
    },
});

// Security Group for ALB
const albSecurityGroup = new aws.ec2.SecurityGroup(resourceName("alb-sg"), {
    vpcId: vpc.vpcId,
    description: "Security group for Application Load Balancer",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"],
            description: "HTTP from anywhere",
        },
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"],
            description: "HTTPS from anywhere",
        },
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    tags: {
        Name: resourceName("alb-sg"),
        Environment: appConfig.environment,
    },
});

// Security Group for ECS Tasks
const ecsSecurityGroup = new aws.ec2.SecurityGroup(resourceName("ecs-sg"), {
    vpcId: vpc.vpcId,
    description: "Security group for ECS tasks",
    ingress: [
        {
            protocol: "tcp",
            fromPort: appConfig.containerPort,
            toPort: appConfig.containerPort,
            securityGroups: [albSecurityGroup.id],
            description: "Allow traffic from ALB",
        },
    ],
    egress: [
        {
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
        },
    ],
    tags: {
        Name: resourceName("ecs-sg"),
        Environment: appConfig.environment,
    },
});

// Application Load Balancer
const alb = new aws.lb.LoadBalancer(resourceName("alb"), {
    loadBalancerType: "application",
    internal: false,
    securityGroups: [albSecurityGroup.id],
    subnets: vpc.publicSubnetIds,
    enableDeletionProtection: appConfig.environment === "prod",
    tags: {
        Name: resourceName("alb"),
        Environment: appConfig.environment,
    },
});

// Target Group for ALB
const targetGroup = new aws.lb.TargetGroup(resourceName("tg"), {
    port: appConfig.containerPort,
    protocol: "HTTP",
    vpcId: vpc.vpcId,
    targetType: "ip",
    healthCheck: {
        enabled: true,
        healthyThreshold: 2,
        interval: 30,
        matcher: "200",
        path: "/",
        port: "traffic-port",
        protocol: "HTTP",
        timeout: 5,
        unhealthyThreshold: 3,
    },
    tags: {
        Name: resourceName("tg"),
        Environment: appConfig.environment,
    },
});

// ALB Listener
const albListener = new aws.lb.Listener(resourceName("listener"), {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [
        {
            type: "forward",
            targetGroupArn: targetGroup.arn,
        },
    ],
});

// DynamoDB Table for QR stats (Provisioned capacity)
const dynamoTable = new aws.dynamodb.Table(resourceName("qr-stats"), {
    name: resourceName("qr-stats"),
    billingMode: "PROVISIONED",
    readCapacity: 5,
    writeCapacity: 5,
    attributes: [
        {
            name: "stat_key",
            type: "S",
        },
    ],
    hashKey: "stat_key",
    ttl: {
        attributeName: "expires_at",
        enabled: true,
    },
    tags: {
        Name: resourceName("qr-stats"),
        Environment: appConfig.environment,
        Application: appConfig.appName,
    },
});

// ECR Repository
const ecrRepository = new aws.ecr.Repository(resourceName("ecr"), {
    name: resourceName("app"),
    imageTagMutability: "MUTABLE",
    imageScanningConfiguration: {
        scanOnPush: true,
    },
    encryptionConfigurations: [
        {
            encryptionType: "AES256",
        },
    ],
    tags: {
        Name: resourceName("ecr"),
        Environment: appConfig.environment,
    },
});

// ECR Lifecycle Policy
new aws.ecr.LifecyclePolicy(resourceName("ecr-lifecycle"), {
    repository: ecrRepository.name,
    policy: JSON.stringify({
        rules: [
            {
                rulePriority: 1,
                description: "Keep last 10 images",
                selection: {
                    tagStatus: "any",
                    countType: "imageCountMoreThan",
                    countNumber: 10,
                },
                action: {
                    type: "expire",
                },
            },
        ],
    }),
});

// CloudWatch Log Group
const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
    name: `/ecs/${resourceName("app")}`,
    retentionInDays: appConfig.environment === "prod" ? 30 : 7,
    tags: {
        Name: resourceName("logs"),
        Environment: appConfig.environment,
    },
});

// ECS Cluster
const cluster = new aws.ecs.Cluster(resourceName("cluster"), {
    name: resourceName("cluster"),
    settings: [
        {
            name: "containerInsights",
            value: "enabled",
        },
    ],
    tags: {
        Name: resourceName("cluster"),
        Environment: appConfig.environment,
    },
});

// IAM Role for ECS Task Execution
const taskExecutionRole = new aws.iam.Role(resourceName("task-execution-role"), {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "ecs-tasks.amazonaws.com",
                },
            },
        ],
    }),
    tags: {
        Name: resourceName("task-execution-role"),
        Environment: appConfig.environment,
    },
});

// Attach the ECS Task Execution Role Policy
new aws.iam.RolePolicyAttachment(resourceName("task-execution-policy"), {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// Additional policy for ECR access
new aws.iam.RolePolicyAttachment(resourceName("ecr-policy"), {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
});

// IAM Role for ECS Tasks
const taskRole = new aws.iam.Role(resourceName("task-role"), {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "ecs-tasks.amazonaws.com",
                },
            },
        ],
    }),
    tags: {
        Name: resourceName("task-role"),
        Environment: appConfig.environment,
    },
});

// DynamoDB policy for ECS tasks
new aws.iam.RolePolicy(resourceName("task-dynamodb-policy"), {
    role: taskRole.id,
    policy: pulumi.interpolate`{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan"
                ],
                "Resource": "${dynamoTable.arn}"
            }
        ]
    }`,
});

// Build and push Docker image
const image = new awsx.ecr.Image(resourceName("image"), {
    repositoryUrl: ecrRepository.repositoryUrl,
    context: "../service", // Path to your Dockerfile directory
    dockerfile: "../service/Dockerfile",
    platform: "linux/amd64", // Force x86_64 for ECS Fargate compatibility
});

// ECS Task Definition
const taskDefinition = new aws.ecs.TaskDefinition(resourceName("task"), {
    family: resourceName("app"),
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecutionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.jsonStringify([
        {
            name: "app",
            image: image.imageUri,
            portMappings: [
                {
                    containerPort: appConfig.containerPort,
                    protocol: "tcp",
                },
            ],
            essential: true,
            logConfiguration: {
                logDriver: "awslogs",
                options: {
                    "awslogs-group": logGroup.name,
                    "awslogs-region": appConfig.region,
                    "awslogs-stream-prefix": "ecs",
                },
            },
            environment: [
                {
                    name: "FLASK_ENV",
                    value: appConfig.environment,
                },
                {
                    name: "PORT",
                    value: appConfig.containerPort.toString(),
                },
                {
                    name: "DYNAMODB_TABLE",
                    value: dynamoTable.name,
                },
                {
                    name: "AWS_DEFAULT_REGION",
                    value: appConfig.region,
                },
            ],
        },
    ]),
    tags: {
        Name: resourceName("task"),
        Environment: appConfig.environment,
    },
});

// ECS Service
const service = new aws.ecs.Service(resourceName("service"), {
    name: resourceName("service"),
    cluster: cluster.arn,
    taskDefinition: taskDefinition.arn,
    launchType: "FARGATE",
    desiredCount: appConfig.environment === "prod" ? 2 : 1,
    networkConfiguration: {
        subnets: vpc.privateSubnetIds,
        securityGroups: [ecsSecurityGroup.id],
        assignPublicIp: false,
    },
    loadBalancers: [
        {
            targetGroupArn: targetGroup.arn,
            containerName: "app",
            containerPort: appConfig.containerPort,
        },
    ],
    tags: {
        Name: resourceName("service"),
        Environment: appConfig.environment,
    },
}, { dependsOn: [albListener] });

// Auto Scaling Target
const scalingTarget = new aws.appautoscaling.Target(resourceName("scaling-target"), {
    maxCapacity: appConfig.environment === "prod" ? 10 : 3,
    minCapacity: appConfig.environment === "prod" ? 2 : 1,
    resourceId: pulumi.interpolate`service/${cluster.name}/${service.name}`,
    scalableDimension: "ecs:service:DesiredCount",
    serviceNamespace: "ecs",
});

// Auto Scaling Policy - CPU
new aws.appautoscaling.Policy(resourceName("cpu-scaling"), {
    name: resourceName("cpu-scaling"),
    policyType: "TargetTrackingScaling",
    resourceId: scalingTarget.resourceId,
    scalableDimension: scalingTarget.scalableDimension,
    serviceNamespace: scalingTarget.serviceNamespace,
    targetTrackingScalingPolicyConfiguration: {
        predefinedMetricSpecification: {
            predefinedMetricType: "ECSServiceAverageCPUUtilization",
        },
        targetValue: 70,
        scaleOutCooldown: 300,
        scaleInCooldown: 300,
    },
});

// CloudWatch Dashboard
const dashboard = new aws.cloudwatch.Dashboard(resourceName("dashboard"), {
    dashboardName: resourceName("metrics"),
    dashboardBody: pulumi.jsonStringify({
        widgets: [
            {
                type: "metric",
                x: 0,
                y: 0,
                width: 12,
                height: 6,
                properties: {
                    metrics: [
                        ["AWS/ECS", "CPUUtilization", "ServiceName", service.name, "ClusterName", cluster.name],
                        [".", "MemoryUtilization", ".", ".", ".", "."],
                    ],
                    period: 300,
                    stat: "Average",
                    region: appConfig.region,
                    title: "ECS Service Metrics",
                },
            },
            {
                type: "metric",
                x: 0,
                y: 6,
                width: 12,
                height: 6,
                properties: {
                    metrics: [
                        ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", alb.arnSuffix],
                        [".", "TargetResponseTime", ".", "."],
                    ],
                    period: 300,
                    stat: "Sum",
                    region: appConfig.region,
                    title: "Load Balancer Metrics",
                },
            },
        ],
    }),
});

// Outputs
export const vpcId = vpc.vpcId;
export const albDnsName = alb.dnsName;
export const albZoneId = alb.zoneId;
export const ecrRepositoryUrl = ecrRepository.repositoryUrl;
export const clusterArn = cluster.arn;
export const serviceName = service.name;
export const applicationUrl = pulumi.interpolate`http://${alb.dnsName}`;
export const dashboardUrl = pulumi.interpolate`https://console.aws.amazon.com/cloudwatch/home?region=${appConfig.region}#dashboards:name=${dashboard.dashboardName}`;