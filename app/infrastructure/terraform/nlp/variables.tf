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

variable "bedrock_region" {
  description = "AWS region for Bedrock (Claude)"
  type        = string
  default     = "sa-east-1"
}

variable "api_key" {
  description = "API key for authentication"
  type        = string
  sensitive   = true
}
