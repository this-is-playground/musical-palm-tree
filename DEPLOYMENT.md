# AWS Lambda Deployment with Pulumi

## Overview
The Flask QR Code Creator application has been successfully deployed to AWS Lambda with Function URL using Pulumi infrastructure as code.

## Deployed Resources
- **AWS Lambda Function**: `qr-code-creator-dev-function`
- **Function URL**: https://y7ix63azhvlqvavgryqauqldce0griuu.lambda-url.us-east-1.on.aws/
- **Runtime**: Python 3.9
- **Memory**: 512MB
- **Timeout**: 30 seconds
- **IAM Role**: Lambda execution role with CloudWatch logs permissions
- **CloudWatch Log Group**: `/aws/lambda/qr-code-creator-dev-function`

## Architecture
- Flask application adapted for Lambda using `aws-wsgi` library
- Function URL provides direct HTTP access without API Gateway
- CORS enabled for web browser access
- Dependencies packaged with Lambda deployment zip

## Testing Results
✅ **Function URL accessible**: Application loads correctly  
✅ **QR Code Generation**: Successfully generates QR codes using external API  
✅ **Web Interface**: All UI elements and controls work properly  
✅ **Download Options**: "Open image" and "Download PNG" buttons functional  
✅ **Styling Options**: Size, error correction, and margin controls working  

## Infrastructure Files
- `infrastructure/index.ts` - Main Pulumi infrastructure code
- `infrastructure/package.json` - Node.js dependencies for Pulumi
- `lambda_adapter.py` - Flask-to-Lambda adapter using aws-wsgi
- `lambda_requirements.txt` - Python dependencies (Flask, aws-wsgi)
- `package_lambda.py` - Script to create deployment package with dependencies

## Deployment Commands
```bash
# Package Lambda function with dependencies
python3 package_lambda.py

# Deploy infrastructure
cd infrastructure
pulumi up -y
```

## Cost Optimization
- Function URL eliminates API Gateway costs
- Lambda pricing based on requests and compute time
- CloudWatch logs retention: 7 days (dev), 30 days (prod)
