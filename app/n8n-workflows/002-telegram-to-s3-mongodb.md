# Workflow: Telegram to S3 + MongoDB

Este workflow estende o `001-telegram-to-s3.json` para tambem salvar metadados no MongoDB via API REST.

## Fluxo Atualizado

```
Telegram Trigger
      |
      v
Check if File Exists
      |
      +---> [NO] Send Instructions
      |
      +---> [YES] Get File from Telegram
                        |
                        v
                  Prepare S3 Upload
                        |
                        v
                  Upload to S3
                        |
                        v
                  Save User (Upsert) ----+
                        |                |
                        v                |
            Save Conversation (Upsert)  |
                        |                |
                        v                |
                  Save Message           |
                        |                |
                        v                |
                  Save File Metadata     |
                        |                |
                        v                |
            Send Confirmation <----------+
```

## Nodes Adicionais

Apos o node "Upload to S3", adicione os seguintes nodes:

### 1. HTTP Request - Upsert User

**Settings:**
- Method: POST
- URL: `{{$env.LAMBDA_FUNCTION_URL}}/users/upsert/{{$node["Telegram Trigger"].json.message.from.id}}`
- Body Content Type: JSON
- Body:

```json
{
  "telegram_id": "{{$node['Telegram Trigger'].json.message.from.id}}",
  "username": "{{$node['Telegram Trigger'].json.message.from.username}}",
  "first_name": "{{$node['Telegram Trigger'].json.message.from.first_name}}",
  "last_name": "{{$node['Telegram Trigger'].json.message.from.last_name}}",
  "language_code": "{{$node['Telegram Trigger'].json.message.from.language_code}}"
}
```

### 2. HTTP Request - Upsert Conversation

**Settings:**
- Method: POST
- URL: `{{$env.LAMBDA_FUNCTION_URL}}/conversations/upsert`
- Body Content Type: JSON
- Body:

```json
{
  "user_id": "{{$node['HTTP Request - Upsert User'].json.data._id}}",
  "channel": "telegram",
  "chat_id": "{{$node['Telegram Trigger'].json.message.chat.id}}",
  "status": "active",
  "last_message_at": "{{$now.toISO()}}"
}
```

### 3. HTTP Request - Save Message

**Settings:**
- Method: POST
- URL: `{{$env.LAMBDA_FUNCTION_URL}}/messages`
- Body Content Type: JSON
- Body:

```json
{
  "conversation_id": "{{$node['HTTP Request - Upsert Conversation'].json.data._id}}",
  "message_id": "{{$node['Telegram Trigger'].json.message.message_id}}",
  "user_id": "{{$node['HTTP Request - Upsert User'].json.data._id}}",
  "text": "{{$node['Telegram Trigger'].json.message.caption || ''}}",
  "message_type": "{{$node['Telegram Trigger'].json.message.document ? 'document' : 'photo'}}",
  "direction": "incoming",
  "timestamp": "{{$node['Telegram Trigger'].json.message.date * 1000}}",
  "metadata": {{$node['Telegram Trigger'].json.message}}
}
```

### 4. HTTP Request - Save File Metadata

**Settings:**
- Method: POST
- URL: `{{$env.LAMBDA_FUNCTION_URL}}/files`
- Body Content Type: JSON
- Body:

```json
{
  "conversation_id": "{{$node['HTTP Request - Upsert Conversation'].json.data._id}}",
  "message_id": "{{$node['HTTP Request - Save Message'].json.data._id}}",
  "file_id": "{{$node['Prepare S3 Upload'].json.fileId}}",
  "s3_bucket": "{{$env.S3_BUCKET_NAME}}",
  "s3_key": "{{$node['Prepare S3 Upload'].json.s3Key}}",
  "original_filename": "{{$node['Prepare S3 Upload'].json.fileName}}",
  "file_size": {{$node['Prepare S3 Upload'].json.fileSize}},
  "mime_type": "{{$node['Prepare S3 Upload'].json.mimeType}}",
  "uploaded_at": "{{$now.toISO()}}"
}
```

### 5. Send Confirmation (Updated)

**Settings:**
- Method: sendMessage
- Chat ID: `{{$node['Telegram Trigger'].json.message.chat.id}}`
- Text: `Arquivo "{{$node['Prepare S3 Upload'].json.fileName}}" recebido e armazenado com sucesso!`

## Variaveis de Ambiente Necessarias

Adicione as seguintes variaveis de ambiente no n8n:

1. `LAMBDA_FUNCTION_URL` - URL da Lambda Function (obtido do Terraform output)
2. `S3_BUCKET_NAME` - Nome do bucket S3

Para configurar no Docker Compose:

```yaml
services:
  n8n:
    environment:
      - LAMBDA_FUNCTION_URL=${LAMBDA_FUNCTION_URL}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
```

## Tratamento de Erros

Cada node HTTP Request deve ter:

- **Continue On Fail**: Enabled
- **Retry On Fail**: 3 retries
- **Wait Between Tries**: 1000ms

Se algum node falhar, o workflow continua, mas loga o erro.

## Testando

1. Certifique-se de que MongoDB esta rodando:
   ```bash
   docker-compose up -d mongodb
   ```

2. Inicie a API localmente ou via Lambda

3. Configure as variaveis de ambiente no `.env`

4. Envie um arquivo para o bot do Telegram

5. Verifique os dados no MongoDB:
   ```bash
   docker exec -it youvisa-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
   use youvisa
   db.users.find()
   db.conversations.find()
   db.messages.find()
   db.files.find()
   ```
