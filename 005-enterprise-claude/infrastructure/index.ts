import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Configuration
const config = new pulumi.Config();
const appName = config.get("appName") || "qr-code-creator";
const environment = config.get("environment") || "dev";
const region = config.get("aws:region") || "us-east-1";

// Resource naming helper
const resourceName = (resource: string) => `${appName}-${environment}-${resource}`;

// VPC with public and private subnets
const vpc = new awsx.ec2.Vpc(resourceName("vpc"), {
    enableDnsHostnames: true,
    enableDnsSupport: true,
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    natGateways: {
        strategy: "Single", // Cost optimization for dev
    },
    tags: {
        Name: resourceName("vpc"),
        Environment: environment,
        Application: appName,
    },
});

// ECR Repository for container images
const repository = new aws.ecr.Repository(resourceName("repo"), {
    name: resourceName("repo"),
    imageTagMutability: "MUTABLE",
    imageScanningConfiguration: {
        scanOnPush: true,
    },
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// ECR Lifecycle Policy to manage image cleanup
new aws.ecr.LifecyclePolicy(resourceName("lifecycle"), {
    repository: repository.name,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Keep last 5 images",
            selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 5
            },
            action: {
                type: "expire"
            }
        }]
    })
});

// Build and push Docker image
const image = new awsx.ecr.Image(resourceName("image"), {
    repositoryUrl: repository.repositoryUrl,
    context: "../service",
    dockerfile: "../service/Dockerfile",
    platform: "linux/amd64",
});

// ECS Cluster
const cluster = new aws.ecs.Cluster(resourceName("cluster"), {
    name: resourceName("cluster"),
    settings: [{
        name: "containerInsights",
        value: "enabled",
    }],
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// CloudWatch Log Group
const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
    name: `/ecs/${resourceName("app")}`,
    retentionInDays: environment === "prod" ? 30 : 7,
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// Security Group for ALB
const albSecurityGroup = new aws.ec2.SecurityGroup(resourceName("alb-sg"), {
    name: resourceName("alb-sg"),
    vpcId: vpc.vpcId,
    description: "Security group for Application Load Balancer",
    ingress: [{
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
        description: "HTTP traffic from internet",
    }, {
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"],
        description: "HTTPS traffic from internet",
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "All outbound traffic",
    }],
    tags: {
        Name: resourceName("alb-sg"),
        Environment: environment,
        Application: appName,
    },
});

// Security Group for ECS Tasks
const appSecurityGroup = new aws.ec2.SecurityGroup(resourceName("app-sg"), {
    name: resourceName("app-sg"),
    vpcId: vpc.vpcId,
    description: "Security group for ECS tasks",
    ingress: [{
        protocol: "tcp",
        fromPort: 8080,
        toPort: 8080,
        securityGroups: [albSecurityGroup.id],
        description: "Traffic from ALB",
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        description: "All outbound traffic",
    }],
    tags: {
        Name: resourceName("app-sg"),
        Environment: environment,
        Application: appName,
    },
});

// Application Load Balancer
const alb = new aws.lb.LoadBalancer(resourceName("alb"), {
    name: resourceName("alb"),
    internal: false,
    loadBalancerType: "application",
    securityGroups: [albSecurityGroup.id],
    subnets: vpc.publicSubnetIds,
    enableDeletionProtection: false,
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// Target Group
const targetGroup = new aws.lb.TargetGroup(resourceName("tg"), {
    name: resourceName("tg"),
    port: 8080,
    protocol: "HTTP",
    vpcId: vpc.vpcId,
    targetType: "ip",
    healthCheck: {
        enabled: true,
        path: "/",
        protocol: "HTTP",
        port: "traffic-port",
        healthyThreshold: 2,
        unhealthyThreshold: 2,
        timeout: 5,
        interval: 30,
        matcher: "200",
    },
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// ALB Listener
new aws.lb.Listener(resourceName("listener"), {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});

// DynamoDB Table for QR stats (On-demand billing for enterprise scale)
const dynamoTable = new aws.dynamodb.Table(resourceName("qr-stats"), {
    name: resourceName("qr-stats"),
    billingMode: "PAY_PER_REQUEST", // On-demand for enterprise scaling
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
    pointInTimeRecovery: {
        enabled: true, // Enterprise backup feature
    },
    serverSideEncryption: {
        enabled: true, // Enterprise security
    },
    tags: {
        Name: resourceName("qr-stats"),
        Environment: environment,
        Application: appName,
    },
});

// IAM Role for ECS Task Execution
const executionRole = new aws.iam.Role(resourceName("execution-role"), {
    name: resourceName("execution-role"),
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com"
            }
        }]
    }),
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// Attach AmazonECSTaskExecutionRolePolicy
new aws.iam.RolePolicyAttachment(resourceName("execution-role-policy"), {
    role: executionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// IAM Role for ECS Tasks
const taskRole = new aws.iam.Role(resourceName("task-role"), {
    name: resourceName("task-role"),
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ecs-tasks.amazonaws.com"
            }
        }]
    }),
    tags: {
        Environment: environment,
        Application: appName,
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

// ECS Task Definition
const taskDefinition = new aws.ecs.TaskDefinition(resourceName("task"), {
    family: resourceName("app"),
    cpu: environment === "prod" ? "512" : "256",
    memory: environment === "prod" ? "1024" : "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: pulumi.jsonStringify([{
        name: "app",
        image: image.imageUri,
        essential: true,
        portMappings: [{
            containerPort: 8080,
            protocol: "tcp",
        }],
        environment: [
            {
                name: "ENVIRONMENT",
                value: environment,
            },
            {
                name: "AWS_DEFAULT_REGION",
                value: region,
            },
            {
                name: "DYNAMODB_TABLE",
                value: dynamoTable.name,
            }
        ],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": logGroup.name,
                "awslogs-region": region,
                "awslogs-stream-prefix": "ecs",
            },
        },
        healthCheck: {
            command: ["CMD-SHELL", "curl -f http://localhost:8080/ || exit 1"],
            interval: 30,
            timeout: 5,
            retries: 3,
            startPeriod: 60,
        },
    }]),
    tags: {
        Environment: environment,
        Application: appName,
    },
});

