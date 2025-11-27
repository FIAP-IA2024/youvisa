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

variable "aws_region" {
  description = "AWS region for resources (sa-east-1 for LGPD compliance)"
  type        = string
  default     = "sa-east-1"
}

variable "instance_type" {
  description = "EC2 instance type for n8n"
  type        = string
  default     = "t3.small"
}

variable "ebs_volume_size" {
  description = "Size of EBS volume for n8n data in GB"
  type        = number
  default     = 20
}

variable "ssh_key_name" {
  description = "Name of the SSH key pair for EC2 access"
  type        = string
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "n8n_basic_auth_user" {
  description = "n8n basic auth username"
  type        = string
  default     = "admin"
}

variable "n8n_basic_auth_password" {
  description = "n8n basic auth password"
  type        = string
  sensitive   = true
}

variable "s3_bucket_name" {
  description = "S3 bucket name that n8n will access"
  type        = string
}

variable "n8n_domain" {
  description = "Domain for n8n (e.g., n8n.example.com). Leave empty for IP-only access"
  type        = string
  default     = ""
}

variable "api_url" {
  description = "API URL for n8n workflows (Lambda Function URL)"
  type        = string
}

variable "api_key" {
  description = "API Key for n8n workflows"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}
