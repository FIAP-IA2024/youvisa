"""
Lambda handler for image validation using OpenCV.
Validates image quality before upload to S3.
"""

import os
import json
import base64
from validator import ImageValidator

# Environment variables
API_KEY = os.environ.get('API_KEY')


def _validate_api_key(event: dict) -> bool:
    """Validate API key from request headers."""
    headers = event.get('headers', {})
    # Lambda Function URL headers are lowercase
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    return api_key == API_KEY


def handler(event, context):
    """
    Lambda handler that validates image quality.

    Expected input (JSON body):
    {
        "image": "<base64_encoded_image>",
        "mime_type": "image/jpeg"  # optional
    }

    Returns:
    {
        "valid": true/false,
        "reason": "Validation message",
        "details": {
            "blur_score": float,
            "brightness": float,
            "width": int,
            "height": int
        }
    }
    """
    # Validate API key
    if not _validate_api_key(event):
        return response(401, {
            'valid': False,
            'reason': 'Unauthorized: Invalid or missing API key'
        })

    try:
        # Parse body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', event)

        image_base64 = body.get('image')

        if not image_base64:
            return response(400, {
                'valid': False,
                'reason': 'Missing image parameter'
            })

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            return response(400, {
                'valid': False,
                'reason': f'Invalid base64 encoding: {str(e)}'
            })

        # Validate image
        validator = ImageValidator()
        result = validator.validate(image_bytes)

        return response(200, result)

    except Exception as e:
        return response(500, {
            'valid': False,
            'reason': f'Internal error: {str(e)}'
        })


def response(status_code: int, body: dict) -> dict:
    """Create API Gateway response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body)
    }
