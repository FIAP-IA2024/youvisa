# Lambda Function
resource "aws_lambda_function" "classifier" {
  filename         = "${path.module}/../../../classifier/lambda.zip"
  function_name    = local.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../../../classifier/lambda.zip")
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 512

  environment {
    variables = {
      NODE_ENV         = var.environment
      MONGODB_URI      = var.mongodb_uri
      MONGODB_DATABASE = var.mongodb_database
      BEDROCK_REGION   = var.bedrock_region
    }
  }
}

# Lambda Event Source Mapping (SQS -> Lambda)
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn                   = aws_sqs_queue.classifier_queue.arn
  function_name                      = aws_lambda_function.classifier.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 5

  function_response_types = ["ReportBatchItemFailures"]
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 7
}
