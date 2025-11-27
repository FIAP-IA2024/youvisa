terraform {
  required_version = ">= 1.0"

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
      Project     = "youvisa"
      Environment = var.environment
      ManagedBy   = "terraform"
      Service     = "validation"
    }
  }
}

locals {
  function_name = "${var.environment}-youvisa-validation"
}
