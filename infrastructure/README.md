# QR Code Generator - AWS Lambda Deployment

This directory contains Pulumi infrastructure code to deploy the Flask QR code generator application to AWS Lambda with Function URL.

## Architecture

- **AWS Lambda**: Serverless compute for the Flask application
- **Lambda Function URL**: Direct HTTP access without API Gateway
- **CloudWatch Logs**: Application logging with 7-day retention
- **IAM Role**: Least-privilege execution role for Lambda

## Prerequisites

- Pulumi CLI installed
- AWS CLI configured with appropriate permissions
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

3. Configure the deployment:
   ```bash
   pulumi config set appName qr-generator
   pulumi config set aws:region us-east-1
   ```

4. Preview the deployment:
   ```bash
   pulumi preview
   ```

5. Deploy the infrastructure:
   ```bash
   pulumi up
   ```

6. Get the Function URL:
   ```bash
   pulumi stack output functionUrl
   ```

## Configuration Options

- `appName`: Name of the application (required)
- `environment`: Deployment environment (defaults to "dev")
- `aws:region`: AWS region for deployment (defaults to "us-east-1")

## Resources Created

- Lambda function with Python 3.9 runtime
- Lambda Function URL for public HTTP access
- IAM execution role with CloudWatch logs permissions
- CloudWatch log group with 7-day retention

## Cost Considerations

- Lambda pricing: Pay per request and compute time
- CloudWatch Logs: Minimal cost for log storage
- No API Gateway costs (using Function URL)
- Estimated cost: <$1/month for light usage

## Security Notes

- Function URL has no authentication (public access)
- Lambda execution role has minimal required permissions
- All resources are tagged for cost allocation
- CloudWatch logging enabled for monitoring

## Cleanup

To remove all resources:
```bash
pulumi destroy
```
