# SQS Queue for OCR Document Processing
resource "aws_sqs_queue" "ocr_queue" {
  name                       = "${var.environment}-${var.project_name}-queue"
  visibility_timeout_seconds = 360     # 6 minutes (Lambda timeout * 6)
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 20      # Long polling

  # Dead Letter Queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ocr_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.environment}-${var.project_name}-queue"
  }
}

# Dead Letter Queue
resource "aws_sqs_queue" "ocr_dlq" {
  name                      = "${var.environment}-${var.project_name}-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.environment}-${var.project_name}-dlq"
  }
}

# SQS Queue Policy to allow S3 to send messages
resource "aws_sqs_queue_policy" "ocr_queue_policy" {
  queue_url = aws_sqs_queue.ocr_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.ocr_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = data.aws_s3_bucket.files.arn
          }
        }
      }
    ]
  })
}
