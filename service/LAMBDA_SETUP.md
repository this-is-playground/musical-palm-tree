# AWS Lambda Deployment Setup

This Flask QR Code Creator can be deployed to AWS Lambda with Function URL for serverless operation.

## Files Required for Lambda Deployment

1. **`app.py`** - The main Flask application (no changes needed)
2. **`lambda_adapter.py`** - Lambda handler that adapts Flask for AWS Lambda using aws-wsgi
3. **`requirements.txt`** - Add `aws-wsgi>=0.2.7` to your existing Flask dependencies

## How It Works

The `lambda_adapter.py` file:
- Imports your Flask app unchanged
- Converts Lambda Function URL events to API Gateway format (aws-wsgi expects API Gateway format)
- Handles the WSGI interface between Lambda and Flask

## Key Technical Details

- **Zero Flask Changes**: Your Flask app stays exactly the same
- **Event Format Conversion**: Function URLs send different event structure than API Gateway
- **Dependency Packaging**: Must bundle Flask + aws-wsgi + dependencies in deployment package

## Deployment

Use infrastructure-as-code tools like Pulumi or Terraform to:
1. Create Lambda function with Python runtime
2. Package your Flask app + lambda_adapter.py + dependencies
3. Configure Function URL for direct HTTP access
4. Set handler to `lambda_adapter.lambda_handler`

The result: Your Flask app accessible via public HTTPS URL with serverless scaling!
