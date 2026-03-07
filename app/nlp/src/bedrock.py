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
        history: list = None,
        processes: list = None
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
        # Determine state - if user has email, always use PRONTO
        if has_email:
            state = 'PRONTO'
        else:
            state = conversation_state or 'NOVO'

        logger.info(f"Bedrock state computation - has_email: {has_email}, conversation_state: {conversation_state}, final_state: {state}")

        # Format history for context
        history_text = self._format_history(history) if history else "Nenhum historico"

        # Format processes for context
        processes_text = self._format_processes(processes) if processes else "Nenhum processo encontrado"

        # Build prompt
        system_prompt = SYSTEM_PROMPT.format(
            state=state,
            has_email='Sim' if has_email else 'Nao',
            history=history_text,
            processes=processes_text
        )

        # Call Bedrock
        response = self._invoke_bedrock(system_prompt, text)

        return response

    def _format_processes(self, processes: list) -> str:
        """Format process data for context."""
        if not processes:
            return "Nenhum processo encontrado"

        final_states = ('aprovado', 'rejeitado', 'finalizado', 'cancelado')

        # Show only active processes; if none, show the most recent one
        active = [p for p in processes if p.get('status', '') not in final_states]
        if active:
            processes = active
        else:
            processes = [processes[0]]

        visa_labels = {
            'turismo': 'Turismo', 'trabalho': 'Trabalho',
            'estudante': 'Estudante', 'residencia': 'Residência',
            'transito': 'Trânsito', 'a_definir': None
        }
        status_labels = {
            'recebido': 'Recebido', 'em_analise': 'Em Análise',
            'pendente_documentos': 'Pendente de Documentos',
            'aprovado': 'Aprovado', 'rejeitado': 'Rejeitado',
            'finalizado': 'Finalizado', 'cancelado': 'Cancelado'
        }

        formatted = []
        for i, p in enumerate(processes, 1):
            visa_raw = p.get('visa_type', 'a_definir')
            country_raw = p.get('destination_country', '')
            status_raw = p.get('status', 'N/A')
            created_raw = p.get('created_at', '')
            docs_count = len(p.get('documents', []))

            # Friendly labels
            visa = visa_labels.get(visa_raw, visa_raw)
            status = status_labels.get(status_raw, status_raw)

            # Format date as DD/MM/YYYY
            created = ''
            if created_raw:
                date_str = str(created_raw)[:10]
                if len(date_str) == 10 and '-' in date_str:
                    parts = date_str.split('-')
                    created = f"{parts[2]}/{parts[1]}/{parts[0]}"
                else:
                    created = date_str

            # Determine if process is active or closed
            final_states = ('aprovado', 'rejeitado', 'finalizado', 'cancelado')
            situacao = 'ENCERRADO' if status_raw in final_states else 'EM ANDAMENTO'

            # Build description, omitting "a_definir" fields
            parts = [f"Processo {i} ({situacao}):"]
            if visa:
                parts.append(f"Tipo de visto: {visa}")
            if country_raw and country_raw.lower() not in ('a definir', 'a_definir', ''):
                parts.append(f"País destino: {country_raw}")
            parts.append(f"Status: {status}")
            if created:
                parts.append(f"Data de criação: {created}")
            parts.append(f"Documentos associados: {docs_count}")

            formatted.append(" | ".join(parts))

        return "\n".join(formatted)

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
            start_idx = raw_text.find('{')
            end_idx = raw_text.rfind('}') + 1

            if start_idx != -1 and end_idx > start_idx:
                json_str = raw_text[start_idx:end_idx]
                try:
                    result = json.loads(json_str)
                except json.JSONDecodeError:
                    # Try finding the outermost JSON object by brace matching
                    depth = 0
                    real_end = -1
                    for i in range(start_idx, len(raw_text)):
                        if raw_text[i] == '{':
                            depth += 1
                        elif raw_text[i] == '}':
                            depth -= 1
                            if depth == 0:
                                real_end = i + 1
                                break
                    if real_end > start_idx:
                        json_str = raw_text[start_idx:real_end]
                        try:
                            result = json.loads(json_str)
                        except json.JSONDecodeError:
                            logger.error(f"JSON parse failed even with brace matching")
                            return self._default_response(raw_text)
                    else:
                        return self._default_response(raw_text)

                # If result['response'] is itself a JSON string, unwrap it
                resp = result.get('response', '')
                if isinstance(resp, str) and resp.strip().startswith('{'):
                    try:
                        inner = json.loads(resp)
                        resp = inner.get('response', resp)
                    except (json.JSONDecodeError, AttributeError):
                        pass

                return {
                    'response': resp,
                    'intent': result.get('intent', 'general'),
                    'extracted_email': result.get('extracted_email'),
                    'new_state': result.get('new_state')
                }

            # If no JSON found, use raw text as response
            return self._default_response(raw_text)

        except Exception as e:
            logger.error(f"Error parsing response: {str(e)}")
            return self._default_response(raw_text)

    def _default_response(self, message: str) -> dict:
        """Create a default response structure."""
        return {
            'response': message,
            'intent': 'general',
            'extracted_email': None,
            'new_state': None
        }
