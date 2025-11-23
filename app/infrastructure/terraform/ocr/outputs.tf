output "lambda_function_arn" {
  description = "ARN of the OCR Lambda function"
  value       = aws_lambda_function.ocr_processor.arn
}

output "lambda_function_name" {
  description = "Name of the OCR Lambda function"
  value       = aws_lambda_function.ocr_processor.function_name
}

output "sqs_queue_url" {
  description = "URL of the SQS queue"
  value       = aws_sqs_queue.ocr_queue.url
}

output "sqs_queue_arn" {
  description = "ARN of the SQS queue"
  value       = aws_sqs_queue.ocr_queue.arn
}

output "dlq_url" {
  description = "URL of the Dead Letter Queue"
  value       = aws_sqs_queue.ocr_dlq.url
}
