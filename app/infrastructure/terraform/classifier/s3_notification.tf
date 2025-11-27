# Get the S3 bucket
data "aws_s3_bucket" "files_bucket" {
  bucket = var.s3_bucket_name
}

# S3 Event Notification to SQS
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = data.aws_s3_bucket.files_bucket.id

  queue {
    queue_arn = aws_sqs_queue.classifier_queue.arn
    events    = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_sqs_queue_policy.s3_to_sqs]
}
