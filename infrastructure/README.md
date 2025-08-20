# QR Code Creator - AWS Lambda Deployment

This directory contains Pulumi infrastructure code to deploy the Flask QR Code Creator application to AWS Lambda with Function URL.

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

3. Configure the deployment:
   ```bash
   pulumi config set aws:region us-east-1
   pulumi config set appName qr-code-creator
   pulumi config set environment dev
   ```

4. Preview the deployment:
   ```bash
   pulumi preview
   ```

5. Deploy to AWS:
   ```bash
   pulumi up
   ```

## Architecture

The deployment creates:

- **AWS Lambda Function**: Runs the Flask QR Code Creator application using aws-wsgi adapter
- **Function URL**: Provides direct HTTP access without API Gateway
- **IAM Role**: Minimal permissions for Lambda execution and CloudWatch logging
- **CloudWatch Log Group**: Centralized logging with configurable retention

## Configuration Options

- `appName`: Application name used in resource naming (default: "qr-code-creator")
- `environment`: Environment name (default: "dev")
- `aws:region`: AWS region for deployment (recommended: "us-east-1")

## Cost Considerations

- **Lambda**: Pay-per-request pricing, very cost-effective for sporadic usage
- **Function URL**: No additional cost (included with Lambda)
- **CloudWatch Logs**: Minimal cost for log storage and ingestion

## Security Notes

- Function URL is configured with CORS enabled for web browser access
- No authentication required (public access)
- Lambda runs with minimal IAM permissions
- All traffic is encrypted in transit (HTTPS)

## Updating the Application

To update the application code:

1. Make changes to the Flask application in `../service/app.py`
2. Run `pulumi up` to redeploy with the updated code

## Monitoring

- CloudWatch logs are available at `/aws/lambda/{function-name}`
- Lambda metrics are available in the AWS CloudWatch console
- Function URL access logs are included in Lambda logs

## Cleanup

To remove all resources:

```bash
pulumi destroy
```
