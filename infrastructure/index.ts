import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

interface AppConfig {
  environment: string;
  region: string;
  appName: string;
}

const config = new pulumi.Config();
const appConfig: AppConfig = {
  environment: config.get("environment") || "dev",
  region: config.get("region") || "ca-central-1",
  appName: config.get("appName") || "cat-service",
};

const resourceName = (resource: string) =>
  `${appConfig.appName}-${appConfig.environment}-${resource}`;

const lambdaRole = new aws.iam.Role(resourceName("lambda-role"), {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  tags: {
    Environment: appConfig.environment,
    Application: appConfig.appName,
    ManagedBy: "Pulumi",
  },
});

new aws.iam.RolePolicyAttachment(resourceName("lambda-basic-policy"), {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
  name: `/aws/lambda/${resourceName("function")}`,
  retentionInDays: appConfig.environment === "prod" ? 30 : 7,
  tags: {
    Environment: appConfig.environment,
    Application: appConfig.appName,
    ManagedBy: "Pulumi",
  },
});

const lambdaFunction = new aws.lambda.Function(resourceName("function"), {
  runtime: aws.lambda.Runtime.Python3d9,
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("../cat-service"),
  }),
  handler: "lambda_handler.handler",
  role: lambdaRole.arn,
  timeout: 30,
  memorySize: 256,
  environment: {
    variables: {
      ENVIRONMENT: appConfig.environment,
      REGION: appConfig.region,
    },
  },
  tags: {
    Environment: appConfig.environment,
    Application: appConfig.appName,
    ManagedBy: "Pulumi",
  },
}, { dependsOn: [logGroup] });

const lambdaFunctionUrl = new aws.lambda.FunctionUrl(resourceName("function-url"), {
  functionName: lambdaFunction.name,
  authorizationType: "NONE",
  cors: {
    allowCredentials: false,
    allowMethods: ["GET", "POST"],
    allowOrigins: ["*"],
    allowHeaders: ["*"],
    maxAge: 86400,
  },
});

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
            ["AWS/Lambda", "Invocations", "FunctionName", lambdaFunction.name],
            [".", "Errors", ".", "."],
            [".", "Duration", ".", "."],
          ],
          period: 300,
          stat: "Average",
          region: appConfig.region,
          title: "Lambda Function Metrics",
        },
      },
    ],
  }),
});

export const functionName = lambdaFunction.name;
export const functionUrl = lambdaFunctionUrl.functionUrl;
export const functionArn = lambdaFunction.arn;
export const logGroupName = logGroup.name;
export const dashboardUrl = pulumi.interpolate`https://${appConfig.region}.console.aws.amazon.com/cloudwatch/home?region=${appConfig.region}#dashboards:name=${dashboard.dashboardName}`;
