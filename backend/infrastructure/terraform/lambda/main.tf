terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# Lambda Function
resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-${var.environment}"
  handler          = "lambda.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.lambda_exec_role.arn
  source_code_hash = filebase64sha256("${path.module}/../../dist.zip")
  filename         = "${path.module}/../../dist.zip"
  timeout          = 30
  memory_size      = 512

  layers = [
    aws_lambda_layer_version.node_modules.arn
  ]

  environment {
    variables = {
      NODE_ENV          = "production"
      MONGODB_URI       = var.mongodb_uri
      MONGODB_DATABASE  = var.mongodb_database
      AWS_REGION        = var.aws_region
      S3_BUCKET_NAME    = var.s3_bucket_name
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}"
  }
}

# Lambda Layer for node_modules
resource "aws_lambda_layer_version" "node_modules" {
  filename            = "${path.module}/../../nodejs-layer.zip"
  layer_name          = "${var.project_name}-${var.environment}-layer"
  compatible_runtimes = ["nodejs22.x"]
  source_code_hash    = filebase64sha256("${path.module}/../../nodejs-layer.zip")
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-lambda-role"
  }
}

# Attach AWS managed policies
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_full_access" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchFullAccess"
}

# Lambda Function URL
resource "aws_lambda_function_url" "api_url" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}
