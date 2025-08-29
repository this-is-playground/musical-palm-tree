import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export class ComputeServiceComponent extends pulumi.ComponentResource {
    public readonly functionUrl: pulumi.Output<string>;
    public readonly functionName: pulumi.Output<string>;

    constructor(name: string, args: ComputeServiceComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("qr-service:compute:ComputeService", name, args, opts);

        // Lambda execution role
        const lambdaRole = new aws.iam.Role(`${name}-lambda-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ 
                Service: "lambda.amazonaws.com" 
            }),
            tags: {
                "compute:component": "true",
                "compute:type": "serverless"
            }
        }, { parent: this });

        // Attach basic execution policy
        new aws.iam.RolePolicyAttachment(`${name}-lambda-basic`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
        }, { parent: this });

        // VPC access policy (if needed for connecting to other resources)
        new aws.iam.RolePolicyAttachment(`${name}-lambda-vpc`, {
            role: lambdaRole,
            policyArn: aws.iam.ManagedPolicy.AWSLambdaVPCAccessExecutionRole,
        }, { parent: this });

        // Create Lambda deployment package  
        const lambdaCode = new pulumi.asset.FileArchive(args.codePath);

        // Lambda function
        const lambdaFunction = new aws.lambda.Function(`${name}-function`, {
            runtime: aws.lambda.Runtime.Python3d9,
            handler: args.handler || "app.lambda_handler",
            role: lambdaRole.arn,
            code: lambdaCode,
            timeout: args.timeout || 30,
            memorySize: args.memorySize || 512,
            environment: {
                variables: {
                    LAMBDA_DEPLOYMENT: "true",
                    ...(args.environmentVariables || {}),
                },
            },
            tags: {
                "compute:component": "true",
                "compute:type": "serverless",
                "compute:memory": pulumi.output(args.memorySize || 512).apply(m => m.toString()),
            },
        }, { parent: this });

        // Lambda Function URL for direct access
        const functionUrl = new aws.lambda.FunctionUrl(`${name}-function-url`, {
            functionName: lambdaFunction.name,
            authorizationType: "NONE", // Public access
            cors: {
                allowOrigins: ["*"],
                allowMethods: ["GET", "POST"],
                allowHeaders: ["*"],
            },
        }, { parent: this });

        // CloudWatch Log Group
        new aws.cloudwatch.LogGroup(`${name}-logs`, {
            name: pulumi.interpolate`/aws/lambda/${lambdaFunction.name}`,
            retentionInDays: args.logRetentionDays || 7,
        }, { parent: this });

        this.functionUrl = functionUrl.functionUrl;
        this.functionName = lambdaFunction.name;

        this.registerOutputs({
            functionUrl: this.functionUrl,
            functionName: this.functionName
        });
    }
}

export interface ComputeServiceComponentArgs {
    /**
     * Path to the Lambda function code (directory containing the code)
     */
    codePath: string;
    /**
     * Lambda handler function (optional, defaults to "app.lambda_handler")
     */
    handler?: pulumi.Input<string>;
    /**
     * Lambda timeout in seconds (optional, defaults to 30)
     */
    timeout?: pulumi.Input<number>;
    /**
     * Lambda memory size in MB (optional, defaults to 512)
     */
    memorySize?: pulumi.Input<number>;
    /**
     * Environment variables for the Lambda function
     */
    environmentVariables?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * CloudWatch log retention in days (optional, defaults to 7)
     */
    logRetentionDays?: pulumi.Input<number>;
}