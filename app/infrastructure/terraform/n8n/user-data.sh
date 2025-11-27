#!/bin/bash
set -e

exec > >(tee /var/log/user-data.log) 2>&1

echo "Starting n8n setup..."

# Update system
dnf update -y

# Install Docker
dnf install -y docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Install nginx
dnf install -y nginx

# Wait for EBS volume to be attached
echo "Waiting for EBS volume..."
while [ ! -e /dev/xvdf ]; do sleep 1; done

# Format and mount EBS volume (only if not already formatted)
if ! blkid /dev/xvdf; then
  echo "Formatting EBS volume..."
  mkfs.ext4 /dev/xvdf
fi

mkdir -p /opt/n8n-data
mount /dev/xvdf /opt/n8n-data

# Add to fstab for persistence
echo "/dev/xvdf /opt/n8n-data ext4 defaults,nofail 0 2" >> /etc/fstab

# Set permissions for n8n user (UID 1000)
chown -R 1000:1000 /opt/n8n-data

# Get public IP for webhook URL (fallback if no domain)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Determine webhook URL and protocol
N8N_DOMAIN="${n8n_domain}"
if [ -n "$N8N_DOMAIN" ]; then
  WEBHOOK_URL="https://$N8N_DOMAIN/"
  N8N_PROTOCOL="https"
else
  WEBHOOK_URL="http://$PUBLIC_IP:5678/"
  N8N_PROTOCOL="http"
fi

# Create Docker Compose file
mkdir -p /opt/n8n
cat > /opt/n8n/docker-compose.yml << EOF
services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${n8n_basic_auth_user}
      - N8N_BASIC_AUTH_PASSWORD=${n8n_basic_auth_password}
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=$N8N_PROTOCOL
      - WEBHOOK_URL=$WEBHOOK_URL
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
      - DB_TYPE=sqlite
      - DB_SQLITE_VACUUM_ON_STARTUP=true
      - N8N_METRICS=true
      - AWS_DEFAULT_REGION=${aws_region}
      # Allow env access in workflows
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      # Workflow variables
      - API_URL=${api_url}
      - API_KEY=${api_key}
      - AWS_S3_BUCKET_NAME=${s3_bucket_name}
    volumes:
      - /opt/n8n-data:/home/node/.n8n
EOF

# Configure nginx as reverse proxy (only if domain is set)
if [ -n "$N8N_DOMAIN" ]; then
  cat > /etc/nginx/conf.d/n8n.conf << NGINX
server {
    listen 80;
    server_name $N8N_DOMAIN;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINX

  # Start nginx
  systemctl enable nginx
  systemctl start nginx
  echo "Nginx configured for domain: $N8N_DOMAIN"
fi

# Start n8n
cd /opt/n8n
docker-compose up -d

echo "n8n setup completed!"
echo "Domain: $N8N_DOMAIN"
echo "Webhook URL: $WEBHOOK_URL"
echo "Access n8n at: $WEBHOOK_URL"
