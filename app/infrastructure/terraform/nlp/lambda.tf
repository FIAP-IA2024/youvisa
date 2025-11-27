# Lambda Function
resource "aws_lambda_function" "nlp" {
  filename         = "${path.module}/../../../nlp/lambda.zip"
  function_name    = local.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../../../nlp/lambda.zip")
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      NODE_ENV         = var.environment
      MONGODB_URI      = var.mongodb_uri
      MONGODB_DATABASE = var.mongodb_database
      BEDROCK_REGION   = var.bedrock_region
      API_KEY          = var.api_key
    }
  }
}

# Lambda Function URL (for direct HTTP access from n8n)
resource "aws_lambda_function_url" "nlp_url" {
  function_name      = aws_lambda_function.nlp.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["POST"]
    allow_headers = ["*"]
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
