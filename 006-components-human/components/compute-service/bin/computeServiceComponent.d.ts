import * as pulumi from "@pulumi/pulumi";
export declare class ComputeServiceComponent extends pulumi.ComponentResource {
    readonly functionUrl: pulumi.Output<string>;
    readonly functionName: pulumi.Output<string>;
    constructor(name: string, args: ComputeServiceComponentArgs, opts?: pulumi.ComponentResourceOptions);
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
    environmentVariables?: pulumi.Input<{
        [key: string]: pulumi.Input<string>;
    }>;
    /**
     * CloudWatch log retention in days (optional, defaults to 7)
     */
    logRetentionDays?: pulumi.Input<number>;
}
