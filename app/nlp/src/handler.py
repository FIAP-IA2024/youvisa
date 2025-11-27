"""
Lambda handler for NLP conversation processing using AWS Bedrock Claude.
Called by n8n workflow for text messages.
"""

import os
import json
import logging
from bedrock import BedrockNLP
from mongodb import MongoDBClient
from prompts import TRANSFERRED_MESSAGE

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
MONGODB_URI = os.environ.get('MONGODB_URI')
MONGODB_DATABASE = os.environ.get('MONGODB_DATABASE', 'youvisa')
BEDROCK_REGION = os.environ.get('BEDROCK_REGION', 'us-east-1')
API_KEY = os.environ.get('API_KEY')


def _validate_api_key(event: dict) -> bool:
    """Validate API key from request headers."""
    headers = event.get('headers', {})
    # Lambda Function URL headers are lowercase
    api_key = headers.get('x-api-key') or headers.get('X-Api-Key')
    return api_key == API_KEY


def handler(event, context):
    """
    Lambda handler that processes text messages via HTTP.

    Expected request body:
    {
        "chat_id": "123456789",
        "text": "User message",
        "user_id": "mongo_user_id",
        "telegram_id": "telegram_user_id"
    }

    Response:
    {
        "response": "Bot response text",
        "intent": "greeting|provide_email|want_human|send_document|general"
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")

    # Validate API key
    if not _validate_api_key(event):
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Unauthorized: Invalid or missing API key'})
        }

    # Parse request body
    try:
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON body'})
        }

    chat_id = body.get('chat_id')
    text = body.get('text', '').strip()
    user_id = body.get('user_id')
    telegram_id = body.get('telegram_id')

    if not chat_id or not text:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing chat_id or text'})
        }

    # Initialize clients
    nlp = BedrockNLP(region=BEDROCK_REGION)
    mongo = MongoDBClient(MONGODB_URI, MONGODB_DATABASE)

    try:
        # Get conversation and user context
        conversation = mongo.get_conversation_by_chat_id(chat_id)
        user = None

        # Check if conversation is transferred to human agent - skip bot processing
        if conversation and conversation.get('status') == 'transferred':
            logger.info(f"Conversation {conversation['_id']} is transferred, skipping bot processing")
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'response': '',
                    'intent': 'transferred',
                    'skip_response': True
                })
            }

        if user_id:
            user = mongo.get_user(user_id)
        elif telegram_id:
            user = mongo.get_user_by_telegram_id(telegram_id)

        # Determine current state
        has_email = bool(user and user.get('email'))
        conversation_state = None
        if conversation:
            conversation_state = conversation.get('metadata', {}).get('state')

        # Get message history for context
        messages = []
        if conversation:
            messages = mongo.get_recent_messages(conversation['_id'], limit=10)

        logger.info(f"Processing message - chat_id: {chat_id}, has_email: {has_email}, state: {conversation_state}")

        # Process with Bedrock NLP
        result = nlp.process(
            text=text,
            conversation_state=conversation_state,
            has_email=has_email,
            history=messages
        )

        logger.info(f"NLP result: {result}")

        # Handle extracted email
        if result.get('extracted_email') and user_id:
            email = result['extracted_email']
            if _is_valid_email(email):
                mongo.update_user_email(user_id, email)
                logger.info(f"Saved email {email} for user {user_id}")

        # Handle want_human intent
        if result.get('intent') == 'want_human' and conversation:
            mongo.update_conversation_status(conversation['_id'], 'transferred')
            result['response'] = TRANSFERRED_MESSAGE
            logger.info(f"Conversation {conversation['_id']} transferred to human")

        # Update conversation state if needed
        if result.get('new_state') and conversation:
            mongo.update_conversation_state(conversation['_id'], result['new_state'])
            logger.info(f"Updated conversation state to {result['new_state']}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'response': result['response'],
                'intent': result.get('intent', 'general')
            })
        }

    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'response': 'Desculpe, ocorreu um erro. Tente novamente mais tarde.'
            })
        }

    finally:
        mongo.close()


def _is_valid_email(email: str) -> bool:
    """Basic email validation."""
    if not email or not isinstance(email, str):
        return False
    return '@' in email and '.' in email.split('@')[-1]
