"""
Telegram notification module.
Sends messages to Telegram chats using the Bot API.
"""

import urllib.request
import urllib.parse
import json
import logging

logger = logging.getLogger()


class TelegramNotifier:
    """Sends notifications to Telegram chats."""

    def __init__(self, bot_token: str):
        """
        Initialize the Telegram notifier.

        Args:
            bot_token: Telegram Bot API token
        """
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}"

    def send_message(self, chat_id: str, text: str) -> bool:
        """
        Send a message to a Telegram chat.

        Args:
            chat_id: The chat ID to send the message to
            text: The message text (supports HTML formatting)

        Returns:
            True if message was sent successfully, False otherwise
        """
        url = f"{self.base_url}/sendMessage"
        data = urllib.parse.urlencode({
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'HTML'
        }).encode()

        try:
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode())
                if result.get('ok'):
                    logger.info(f"Telegram message sent to chat {chat_id}")
                    return True
                else:
                    logger.error(f"Telegram API error: {result}")
                    return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
