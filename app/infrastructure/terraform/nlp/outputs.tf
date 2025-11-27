output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.nlp.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.nlp.arn
}

output "lambda_function_url" {
  description = "URL of the Lambda function"
  value       = aws_lambda_function_url.nlp_url.function_url
}
