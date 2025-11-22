terraform {
  backend "s3" {
    bucket         = "youvisa-terraform-state-7k9m2x"
    region         = "sa-east-1"
    dynamodb_table = "youvisa-terraform-lock"
    encrypt        = true
  }
}
