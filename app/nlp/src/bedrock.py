"""
Bedrock Claude integration for NLP conversation processing.
"""

import json
import logging
import boto3
from botocore.config import Config
from prompts import SYSTEM_PROMPT

logger = logging.getLogger()


class BedrockNLP:
    """Processes text messages using AWS Bedrock Claude."""

    def __init__(self, region: str = 'us-east-1'):
        """
        Initialize the NLP processor.

        Args:
            region: AWS region for Bedrock (default us-east-1 where Claude is available)
        """
        config = Config(
            region_name=region,
            retries={'max_attempts': 3, 'mode': 'standard'}
        )
        self.bedrock = boto3.client('bedrock-runtime', config=config)
        self.model_id = 'anthropic.claude-3-haiku-20240307-v1:0'

    def process(
        self,
        text: str,
        conversation_state: str = None,
        has_email: bool = False,
        history: list = None
    ) -> dict:
        """
        Process a text message and generate a response.

        Args:
            text: User's message text
            conversation_state: Current conversation state (NOVO, AGUARDANDO_EMAIL, PRONTO)
            has_email: Whether user has email registered
            history: Recent message history

        Returns:
            dict with response, intent, extracted_email, new_state
        """
        # Determine state
        state = conversation_state or ('PRONTO' if has_email else 'NOVO')

        # Format history for context
        history_text = self._format_history(history) if history else "Nenhum historico"

        # Build prompt
        system_prompt = SYSTEM_PROMPT.format(
            state=state,
            has_email='Sim' if has_email else 'Nao',
            history=history_text
        )

        # Call Bedrock
        response = self._invoke_bedrock(system_prompt, text)

        return response

    def _format_history(self, history: list) -> str:
        """Format message history for context."""
        if not history:
            return "Nenhum historico"

        formatted = []
        for msg in history[-5:]:  # Last 5 messages
            direction = "Usuario" if msg.get('direction') == 'incoming' else "Bot"
            text = msg.get('text', '')[:100]  # Truncate long messages
            formatted.append(f"{direction}: {text}")

        return "\n".join(formatted)

    def _invoke_bedrock(self, system_prompt: str, user_message: str) -> dict:
        """
        Invoke Bedrock Claude for NLP processing.

        Args:
            system_prompt: System prompt with context
            user_message: User's message

        Returns:
            dict with parsed response
        """
        try:
            # Build request body for Claude
            body = {
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 500,
                'system': system_prompt,
                'messages': [
                    {
                        'role': 'user',
                        'content': user_message
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
                raw_text = content[0].get('text', '').strip()
                logger.info(f"Bedrock raw response: {raw_text}")

                # Parse JSON response
                return self._parse_response(raw_text)

            return self._default_response("Desculpe, nao consegui processar sua mensagem.")

        except Exception as e:
            logger.error(f"Error invoking Bedrock: {str(e)}")
            return self._default_response(
                "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente."
            )

    def _parse_response(self, raw_text: str) -> dict:
        """Parse the JSON response from Claude."""
        try:
            # Try to extract JSON from response
            # Sometimes Claude adds text before/after JSON
            start_idx = raw_text.find('{')
            end_idx = raw_text.rfind('}') + 1

            if start_idx != -1 and end_idx > start_idx:
                json_str = raw_text[start_idx:end_idx]
                result = json.loads(json_str)

                return {
                    'response': result.get('response', ''),
                    'intent': result.get('intent', 'general'),
                    'extracted_email': result.get('extracted_email'),
                    'new_state': result.get('new_state')
                }

            # If no JSON found, use raw text as response
            return self._default_response(raw_text)

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            # Use raw text if JSON parsing fails
            return self._default_response(raw_text)

    def _default_response(self, message: str) -> dict:
        """Create a default response structure."""
        return {
            'response': message,
            'intent': 'general',
            'extracted_email': None,
            'new_state': None
        }
