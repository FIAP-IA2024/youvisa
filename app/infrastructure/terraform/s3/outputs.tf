output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.files.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.files.arn
}

output "aws_region" {
  description = "AWS region where resources were created"
  value       = var.aws_region
}

output "n8n_user_name" {
  description = "IAM user name for n8n"
  value       = aws_iam_user.n8n_user.name
}

output "aws_access_key_id" {
  description = "Access Key ID for n8n user (add to .env)"
  value       = aws_iam_access_key.n8n_user.id
  sensitive   = true
}

output "aws_secret_access_key" {
  description = "Secret Access Key for n8n user (add to .env)"
  value       = aws_iam_access_key.n8n_user.secret
  sensitive   = true
}
