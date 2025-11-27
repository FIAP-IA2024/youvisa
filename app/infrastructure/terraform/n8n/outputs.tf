output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.n8n.id
}

output "public_ip" {
  description = "Elastic IP address of n8n instance"
  value       = aws_eip.n8n.public_ip
}

output "n8n_url" {
  description = "URL to access n8n web interface"
  value       = var.n8n_domain != "" ? "https://${var.n8n_domain}" : "http://${aws_eip.n8n.public_ip}:5678"
}

output "n8n_domain" {
  description = "Configured domain for n8n (empty if not set)"
  value       = var.n8n_domain
}

output "ssh_command" {
  description = "SSH command to connect to the instance"
  value       = "ssh -i ~/.ssh/${var.ssh_key_name}.pem ec2-user@${aws_eip.n8n.public_ip}"
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.n8n.id
}

output "security_group_id" {
  description = "Security Group ID"
  value       = aws_security_group.n8n.id
}

output "iam_role_arn" {
  description = "IAM role ARN for n8n EC2 instance"
  value       = aws_iam_role.n8n_ec2_role.arn
}

output "ebs_volume_id" {
  description = "EBS volume ID for n8n data"
  value       = aws_ebs_volume.n8n_data.id
}
