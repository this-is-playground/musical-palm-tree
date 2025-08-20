import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as path from "path";

const config = new pulumi.Config();
const appName = config.get("appName") || "qr-code-creator";
const environment = config.get("environment") || "dev";

const resourceName = (resource: string) =>
  `${appName}-${environment}-${resource}`;

const lambdaRole = new aws.iam.Role(resourceName("lambda-role"), {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: "lambda.amazonaws.com",
  }),
});

new aws.iam.RolePolicyAttachment(resourceName("lambda-policy"), {
  role: lambdaRole.name,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const logGroup = new aws.cloudwatch.LogGroup(resourceName("logs"), {
  name: `/aws/lambda/${resourceName("function")}`,
  retentionInDays: environment === "prod" ? 30 : 7,
});

const lambdaFunction = new aws.lambda.Function(resourceName("function"), {
  runtime: aws.lambda.Runtime.Python3d9,
  code: new pulumi.asset.FileArchive("../lambda_package.zip"),
  handler: "lambda_adapter.lambda_handler",
  role: lambdaRole.arn,
  timeout: 30,
  memorySize: 512,
  environment: {
    variables: {
      PYTHONPATH: "/var/task:/var/task/service",
    },
  },
});

const functionUrl = new aws.lambda.FunctionUrl(resourceName("function-url"), {
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

export const functionUrlEndpoint = functionUrl.functionUrl;
export const lambdaFunctionName = lambdaFunction.name;
export const lambdaFunctionArn = lambdaFunction.arn;
