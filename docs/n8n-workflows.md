# n8n Workflows Documentation

This document describes all n8n workflows used in the YOUVISA platform, their purpose, configuration, and how they integrate with other components of the system.

## Overview

n8n acts as the central orchestration hub for the YOUVISA omnichannel customer service platform. It connects all communication channels (Telegram, WhatsApp, Webchat) with backend services (AI Agent, OCR, MongoDB, S3) through automated workflows.

## Workflow 001: Telegram to S3

**File**: `n8n-workflows/001-telegram-to-s3.json`

**Purpose**: Receive files sent via Telegram and automatically store them in AWS S3 with organized folder structure.

**Status**: MVP - Initial implementation

**Trigger**: Telegram webhook (real-time message reception)

### Workflow Architecture

```plaintext
Telegram Bot
    |
    v
[Telegram Trigger] --> [Check if File Exists]
                            |
                            |-- YES --> [Get File from Telegram]
                            |               |
                            |               v
                            |           [Prepare S3 Upload]
                            |               |
                            |               v
                            |           [Upload to S3]
                            |               |
                            |               v
                            |           [Send Confirmation]
                            |
                            |-- NO --> [Send Instructions]
```

### Node Descriptions

#### 1. Telegram Trigger

- **Type**: `n8n-nodes-base.telegramTrigger`
- **Function**: Listens for all messages sent to the Telegram bot
- **Configuration**:
  - Updates: `message` (receives all message types)
  - Credentials: Telegram Bot API token from `.env`
- **Output**: Raw message data from Telegram API

#### 2. Check if File Exists

- **Type**: `n8n-nodes-base.if`
- **Function**: Routes the flow based on whether the message contains a file
- **Condition**: Checks if `$json.message.document` exists
- **Branches**:
  - **True**: Message contains a file, proceed to download
  - **False**: Message is text-only, send instructions

#### 3. Send Instructions (No File)

- **Type**: `n8n-nodes-base.telegram`
- **Function**: Instructs user to send a file when only text is received
- **Configuration**:
  - Chat ID: `$json.message.chat.id`
  - Text: "Please send a file (document, image, PDF, etc.) so I can process it."

#### 4. Get File from Telegram

- **Type**: `n8n-nodes-base.telegram`
- **Function**: Downloads the file from Telegram servers
- **Configuration**:
  - Operation: `get`
  - File ID: `$json.message.document.file_id`
  - Download: `true`
- **Output**: Binary file data + file metadata

#### 5. Prepare S3 Upload

- **Type**: `n8n-nodes-base.code`
- **Function**: Prepares file path structure and metadata for S3
- **Logic**:

  ```javascript
  // Extract file data and metadata
  const fileData = items[0].binary.data;
  const document = items[0].json.message.document;
  const now = new Date();

  // Create date-based folder structure
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const timestamp = now.getTime();

  // Generate unique file name
  const fileName = `${document.file_id}_${timestamp}_${document.file_name}`;
  const s3Key = `telegram/${year}/${month}/${day}/${fileName}`;

  // Return structured data for S3 upload
  return [{
    json: {
      s3Key: s3Key,
      fileName: document.file_name,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      chatId: items[0].json.message.chat.id
    },
    binary: {
      data: fileData
    }
  }];
  ```

- **Output**:
  - `s3Key`: Full S3 path (e.g., `telegram/2025/11/18/12345_1731888000_passport.pdf`)
  - `fileName`: Original filename
  - `fileSize`: File size in bytes
  - `mimeType`: File MIME type
  - `chatId`: Telegram chat ID for response

#### 6. Upload to S3

- **Type**: `n8n-nodes-base.awsS3`
- **Function**: Uploads file to AWS S3 bucket
- **Configuration**:
  - Operation: `upload`
  - Bucket Name: `$env.S3_BUCKET_NAME` (from environment variable)
  - File Name: `$json.s3Key`
  - Binary Data: `true`
  - Binary Property: `data`
  - Content Type: `$json.mimeType`
- **Credentials**: AWS Access Key ID + Secret Access Key from `.env`
- **Result**: File stored in S3 with structure `s3://bucket/telegram/YYYY/MM/DD/filename`

#### 7. Send Confirmation

- **Type**: `n8n-nodes-base.telegram`
- **Function**: Sends success message to user
- **Configuration**:
  - Chat ID: `$json.chatId`
  - Text: `File "$json.fileName" received and stored successfully!`

### S3 Folder Structure

Files are organized in S3 with the following structure:

```
s3://youvisa-files-dev/
└── telegram/
    └── 2025/
        └── 11/
            └── 18/
                ├── 12345_1731888000_passport.pdf
                ├── 12346_1731888123_visa_form.jpg
                └── 12347_1731888456_ticket.pdf
```

**Naming Convention**: `{file_id}_{timestamp}_{original_filename}`

