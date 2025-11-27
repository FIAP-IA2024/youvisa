resource "aws_iam_role" "n8n_ec2_role" {
  name = "${var.environment}-${var.project_name}-n8n-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.environment}-${var.project_name}-n8n-ec2-role"
  }
}

resource "aws_iam_role_policy" "n8n_s3_access" {
  name = "${var.environment}-${var.project_name}-n8n-s3-policy"
  role = aws_iam_role.n8n_ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.s3_bucket_name}",
          "arn:aws:s3:::${var.s3_bucket_name}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "n8n_ssm" {
  role       = aws_iam_role.n8n_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "n8n" {
  name = "${var.environment}-${var.project_name}-n8n-instance-profile"
  role = aws_iam_role.n8n_ec2_role.name
}
