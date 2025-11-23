# Lambda Function for OCR Document Processing
resource "aws_lambda_function" "ocr_processor" {
  function_name    = "${var.environment}-${var.project_name}"
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.ocr_lambda_role.arn
  timeout          = 60
  memory_size      = 2048
  source_code_hash = filebase64sha256("${path.module}/../../../ocr/document-processor/dist.zip")
  filename         = "${path.module}/../../../ocr/document-processor/dist.zip"

  layers = [aws_lambda_layer_version.ocr_node_modules.arn]

  environment {
    variables = {
      NODE_ENV          = "production"
      MONGODB_URI       = var.mongodb_uri
      MONGODB_DATABASE  = var.mongodb_database
      AWS_REGION        = var.aws_region
      USE_MOCK_TEXTRACT = "false"
    }
  }

  reserved_concurrent_executions = 5

  tags = {
    Name = "${var.environment}-${var.project_name}"
  }
}

# Lambda Layer for node_modules
resource "aws_lambda_layer_version" "ocr_node_modules" {
  filename            = "${path.module}/../../../ocr/document-processor/nodejs-layer.zip"
  layer_name          = "${var.environment}-${var.project_name}-layer"
  compatible_runtimes = ["nodejs22.x"]
  source_code_hash    = filebase64sha256("${path.module}/../../../ocr/document-processor/nodejs-layer.zip")
}

# Event Source Mapping: SQS → Lambda
resource "aws_lambda_event_source_mapping" "sqs_to_lambda" {
  event_source_arn = aws_sqs_queue.ocr_queue.arn
  function_name    = aws_lambda_function.ocr_processor.function_name

  batch_size                         = 10
  maximum_batching_window_in_seconds = 5

  function_response_types = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 5
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ocr_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.ocr_processor.function_name}"
  retention_in_days = 7

  tags = {
    Name = "${var.environment}-${var.project_name}-logs"
  }
}
