# Terraform S3 Infrastructure

This directory contains Terraform configuration files to provision AWS S3 infrastructure for the YOUVISA project. The infrastructure includes an S3 bucket for storing files received via Telegram, WhatsApp, and other channels, along with an IAM user with minimal permissions for n8n integration.

## Resources Provisioned

### S3 Bucket
- **Name**: Configurable via `s3_bucket_name` variable
- **Region**: `sa-east-1` (Sao Paulo) for LGPD compliance
- **Versioning**: Enabled
- **Encryption**: AES-256 server-side encryption
- **Public Access**: Completely blocked (private bucket)
- **Tags**: Project, Environment, ManagedBy

### IAM User
- **Name**: `youvisa-n8n-user-{environment}`
- **Purpose**: Dedicated user for n8n to upload files to S3
- **Permissions**: Minimal IAM policy with only:
  - `s3:PutObject` - Upload files
  - `s3:GetObject` - Download files
  - `s3:ListBucket` - List bucket contents

### Security Features
- Bucket with versioning enabled for data protection
- Server-side encryption (AES-256) for all objects
- Public access completely blocked
- IAM user with least privilege principle
- All resources tagged for governance

## Prerequisites

Before running Terraform, ensure you have:

1. **Terraform installed** (version >= 1.5.0)
   ```bash
   terraform version
   ```

2. **AWS CLI configured** with credentials that have permissions to create:
   - S3 buckets
   - IAM users
   - IAM policies

   ```bash
   aws configure
   ```

3. **AWS Account** with access to `sa-east-1` region

## Setup Instructions

### Step 1: Configure Variables

Copy the example file and customize it:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set your values:

```hcl
project_name   = "youvisa"
environment    = "dev"
s3_bucket_name = "youvisa-files-dev-UNIQUE-SUFFIX"  # Must be globally unique
aws_region     = "sa-east-1"
```

**IMPORTANT**: S3 bucket names must be globally unique across ALL AWS accounts. Add a unique suffix (e.g., your company name, random string, or account ID).

### Step 2: Initialize Terraform

Initialize Terraform to download required providers:

```bash
terraform init
```

Expected output:
```
Terraform has been successfully initialized!
```

### Step 3: Review the Plan

Preview the resources that will be created:

```bash
terraform plan
```

Review the output carefully to ensure:
- Bucket name is unique and correct
- Region is `sa-east-1`
- All tags are present
- Resources match your expectations

### Step 4: Apply Configuration

Create the infrastructure:

```bash
terraform apply
```

Type `yes` when prompted to confirm.

Expected output:
```
Apply complete! Resources: 6 added, 0 changed, 0 destroyed.

Outputs:

aws_access_key_id = <sensitive>
aws_region = "sa-east-1"
aws_secret_access_key = <sensitive>
bucket_arn = "arn:aws:s3:::youvisa-files-dev-SUFFIX"
bucket_name = "youvisa-files-dev-SUFFIX"
n8n_user_name = "youvisa-n8n-user-dev"
```

### Step 5: Retrieve Sensitive Outputs

To view the AWS credentials for n8n:

```bash
terraform output aws_access_key_id
terraform output aws_secret_access_key
```

**IMPORTANT**: Copy these values immediately and add them to your `.env` file. These credentials will be needed for n8n to access S3.

```bash
# In project root
echo "AWS_ACCESS_KEY_ID=$(terraform output -raw aws_access_key_id)" >> .env
echo "AWS_SECRET_ACCESS_KEY=$(terraform output -raw aws_secret_access_key)" >> .env
echo "S3_BUCKET_NAME=$(terraform output -raw bucket_name)" >> .env
echo "AWS_REGION=$(terraform output -raw aws_region)" >> .env
```

## Useful Commands

### View Current State
```bash
terraform show
```

### List All Outputs
```bash
terraform output
```

### View Specific Output (without sensitive masking)
```bash
terraform output -raw bucket_name
terraform output -raw aws_access_key_id
```

### Validate Configuration
```bash
terraform validate
```

### Format Code
```bash
terraform fmt -recursive
```

### Refresh State
```bash
terraform refresh
```

## Destroying Infrastructure

**WARNING**: This will permanently delete the S3 bucket and all files inside it. Use with extreme caution.

To destroy all resources created by Terraform:

```bash
terraform destroy
```

Type `yes` when prompted to confirm.

**Note**: If the bucket contains objects, you may need to empty it first or use force delete (not recommended for production).

## Troubleshooting

### Error: "BucketAlreadyExists"

**Problem**: S3 bucket name is not globally unique.

**Solution**: Change `s3_bucket_name` in `terraform.tfvars` to a unique value.

### Error: "AccessDenied" during apply

**Problem**: Your AWS credentials don't have sufficient permissions.

**Solution**: Ensure your AWS user/role has permissions to create S3 buckets and IAM users. Check with:
```bash
aws sts get-caller-identity
```

### Error: "InvalidBucketName"

**Problem**: Bucket name doesn't follow AWS naming rules.

**Solution**: Ensure bucket name:
- Is between 3-63 characters
- Contains only lowercase letters, numbers, dots, and hyphens
- Starts and ends with a letter or number
- Doesn't contain consecutive dots

### State File Issues

If Terraform state becomes corrupted or out of sync:

```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup

# Import existing resources (if they exist in AWS but not in state)
terraform import aws_s3_bucket.files youvisa-files-dev-SUFFIX
```

## File Structure

```
infrastructure/terraform/s3/
├── main.tf                    # S3 bucket configuration
├── iam.tf                     # IAM user and policies
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example configuration
├── terraform.tfvars           # Your configuration (gitignored)
├── terraform.tfstate          # State file (gitignored)
└── README.md                  # This file
```

## Security Best Practices

1. **Never commit** `terraform.tfvars` or `terraform.tfstate` to Git
2. **Use separate environments** (dev, staging, prod) with different state files
3. **Rotate credentials** regularly (regenerate IAM access keys periodically)
4. **Monitor access** using AWS CloudTrail and S3 access logs
5. **Enable MFA** on your AWS root account
6. **Use remote state** (S3 + DynamoDB) for production environments

## Next Steps

After provisioning infrastructure:

1. Add AWS credentials to `.env` file
2. Configure n8n with these credentials
3. Create Telegram bot via BotFather
4. Set up n8n workflow to receive files from Telegram
5. Test the complete flow: Telegram > n8n > S3

## References

- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [LGPD and AWS](https://aws.amazon.com/compliance/brazil-data-privacy/)
