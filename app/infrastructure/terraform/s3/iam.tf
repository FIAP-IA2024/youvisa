resource "aws_iam_user" "n8n_user" {
  name = "${var.environment}-${var.project_name}-n8n-user"

  tags = {
    Name = "${var.environment}-${var.project_name}-n8n-user"
  }
}

resource "aws_iam_access_key" "n8n_user" {
  user = aws_iam_user.n8n_user.name
}

resource "aws_iam_user_policy" "n8n_s3_policy" {
  name = "${var.environment}-${var.project_name}-n8n-s3-policy"
  user = aws_iam_user.n8n_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.files.arn,
          "${aws_s3_bucket.files.arn}/*"
        ]
      }
    ]
  })
}
