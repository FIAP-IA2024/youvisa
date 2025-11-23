# S3 Event Notification to SQS
resource "aws_s3_bucket_notification" "file_upload_notification" {
  bucket = data.aws_s3_bucket.files.id

  queue {
    queue_arn     = aws_sqs_queue.ocr_queue.arn
    events        = ["s3:ObjectCreated:*"]
    filter_prefix = "telegram/"
  }

  depends_on = [aws_sqs_queue_policy.ocr_queue_policy]
}
