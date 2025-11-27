# Lambda Layer with OpenCV dependencies
resource "aws_lambda_layer_version" "opencv_layer" {
  filename            = "${path.module}/../../../../validation/layer.zip"
  layer_name          = "${local.function_name}-opencv-layer"
  compatible_runtimes = ["python3.11"]
  source_code_hash    = filebase64sha256("${path.module}/../../../../validation/layer.zip")
}

# Lambda Function
resource "aws_lambda_function" "validation" {
  filename         = "${path.module}/../../../../validation/lambda.zip"
  function_name    = local.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "handler.handler"
  source_code_hash = filebase64sha256("${path.module}/../../../../validation/lambda.zip")
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 512

  layers = [aws_lambda_layer_version.opencv_layer.arn]

  environment {
    variables = {
      NODE_ENV = var.environment
    }
  }
}

# Lambda Function URL (for direct HTTP access)
resource "aws_lambda_function_url" "validation_url" {
  function_name      = aws_lambda_function.validation.function_name
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