- `file_id`: Telegram's unique file identifier
- `timestamp`: Unix timestamp (milliseconds) when file was processed
- `original_filename`: Original name sent by user

This ensures:

- No file name conflicts (unique file_id + timestamp)
- Easy traceability back to Telegram
- Chronological organization by date
- Preservation of original filename for user reference

### Error Handling

The workflow includes automatic error handling:

1. **Invalid Telegram Token**:
   - Workflow won't activate
   - Error visible in n8n UI
   - Check credentials in n8n settings

2. **AWS Credentials Invalid**:
   - Upload fails with error
   - n8n retries automatically 3 times with exponential backoff
   - Check AWS credentials in n8n settings and `.env`

3. **Network Timeout**:
   - n8n automatically reprocesses message after 30s
   - Telegram guarantees message delivery

4. **File Too Large** (>20MB):
   - Telegram Bot API limit
   - File is accepted but logged as warning
   - Consider implementing file size check in future

### Environment Variables Required

This workflow requires the following environment variables in `.env`:

```bash
# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1
S3_BUCKET_NAME=youvisa-files-dev
```

### Credentials Configuration in n8n

After importing the workflow, you need to configure two sets of credentials:

#### 1. Telegram Bot API

- **Name**: Telegram Bot API
- **Type**: `telegramApi`
- **Fields**:
  - Access Token: Value from `TELEGRAM_BOT_TOKEN`

#### 2. AWS Credentials

- **Name**: AWS Credentials
- **Type**: `aws`
- **Fields**:
  - Access Key ID: Value from `AWS_ACCESS_KEY_ID`
  - Secret Access Key: Value from `AWS_SECRET_ACCESS_KEY`
  - Region: `sa-east-1`

### How to Import and Activate

1. **Start n8n**:

   ```bash
   docker-compose up -d
   ```

2. **Access n8n**:
   Open <http://localhost:5678> and login with credentials from `.env`

3. **Import Workflow**:
   - Click "Workflows" > "Import from File"
   - Select `n8n-workflows/001-telegram-to-s3.json`
   - Click "Import"

4. **Configure Credentials**:
   - Click on each node with a warning icon
   - Select "Create New Credential"
   - Fill in values from `.env`
   - Save credentials

5. **Activate Workflow**:
   - Click the toggle switch in top-right corner
   - Status should change to "Active"

6. **Test**:
   - Send a file to your Telegram bot
   - Check n8n execution log for success
   - Verify file in S3 bucket

### Monitoring and Debugging

#### View Execution History

- Click "Executions" in n8n sidebar
- See all workflow runs with status (success/error)
- Click any execution to see detailed logs

#### Common Issues

**Workflow not triggering**:

- Check if workflow is active (toggle in top-right)
- Verify Telegram token is correct
- Ensure webhook is registered (n8n does this automatically)

**File not appearing in S3**:

- Check AWS credentials are correct
- Verify S3 bucket name matches `.env`
- Check IAM permissions include `s3:PutObject`
- Review n8n execution logs for errors

**Telegram bot not responding**:

- Ensure bot was created via @BotFather
- Check token format (should be `123456:ABC...`)
- Verify bot is not blocked by user

### Performance Metrics

**Expected Performance** (as per requirements):

- Files up to 20MB: Process in <10 seconds
- Throughput: Up to 100 files per hour (sufficient for MVP)

**Monitoring**:

- Average execution time: visible in n8n Executions panel
- Success rate: count successful vs failed executions
- S3 storage: monitor via AWS CloudWatch

### Security Considerations

1. **Credentials**: Never commit `.env` or expose tokens
2. **S3 Bucket**: Private access only (no public URLs)
3. **IAM Permissions**: Minimal permissions (PutObject, GetObject, ListBucket only)
4. **n8n Authentication**: Basic auth enabled (username + password)
5. **LGPD Compliance**: All data stored in `sa-east-1` (Sao Paulo, Brazil)

### Future Enhancements

This is the MVP version. Planned improvements include:

1. **Save metadata to MongoDB**: Store message metadata, user info, timestamps
2. **OCR Processing**: Trigger AWS Textract when document is uploaded
3. **File Type Validation**: Accept only specific file types (PDF, JPG, PNG)
4. **File Size Check**: Reject files over certain size before upload
5. **User Authentication**: Verify user identity before accepting files
6. **Rate Limiting**: Prevent abuse (max files per user per hour)
7. **Webhook with HTTPS**: Use ngrok or public domain for production
8. **Multiple File Types**: Handle photos, videos, voice messages differently

### Related Documentation

- [Terraform S3 Infrastructure](../infrastructure/terraform/s3/README.md)
- [Main Project README](../README.md)
- [Task Specification](.tasks/001-n8n-telegram-s3-integration.md)

### References

- [n8n Telegram Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/)
- [n8n AWS S3 Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awss3/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [AWS S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html)