// ECS Service
const service = new aws.ecs.Service(resourceName("service"), {
    name: resourceName("service"),
    cluster: cluster.id,
    taskDefinition: taskDefinition.arn,
    desiredCount: environment === "prod" ? 2 : 1,
    launchType: "FARGATE",
    platformVersion: "LATEST",
    networkConfiguration: {
        assignPublicIp: false,
        securityGroups: [appSecurityGroup.id],
        subnets: vpc.privateSubnetIds,
    },
    loadBalancers: [{
        targetGroupArn: targetGroup.arn,
        containerName: "app",
        containerPort: 8080,
    }],
    deploymentMaximumPercent: 200,
    deploymentMinimumHealthyPercent: 50,
    enableExecuteCommand: true,
    tags: {
        Environment: environment,
        Application: appName,
    },
}, {
    dependsOn: [targetGroup],
});

// Auto Scaling Target
const autoScalingTarget = new aws.appautoscaling.Target(resourceName("autoscaling-target"), {
    maxCapacity: environment === "prod" ? 10 : 3,
    minCapacity: environment === "prod" ? 2 : 1,
    resourceId: pulumi.interpolate`service/${cluster.name}/${service.name}`,
    scalableDimension: "ecs:service:DesiredCount",
    serviceNamespace: "ecs",
});

// Auto Scaling Policy for CPU
new aws.appautoscaling.Policy(resourceName("cpu-scaling-policy"), {
    name: resourceName("cpu-scaling"),
    policyType: "TargetTrackingScaling",
    resourceId: autoScalingTarget.resourceId,
    scalableDimension: autoScalingTarget.scalableDimension,
    serviceNamespace: autoScalingTarget.serviceNamespace,
    targetTrackingScalingPolicyConfiguration: {
        predefinedMetricSpecification: {
            predefinedMetricType: "ECSServiceAverageCPUUtilization",
        },
        targetValue: 70.0,
        scaleInCooldown: 300,
        scaleOutCooldown: 300,
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
                    view: "timeSeries",
                    stacked: false,
                    region: region,
                    title: "ECS Service Metrics",
                    period: 300,
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
                        [".", "ResponseTime", ".", "."],
                    ],
                    view: "timeSeries",
                    stacked: false,
                    region: region,
                    title: "Load Balancer Metrics",
                    period: 300,
                },
            },
        ],
    }),
});

// Exports
export const vpcId = vpc.vpcId;
export const clusterName = cluster.name;
export const serviceName = service.name;
export const repositoryUrl = repository.repositoryUrl;
export const loadBalancerUrl = pulumi.interpolate`http://${alb.dnsName}`;
export const dashboardUrl = pulumi.interpolate`https://console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboard.dashboardName}`;
export const logGroupName = logGroup.name;
export const logStreamUrl = pulumi.interpolate`https://console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${logGroup.name.apply(n => encodeURIComponent(n))}`;