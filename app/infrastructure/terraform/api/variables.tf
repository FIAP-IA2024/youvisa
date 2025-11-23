variable "project_name" {
  description = "Project name"
  type        = string
  default     = "youvisa-api"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "sa-east-1"
}

variable "mongodb_uri" {
  description = "MongoDB connection URI (loaded from .env)"
  type        = string
  sensitive   = true
}

variable "mongodb_database" {
  description = "MongoDB database name (loaded from .env)"
  type        = string
  default     = "dev"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  type        = string
  default     = "dev-youvisa-files-9k3m7x"
}

variable "api_key" {
  description = "API key for backend authentication"
  type        = string
  sensitive   = true
}
