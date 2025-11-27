data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_eip" "n8n" {
  domain = "vpc"

  tags = {
    Name = "${var.environment}-${var.project_name}-n8n-eip"
  }
}

resource "aws_eip_association" "n8n" {
  instance_id   = aws_instance.n8n.id
  allocation_id = aws_eip.n8n.id
}

resource "aws_ebs_volume" "n8n_data" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.ebs_volume_size
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "${var.environment}-${var.project_name}-n8n-data"
  }
}

resource "aws_volume_attachment" "n8n_data" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.n8n_data.id
  instance_id = aws_instance.n8n.id
}

resource "aws_instance" "n8n" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  key_name               = var.ssh_key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.n8n.id]
  iam_instance_profile   = aws_iam_instance_profile.n8n.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    n8n_basic_auth_user     = var.n8n_basic_auth_user
    n8n_basic_auth_password = var.n8n_basic_auth_password
    aws_region              = var.aws_region
  }))

  tags = {
    Name = "${var.environment}-${var.project_name}-n8n"
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}
