output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.validation.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.validation.arn
}

output "lambda_function_url" {
  description = "URL of the Lambda function"
  value       = aws_lambda_function_url.validation_url.function_url
}
