"""
MongoDB client for updating file classifications.
"""

import logging
from datetime import datetime
from pymongo import MongoClient

logger = logging.getLogger()


class MongoDBClient:
    """MongoDB client for file classification updates."""

    def __init__(self, uri: str, database: str):
        """
        Initialize MongoDB client.

        Args:
            uri: MongoDB connection URI
            database: Database name
        """
        self.client = MongoClient(uri)
        self.db = self.client[database]
        self.files_collection = self.db['files']

    def update_file_classification(
        self,
        s3_key: str,
        document_type: str,
        confidence: float = 1.0
    ) -> bool:
        """
        Update file record with classification result.

        Args:
            s3_key: S3 object key
            document_type: Classified document type
            confidence: Classification confidence score

        Returns:
            True if update was successful
        """
        try:
            result = self.files_collection.update_one(
                {'s3_key': s3_key},
                {
                    '$set': {
                        'document_type': document_type,
                        'classification_confidence': confidence,
                        'classified_at': datetime.utcnow(),
                        'classification_status': 'completed'
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Updated file {s3_key} with type: {document_type}")
                return True
            else:
                logger.warning(f"No file found with s3_key: {s3_key}")
                return False

        except Exception as e:
            logger.error(f"Error updating file classification: {str(e)}")
            return False

    def get_conversation_by_s3_key(self, s3_key: str) -> dict:
        """
        Get conversation info (including chat_id) from a file's s3_key.

        Args:
            s3_key: S3 object key

        Returns:
            Conversation document with chat_id, or None if not found
        """
        try:
            # Find file by s3_key
            file = self.files_collection.find_one({'s3_key': s3_key})
            if not file:
                logger.warning(f"File not found with s3_key: {s3_key}")
                return None

            # Find conversation by conversation_id
            conversation = self.db['conversations'].find_one({
                '_id': file['conversation_id']
            })
            if not conversation:
                logger.warning(f"Conversation not found for file: {s3_key}")
                return None

            return conversation

        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            return None

    def save_bot_message(
        self,
        conversation_id,
        text: str,
        metadata: dict = None
    ) -> bool:
        """
        Save a bot message to the messages collection.

        Args:
            conversation_id: Conversation ObjectId
            text: Message text
            metadata: Optional metadata dict

        Returns:
            True if insert was successful
        """
        try:
            message_doc = {
                'conversation_id': conversation_id,
                'message_id': f'bot_classifier_{datetime.utcnow().timestamp()}',
                'text': text,
                'message_type': 'text',
                'direction': 'outgoing',
                'timestamp': datetime.utcnow(),
                'metadata': metadata or {}
            }
            self.db['messages'].insert_one(message_doc)
            logger.info(f"Saved bot message for conversation {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"Error saving bot message: {str(e)}")
            return False

    def close(self):
        """Close the MongoDB connection."""
        self.client.close()
