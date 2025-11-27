# n8n Infrastructure Module

This Terraform module deploys n8n workflow automation platform on AWS EC2.

## Architecture

```
Internet
    |
[Elastic IP]
    |
[EC2 t3.small] -- Docker --> n8n:5678
    |
[EBS Volume] --> /opt/n8n-data (SQLite + workflows)
    |
[IAM Role] --> S3 Bucket (file access)
```

**Components:**

- **EC2 Instance**: t3.small running Amazon Linux 2023 with Docker
- **Storage**: EBS volume (gp3, 20GB) for persistent n8n data
- **Network**: Dedicated VPC with public subnet and Internet Gateway
- **Security**: Security group allowing SSH (22) and n8n (5678)
- **IP**: Elastic IP for stable public address
- **IAM**: Instance profile with S3 access permissions

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0 installed
3. S3 module already deployed (for bucket access)

## Deployment Steps

### 1. Create SSH Key Pair

```bash
aws ec2 create-key-pair \
  --key-name youvisa-n8n-key \
  --region sa-east-1 \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/youvisa-n8n-key.pem

chmod 400 ~/.ssh/youvisa-n8n-key.pem
```

### 2. Configure Variables

```bash
cd app/infrastructure/terraform/n8n
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:

- `n8n_basic_auth_password`: Strong password for n8n access
- `s3_bucket_name`: Your S3 bucket name (from s3 module)
- `allowed_ssh_cidr_blocks`: Restrict to your IP for security

### 3. Initialize and Deploy

```bash
terraform init
terraform plan
terraform apply
```

### 4. Access n8n

After deployment:

```bash
# Get n8n URL
terraform output n8n_url

# SSH into instance (if needed)
eval $(terraform output -raw ssh_command)
```

## Post-Deployment Configuration

### Configure AWS S3 Credentials in n8n

1. Access n8n at the output URL
2. Login with basic auth credentials
3. Go to Settings > Credentials > Add Credential
4. Select "AWS" and configure:
   - Region: sa-east-1
   - Authentication: Use credentials from instance metadata (IAM Role)

### Configure MongoDB Connection

1. In n8n, add MongoDB credential
2. Use the connection string from your MongoDB provider

### Configure Telegram Bot

1. Create bot via @BotFather on Telegram
2. Add Telegram credential in n8n with the bot token

## Maintenance

### View Logs

```bash
ssh -i ~/.ssh/youvisa-n8n-key.pem ec2-user@<PUBLIC_IP>
sudo docker logs -f $(sudo docker ps -q)
```

### Restart n8n

```bash
ssh -i ~/.ssh/youvisa-n8n-key.pem ec2-user@<PUBLIC_IP>
cd /opt/n8n && sudo docker-compose restart
```

### Update n8n

```bash
ssh -i ~/.ssh/youvisa-n8n-key.pem ec2-user@<PUBLIC_IP>
cd /opt/n8n && sudo docker-compose pull && sudo docker-compose up -d
```

### Backup Data

EBS snapshots are the recommended backup method:

```bash
# Get volume ID
terraform output ebs_volume_id

# Create snapshot via AWS CLI
aws ec2 create-snapshot --volume-id <VOLUME_ID> --description "n8n backup"
```

## Cost Estimate (sa-east-1)

| Resource | Monthly Cost |
|----------|--------------|
| EC2 t3.small | ~$18 |
| EBS 20GB gp3 | ~$2 |
| Elastic IP | $0 (while attached) |
| **Total** | **~$20/month** |

## Security Considerations

1. **SSH Access**: Restrict `allowed_ssh_cidr_blocks` to your IP in production
2. **n8n Auth**: Use strong password for `n8n_basic_auth_password`
3. **HTTPS**: For production, consider adding ALB with SSL certificate
4. **Updates**: Regularly update n8n and system packages

## Outputs

| Output | Description |
|--------|-------------|
| `instance_id` | EC2 instance ID |
| `public_ip` | Elastic IP address |
| `n8n_url` | URL to access n8n |
| `ssh_command` | SSH command to connect |
| `vpc_id` | VPC ID |
| `security_group_id` | Security Group ID |
| `iam_role_arn` | IAM Role ARN |
| `ebs_volume_id` | EBS Volume ID |

## Troubleshooting

### n8n not accessible after deploy

1. Wait 2-3 minutes for user-data script to complete
2. Check logs: `ssh ... && cat /var/log/user-data.log`
3. Verify security group allows port 5678

### Cannot SSH into instance

1. Verify key pair name matches
2. Check security group allows port 22 from your IP
3. Ensure instance is in "running" state

### EBS volume not mounted

1. SSH into instance
2. Check: `lsblk` and `df -h`
3. Review: `cat /var/log/user-data.log`
