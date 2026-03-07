"""
Lambda handler for document classification using AWS Bedrock Claude Vision.
Triggered by S3 events via SQS.
"""

import os
import json
import logging
from bedrock import BedrockClassifier
from mongodb import MongoDBClient
from telegram import TelegramNotifier

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
MONGODB_URI = os.environ.get('MONGODB_URI')
MONGODB_DATABASE = os.environ.get('MONGODB_DATABASE', 'youvisa')
BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')


def _classify_file(classifier, mongo_client, bucket, key):
    """Classify a single file and update MongoDB + send notification."""
    logger.info(f"Processing file: s3://{bucket}/{key}")

    # Classify document
    result = classifier.classify(bucket, key)
    logger.info(f"Classification result: {result}")

    # Update MongoDB
    mongo_client.update_file_classification(
        s3_key=key,
        document_type=result['document_type'],
        confidence=result.get('confidence', 1.0)
    )

    # Send Telegram notification
    if TELEGRAM_BOT_TOKEN:
        conversation = mongo_client.get_conversation_by_s3_key(key)
        if conversation and conversation.get('channel') == 'telegram':
            chat_id = conversation.get('chat_id')
            if chat_id:
                notifier = TelegramNotifier(TELEGRAM_BOT_TOKEN)

                if result['document_type'] == 'Documento invalido':
                    message = (
                        "Nao conseguimos identificar o documento enviado.\n"
                        "Por favor, envie novamente seguindo estas dicas:\n\n"
                        "- Certifique-se de que o documento esta bem iluminado\n"
                        "- Capture o documento por inteiro\n"
                        "- Evite reflexos e sombras\n"
                        "- A imagem deve estar nitida (sem borroes)"
                    )
                else:
                    message = f"Seu documento foi classificado como: {result['document_type']}"

                notifier.send_message(chat_id, message)
                logger.info(f"Notification sent to chat {chat_id}")

                mongo_client.save_bot_message(
                    conversation_id=conversation.get('_id'),
                    text=message,
                    metadata={'document_type': result['document_type']}
                )

    return result


def handler(event, context):
    """
    Lambda handler for document classification.
    Supports two invocation modes:

    1. HTTP (Function URL): { "body": "{\"bucket\": \"...\", \"key\": \"...\"}" }
    2. SQS with S3 events: { "Records": [{ "body": "{\"Records\": [{\"s3\": {...}}]}" }] }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    classifier = BedrockClassifier(region=BEDROCK_REGION)
    mongo_client = MongoDBClient(MONGODB_URI, MONGODB_DATABASE)

    processed = 0
    failed = 0

    try:
        # Mode 1: HTTP invocation (Function URL / direct call)
        if 'body' in event and 'Records' not in event:
            body = event.get('body', '{}')
            if isinstance(body, str):
                body = json.loads(body)
            bucket = body.get('bucket')
            key = body.get('key')
            if bucket and key:
                result = _classify_file(classifier, mongo_client, bucket, key)
                mongo_client.close()
                return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'document_type': result['document_type'],
                        'confidence': result.get('confidence', 1.0),
                        'processed': 1
                    })
                }
            else:
                mongo_client.close()
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': 'Missing bucket or key'})
                }

        # Mode 2: SQS with S3 events
        for sqs_record in event.get('Records', []):
            try:
                sqs_body = json.loads(sqs_record['body'])
                for s3_record in sqs_body.get('Records', []):
                    s3_info = s3_record.get('s3', {})
                    bucket = s3_info.get('bucket', {}).get('name')
                    key = s3_info.get('object', {}).get('key')
                    if not bucket or not key:
                        logger.warning("Missing bucket or key in S3 record")
                        continue
                    _classify_file(classifier, mongo_client, bucket, key)
                    processed += 1
            except Exception as e:
                logger.error(f"Error processing record: {str(e)}")
                failed += 1

    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        failed += 1

    mongo_client.close()

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed,
            'failed': failed
        })
    }
