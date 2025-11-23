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
      Service     = "ocr"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_s3_bucket" "files" {
  bucket = var.s3_bucket_name
}
