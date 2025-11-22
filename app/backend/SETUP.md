# Setup Rapido - YOUVISA Backend

Guia de setup rapido para executar o backend localmente.

## 1. Pre-requisitos

```bash
# Verificar Node.js (>= 22)
node --version

# Verificar Docker
docker --version
docker-compose --version
```

## 2. Instalar Dependencias

```bash
cd backend
npm install
```

## 3. Configurar Variaveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` se necessario. Os valores padrao funcionam para desenvolvimento local.

## 4. Iniciar MongoDB

```bash
# Na raiz do projeto
cd ..
docker-compose up -d mongodb
```

Aguarde alguns segundos para o MongoDB inicializar.

## 5. Executar API

```bash
cd backend
npm run dev
```

A API estara disponivel em `http://localhost:3000`.

## 6. Testar

```bash
# Health check
curl http://localhost:3000/health

# Criar usuario
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"telegram_id":"123456","first_name":"Test"}'

# Listar conversacoes
curl http://localhost:3000/conversations
```

## 7. Verificar MongoDB

```bash
# Conectar ao MongoDB
docker exec -it youvisa-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# No mongosh:
use youvisa
db.users.find()
db.conversations.find()
db.messages.find()
db.files.find()
```

## Comandos Uteis

```bash
# Ver logs do MongoDB
docker-compose logs -f mongodb

# Parar tudo
docker-compose down

# Limpar dados do MongoDB
docker-compose down -v

# Rebuild da aplicacao
npm run build

# Type-check
npm run type-check

# Lint
npm run lint:fix
```

## Deploy na Lambda

Veja o README.md principal para instrucoes completas de deploy.

Resumo:

```bash
# 1. Build e package
npm run package:lambda

# 2. Deploy com Terraform
cd infrastructure/terraform/lambda
terraform init
terraform apply
```
