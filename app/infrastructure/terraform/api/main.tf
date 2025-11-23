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
  function_name    = "${var.environment}-${var.project_name}"
  handler          = "lambda.handler"
  runtime          = "nodejs22.x"
  role             = aws_iam_role.lambda_exec_role.arn
  source_code_hash = filebase64sha256("${path.module}/../../../api/dist.zip")
  filename         = "${path.module}/../../../api/dist.zip"
  timeout          = 30
  memory_size      = 512

  layers = [
    aws_lambda_layer_version.node_modules.arn
  ]

  environment {
    variables = {
      NODE_ENV          = "production"
      API_KEY           = var.api_key
      MONGODB_URI       = var.mongodb_uri
      MONGODB_DATABASE  = var.mongodb_database
      S3_BUCKET_NAME    = var.s3_bucket_name
    }
  }

  tags = {
    Name = "${var.environment}-${var.project_name}"
  }
}

# Lambda Layer for node_modules
resource "aws_lambda_layer_version" "node_modules" {
  filename            = "${path.module}/../../../api/nodejs-layer.zip"
  layer_name          = "${var.environment}-${var.project_name}-layer"
  compatible_runtimes = ["nodejs22.x"]
  source_code_hash    = filebase64sha256("${path.module}/../../../api/nodejs-layer.zip")
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.environment}-${var.project_name}-lambda-role"

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
    Name = "${var.environment}-${var.project_name}-lambda-role"
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
