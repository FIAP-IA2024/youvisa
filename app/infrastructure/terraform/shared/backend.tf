terraform {
  backend "s3" {
    bucket         = "youvisa-terraform-state-9a7b6b"
    region         = "sa-east-1"
    dynamodb_table = "youvisa-terraform-lock"
    encrypt        = true
  }
}
