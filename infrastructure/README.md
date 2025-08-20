# Musical Palm Tree - AWS Lambda Infrastructure

This directory contains Pulumi infrastructure code to deploy the Flask QR Code Creator to AWS Lambda with Function URL.

## Prerequisites

- Pulumi CLI installed
- AWS CLI configured with appropriate credentials
- Node.js and npm installed

## Quick Start

1. Install dependencies:
   ```bash
   cd infrastructure
   npm install
   ```

2. Initialize Pulumi stack:
   ```bash
   pulumi stack init dev
   ```

3. Configure deployment settings:
   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set appName musical-palm-tree
   pulumi config set environment dev
   ```

4. Preview the deployment:
   ```bash
   pulumi preview
   ```

5. Deploy the infrastructure:
   ```bash
   pulumi up
   ```

## Architecture

The infrastructure creates:

- **AWS Lambda Function**: Runs the Flask QR Code Creator using Python 3.9 runtime
- **Lambda Function URL**: Provides direct HTTPS access without API Gateway
- **IAM Role**: Execution role with CloudWatch Logs permissions
- **CloudWatch Log Group**: Centralized logging with configurable retention

## Configuration Options

- `aws:region`: AWS region for deployment (default: us-east-1)
- `appName`: Application name for resource naming (default: musical-palm-tree)
- `environment`: Deployment environment (default: dev)

## Outputs

After deployment, the following outputs are available:

- `functionUrl`: The public HTTPS URL to access the QR Code Creator
- `functionName`: The AWS Lambda function name
- `functionArn`: The AWS Lambda function ARN
- `logGroupName`: The CloudWatch Log Group name

## Cost Considerations

- Lambda Function: Pay-per-request pricing
- CloudWatch Logs: Storage and ingestion costs
- Function URL: No additional charges

## Security

- Function URL configured with CORS for web browser access
- IAM role follows least-privilege principle
- No hardcoded secrets or credentials

## Monitoring

- CloudWatch Logs automatically capture function output
- Log retention: 7 days (dev), 30 days (prod)
- Function metrics available in CloudWatch
