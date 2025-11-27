variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "sa-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for Lambda layer upload"
  type        = string
}

variable "api_key" {
  description = "API key for authentication"
  type        = string
  sensitive   = true
}
