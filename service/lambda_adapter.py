"""
AWS Lambda adapter for Flask QR Code Creator application.
This module adapts the Flask app to work with AWS Lambda using aws-wsgi.
Handles both API Gateway and Lambda Function URL event formats.
"""
from app import app
import awsgi

def lambda_handler(event, context):
    """
    AWS Lambda handler function that adapts Flask app using aws-wsgi.
    Handles both API Gateway and Lambda Function URL event formats.
    """
    if 'version' in event and event.get('version') == '2.0' and 'httpMethod' not in event:
        converted_event = {
            'httpMethod': event['requestContext']['http']['method'],
            'path': event.get('rawPath', '/'),
            'queryStringParameters': None,
            'headers': event.get('headers', {}),
            'body': event.get('body'),
            'isBase64Encoded': event.get('isBase64Encoded', False),
            'requestContext': event.get('requestContext', {}),
            'multiValueQueryStringParameters': None,
            'pathParameters': None,
            'stageVariables': None
        }
        
        if event.get('rawQueryString'):
            params = {}
            for param in event['rawQueryString'].split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    params[key] = value
                else:
                    params[param] = ''
            converted_event['queryStringParameters'] = params
        
        event = converted_event
    
    return awsgi.response(app, event, context, base64_content_types={"image/png", "image/jpeg"})
