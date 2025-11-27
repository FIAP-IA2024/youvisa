"""
MongoDB client for NLP conversation processing.
"""

import logging
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient

logger = logging.getLogger()


class MongoDBClient:
    """MongoDB client for NLP operations."""

    def __init__(self, uri: str, database: str):
        """
        Initialize MongoDB client.

        Args:
            uri: MongoDB connection URI
            database: Database name
        """
        self.client = MongoClient(uri)
        self.db = self.client[database]
        self.users = self.db['users']
        self.conversations = self.db['conversations']
        self.messages = self.db['messages']

    def get_conversation_by_chat_id(self, chat_id: str) -> dict:
        """
        Get conversation by Telegram chat_id.

        Args:
            chat_id: Telegram chat ID

        Returns:
            Conversation document or None
        """
        try:
            return self.conversations.find_one({'chat_id': str(chat_id)})
        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}")
            return None

    def get_user(self, user_id: str) -> dict:
        """
        Get user by ID.

        Args:
            user_id: User ID (string or ObjectId)

        Returns:
            User document or None
        """
        try:
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)
            return self.users.find_one({'_id': user_id})
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            return None

    def get_user_by_telegram_id(self, telegram_id: str) -> dict:
        """
        Get user by Telegram ID.

        Args:
            telegram_id: Telegram user ID

        Returns:
            User document or None
        """
        try:
            return self.users.find_one({'telegram_id': str(telegram_id)})
        except Exception as e:
            logger.error(f"Error getting user by telegram_id: {str(e)}")
            return None

    def get_recent_messages(self, conversation_id, limit: int = 10) -> list:
        """
        Get recent messages from a conversation.

        Args:
            conversation_id: Conversation ID
            limit: Maximum number of messages to return

        Returns:
            List of message documents
        """
        try:
            if isinstance(conversation_id, str):
                conversation_id = ObjectId(conversation_id)

            messages = self.messages.find(
                {'conversation_id': conversation_id}
            ).sort('timestamp', -1).limit(limit)

            return list(messages)[::-1]  # Reverse to get chronological order
        except Exception as e:
            logger.error(f"Error getting messages: {str(e)}")
            return []

    def update_user_email(self, user_id: str, email: str) -> bool:
        """
        Update user's email.

        Args:
            user_id: User ID
            email: Email address

        Returns:
            True if update was successful
        """
        try:
            if isinstance(user_id, str):
                user_id = ObjectId(user_id)

            result = self.users.update_one(
                {'_id': user_id},
                {
                    '$set': {
                        'email': email,
                        'email_updated_at': datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Updated email for user {user_id}")
                return True
            else:
                logger.warning(f"No user found with id: {user_id}")
                return False

        except Exception as e:
            logger.error(f"Error updating user email: {str(e)}")
            return False

    def update_conversation_status(self, conversation_id, status: str) -> bool:
        """
        Update conversation status.

        Args:
            conversation_id: Conversation ID
            status: New status ('active', 'transferred', 'resolved', 'closed')

        Returns:
            True if update was successful
        """
        try:
            if isinstance(conversation_id, str):
                conversation_id = ObjectId(conversation_id)

            result = self.conversations.update_one(
                {'_id': conversation_id},
                {
                    '$set': {
                        'status': status,
                        'status_updated_at': datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Updated conversation {conversation_id} status to {status}")
                return True
            else:
                logger.warning(f"No conversation found with id: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"Error updating conversation status: {str(e)}")
            return False

    def update_conversation_state(self, conversation_id, state: str) -> bool:
        """
        Update conversation state in metadata.

        Args:
            conversation_id: Conversation ID
            state: New state ('NOVO', 'AGUARDANDO_EMAIL', 'PRONTO')

        Returns:
            True if update was successful
        """
        try:
            if isinstance(conversation_id, str):
                conversation_id = ObjectId(conversation_id)

            result = self.conversations.update_one(
                {'_id': conversation_id},
                {
                    '$set': {
                        'metadata.state': state,
                        'metadata.state_updated_at': datetime.utcnow()
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Updated conversation {conversation_id} state to {state}")
                return True
            else:
                logger.warning(f"No conversation found with id: {conversation_id}")
                return False

        except Exception as e:
            logger.error(f"Error updating conversation state: {str(e)}")
            return False

    def close(self):
        """Close the MongoDB connection."""
        self.client.close()
