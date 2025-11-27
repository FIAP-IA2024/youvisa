# SQS Queue for classifier
resource "aws_sqs_queue" "classifier_queue" {
  name                       = "${local.function_name}-queue"
  visibility_timeout_seconds = 120
  message_retention_seconds  = 1209600 # 14 days
  receive_wait_time_seconds  = 10
}

# Dead Letter Queue
resource "aws_sqs_queue" "classifier_dlq" {
  name                      = "${local.function_name}-dlq"
  message_retention_seconds = 1209600 # 14 days
}

# Redrive policy for DLQ
resource "aws_sqs_queue_redrive_policy" "classifier_redrive" {
  queue_url = aws_sqs_queue.classifier_queue.id
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.classifier_dlq.arn
    maxReceiveCount     = 3
  })
}

# SQS Policy to allow S3 to send messages
resource "aws_sqs_queue_policy" "s3_to_sqs" {
  queue_url = aws_sqs_queue.classifier_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.classifier_queue.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:s3:::${var.s3_bucket_name}"
          }
        }
      }
    ]
  })
}
