"""
Bedrock Claude Vision integration for document classification.
"""

import base64
import json
import logging
import boto3
from botocore.config import Config

logger = logging.getLogger()

# Classification prompt
CLASSIFICATION_PROMPT = """Voce e um classificador de documentos da plataforma YOUVISA.
Analise a imagem fornecida e identifique qual documento ela representa.
Responda com apenas uma das seguintes categorias:
- Passaporte
- RG
- Comprovante
- Formulario
- Documento invalido

Responda apenas o nome da categoria. Nada mais."""

# Valid document types
VALID_TYPES = ['Passaporte', 'RG', 'Comprovante', 'Formulario', 'Documento invalido']


class BedrockClassifier:
    """Classifies documents using AWS Bedrock Claude Vision."""

    def __init__(self, region: str = 'us-east-1'):
        """
        Initialize the classifier.

        Args:
            region: AWS region for Bedrock (default us-east-1 where Claude is available)
        """
        config = Config(
            region_name=region,
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
        self.bedrock = boto3.client('bedrock-runtime', config=config)
        self.s3 = boto3.client('s3')
        self.model_id = 'anthropic.claude-3-haiku-20240307-v1:0'

    def classify(self, bucket: str, key: str) -> dict:
        """
        Classify a document from S3.

        Args:
            bucket: S3 bucket name
            key: S3 object key

        Returns:
            dict with document_type and confidence
        """
        # Get image from S3
        image_data = self._get_image_from_s3(bucket, key)

        if not image_data:
            return {
                'document_type': 'Documento invalido',
                'confidence': 0.0,
                'error': 'Could not retrieve image from S3'
            }

        # Determine media type from key
        media_type = self._get_media_type(key)

        # Call Bedrock
        response = self._invoke_bedrock(image_data, media_type)

        return response

    def _get_image_from_s3(self, bucket: str, key: str) -> bytes:
        """Get image bytes from S3."""
        try:
            response = self.s3.get_object(Bucket=bucket, Key=key)
            return response['Body'].read()
        except Exception as e:
            logger.error(f"Error getting image from S3: {str(e)}")
            return None

    def _get_media_type(self, key: str) -> str:
        """Determine media type from file extension."""
        key_lower = key.lower()
        if key_lower.endswith('.png'):
            return 'image/png'
        elif key_lower.endswith('.gif'):
            return 'image/gif'
        elif key_lower.endswith('.webp'):
            return 'image/webp'
        else:
            return 'image/jpeg'

    def _invoke_bedrock(self, image_data: bytes, media_type: str) -> dict:
        """
        Invoke Bedrock Claude Vision for classification.

        Args:
            image_data: Raw image bytes
            media_type: MIME type of the image

        Returns:
            dict with classification result
        """
        try:
            # Encode image to base64
            image_base64 = base64.b64encode(image_data).decode('utf-8')

            # Build request body for Claude
            body = {
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 50,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'image',
                                'source': {
                                    'type': 'base64',
                                    'media_type': media_type,
                                    'data': image_base64
                                }
                            },
                            {
                                'type': 'text',
                                'text': CLASSIFICATION_PROMPT
                            }
                        ]
                    }
                ]
            }

            # Invoke Bedrock
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body)
            )

            # Parse response
            response_body = json.loads(response['body'].read())
            content = response_body.get('content', [])

            if content and len(content) > 0:
                raw_type = content[0].get('text', '').strip()

                # Normalize the response
                document_type = self._normalize_type(raw_type)

                return {
                    'document_type': document_type,
                    'confidence': 1.0,
                    'raw_response': raw_type
                }

            return {
                'document_type': 'Documento invalido',
                'confidence': 0.0,
                'error': 'Empty response from Bedrock'
            }

        except Exception as e:
            logger.error(f"Error invoking Bedrock: {str(e)}")
            return {
                'document_type': 'Documento invalido',
                'confidence': 0.0,
                'error': str(e)
            }

    def _normalize_type(self, raw_type: str) -> str:
        """Normalize the classification response to a valid type."""
        raw_lower = raw_type.lower()

        for valid_type in VALID_TYPES:
            if valid_type.lower() in raw_lower:
                return valid_type

        return 'Documento invalido'
