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

variable "mongodb_uri" {
  description = "MongoDB connection URI"
  type        = string
  sensitive   = true
}

variable "mongodb_database" {
  description = "MongoDB database name"
  type        = string
  default     = "youvisa"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  type        = string
}

variable "bedrock_region" {
  description = "AWS region for Bedrock (Claude Vision)"
  type        = string
  default     = "us-east-1"
}

variable "telegram_bot_token" {
  description = "Telegram Bot Token for notifications"
  type        = string
  sensitive   = true
}
