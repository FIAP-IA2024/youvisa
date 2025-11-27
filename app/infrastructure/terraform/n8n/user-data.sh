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

# Get public IP for webhook URL
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Create Docker Compose file
mkdir -p /opt/n8n
cat > /opt/n8n/docker-compose.yml << EOF
version: '3.8'

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
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://$PUBLIC_IP:5678/
      - GENERIC_TIMEZONE=America/Sao_Paulo
      - TZ=America/Sao_Paulo
      - DB_TYPE=sqlite
      - DB_SQLITE_VACUUM_ON_STARTUP=true
      - N8N_METRICS=true
      - AWS_DEFAULT_REGION=${aws_region}
    volumes:
      - /opt/n8n-data:/home/node/.n8n
EOF

# Start n8n
cd /opt/n8n
docker-compose up -d

echo "n8n setup completed!"
echo "Access n8n at: http://$PUBLIC_IP:5678"
