"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputeServiceComponent = void 0;
const pulumi = __importStar(require("@pulumi/pulumi"));
const aws = __importStar(require("@pulumi/aws"));
class ComputeServiceComponent extends pulumi.ComponentResource {
    constructor(name, args, opts) {
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
            name: pulumi.interpolate `/aws/lambda/${lambdaFunction.name}`,
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
exports.ComputeServiceComponent = ComputeServiceComponent;
