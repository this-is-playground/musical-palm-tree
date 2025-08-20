import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "path";

const config = new pulumi.Config();
const appName = config.get("appName") || "musical-palm-tree";
const environment = config.get("environment") || "dev";

const resourceName = (resource: string) =>
  `${appName}-${environment}-${resource}`;

const lambdaRole = new aws.iam.Role(resourceName("lambda-role"), {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
  tags: {
    Name: resourceName("lambda-role"),
    Environment: environment,
    Application: appName,
  },
});

new aws.iam.RolePolicyAttachment(resourceName("lambda-policy"), {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
  name: `/aws/lambda/${resourceName("function")}`,
  retentionInDays: environment === "prod" ? 30 : 7,
  tags: {
    Name: resourceName("logs"),
    Environment: environment,
    Application: appName,
  },
});

const deploymentPackage = new pulumi.asset.AssetArchive({
  ".": new pulumi.asset.FileArchive(path.join(__dirname, "../service/deployment_package")),
});

const lambdaFunction = new aws.lambda.Function(resourceName("function"), {
  name: resourceName("function"),
  runtime: aws.lambda.Runtime.Python3d9,
  code: deploymentPackage,
  handler: "lambda_adapter.lambda_handler",
  role: lambdaRole.arn,
  memorySize: 512,
  timeout: 30,
  environment: {
    variables: {
      PYTHONPATH: "/var/task",
    },
  },
  tags: {
    Name: resourceName("function"),
    Environment: environment,
    Application: appName,
  },
}, {
  dependsOn: [logGroup],
});

const lambdaFunctionUrl = new aws.lambda.FunctionUrl(resourceName("function-url"), {
  functionName: lambdaFunction.name,
  authorizationType: "NONE",
  cors: {
    allowCredentials: false,
    allowMethods: ["*"],
    allowOrigins: ["*"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
    maxAge: 86400,
  },
});

export const functionUrl = lambdaFunctionUrl.functionUrl;
export const functionName = lambdaFunction.name;
export const functionArn = lambdaFunction.arn;
export const logGroupName = logGroup.name;
