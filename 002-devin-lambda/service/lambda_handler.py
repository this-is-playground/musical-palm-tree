import awsgi
from app import app

def handler(event, context):
    if 'requestContext' in event and 'http' in event['requestContext']:
        converted_event = {
            'httpMethod': event['requestContext']['http']['method'],
            'path': event['requestContext']['http']['path'],
            'queryStringParameters': event.get('queryStringParameters'),
            'headers': event.get('headers', {}),
            'body': event.get('body'),
            'isBase64Encoded': event.get('isBase64Encoded', False),
            'requestContext': event['requestContext']
        }
        return awsgi.response(app, converted_event, context, base64_content_types={"image/png", "image/jpeg"})
    else:
        return awsgi.response(app, event, context, base64_content_types={"image/png", "image/jpeg"})