variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "youvisa"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for storing files"
  type        = string
}

variable "aws_region" {
  description = "AWS region for resources (sa-east-1 for LGPD compliance)"
  type        = string
  default     = "sa-east-1"
}
