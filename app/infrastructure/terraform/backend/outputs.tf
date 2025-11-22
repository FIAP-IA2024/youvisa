output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.api.arn
}

output "lambda_function_url" {
  description = "Lambda Function URL"
  value       = aws_lambda_function_url.api_url.function_url
}

output "lambda_function_url_id" {
  description = "Lambda Function URL ID"
  value       = aws_lambda_function_url.api_url.url_id
}
