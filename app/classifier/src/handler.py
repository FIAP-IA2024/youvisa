"""
Lambda handler for document classification using AWS Bedrock Claude Vision.
Triggered by S3 events via SQS.
"""

import os
import json
import logging
from bedrock import BedrockClassifier
from mongodb import MongoDBClient

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
MONGODB_URI = os.environ.get('MONGODB_URI')
MONGODB_DATABASE = os.environ.get('MONGODB_DATABASE', 'youvisa')
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')


def handler(event, context):
    """
    Lambda handler that processes S3 events from SQS.
    Classifies documents using Bedrock Claude Vision.

    Event structure (SQS with S3 notifications):
    {
        "Records": [
            {
                "body": "{\"Records\": [{\"s3\": {...}}]}"
            }
        ]
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Initialize clients
    classifier = BedrockClassifier(region=AWS_REGION)
    mongo_client = MongoDBClient(MONGODB_URI, MONGODB_DATABASE)

    processed = 0
    failed = 0

    for sqs_record in event.get('Records', []):
        try:
            # Parse SQS message body (contains S3 event)
            sqs_body = json.loads(sqs_record['body'])

            for s3_record in sqs_body.get('Records', []):
                s3_info = s3_record.get('s3', {})
                bucket = s3_info.get('bucket', {}).get('name')
                key = s3_info.get('object', {}).get('key')

                if not bucket or not key:
                    logger.warning(f"Missing bucket or key in S3 record")
                    continue

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

                processed += 1

        except Exception as e:
            logger.error(f"Error processing record: {str(e)}")
            failed += 1

    mongo_client.close()

    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': processed,
            'failed': failed
        })
    }
