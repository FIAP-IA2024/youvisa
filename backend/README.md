# YOUVISA Backend API

Backend API REST para o sistema YOUVISA 360, construido com Fastify + TypeScript + MongoDB e deployavel como AWS Lambda Function.

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                  Fastify API                        │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐       │
│  │ Routes   │─>│Controllers│─>│Repositories│       │
│  └──────────┘  └──────────┘  └───────────┘       │
│                                      │             │
│                                      v             │
│                              ┌──────────────┐     │
│                              │   MongoDB    │     │
│                              └──────────────┘     │
│                                                     │
│  Dependency Injection: tsyringe                   │
│  Validation: Zod                                  │
│  Logger: Winston                                  │
└─────────────────────────────────────────────────────┘
```

## Tecnologias

- **Runtime**: Node.js 22
- **Framework**: Fastify 5
- **Database**: MongoDB (via Mongoose)
- **Language**: TypeScript
- **Dependency Injection**: tsyringe
- **Validation**: Zod
- **Logging**: Winston
- **Deployment**: AWS Lambda + Lambda Function URL

## Pre-requisitos

- Node.js >= 22
- Docker e Docker Compose (para MongoDB local)
- AWS CLI (para deploy)
- Terraform >= 1.5.0 (para infraestrutura)

## Instalacao

```bash
# Instalar dependencias
npm install

# Copiar arquivo de configuracao
cp .env.example .env

# Editar .env com suas configuracoes
```

## Configuracao

### Variaveis de Ambiente

```bash
# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/youvisa?authSource=admin
MONGODB_DATABASE=youvisa

# AWS
AWS_REGION=sa-east-1
S3_BUCKET_NAME=youvisa-files-dev

# API
API_HOST=0.0.0.0
API_PORT=3000
NODE_ENV=development
IS_DEBUG=true
```

### Iniciar MongoDB com Docker

```bash
# Na raiz do projeto
cd ..
docker-compose up -d mongodb
```

Aguarde o MongoDB inicializar (verificar com `docker-compose logs mongodb`).

## Desenvolvimento

### Executar localmente

```bash
npm run dev
```

A API estara disponivel em `http://localhost:3000`.

### Rodar type-check

```bash
npm run type-check
```

### Rodar linter

```bash
npm run lint
npm run lint:fix
```

## API Endpoints

### Health Check

```
GET /health
```

### Users

```
POST   /users                      # Criar usuario
GET    /users/:id                  # Buscar usuario por ID
PUT    /users/:id                  # Atualizar usuario
DELETE /users/:id                  # Deletar usuario
POST   /users/upsert/:telegramId   # Upsert por Telegram ID
```

### Conversations

```
POST   /conversations              # Criar conversacao
GET    /conversations/:id          # Buscar conversacao por ID
GET    /conversations              # Listar conversacoes (com filtros)
PUT    /conversations/:id          # Atualizar conversacao
POST   /conversations/upsert       # Upsert conversacao
```

### Messages

```
POST   /messages                   # Criar mensagem
GET    /messages/:id               # Buscar mensagem por ID
GET    /messages                   # Listar mensagens (com filtros)
```

### Files

```
POST   /files                      # Criar registro de arquivo
GET    /files/:id                  # Buscar arquivo por ID
GET    /files                      # Listar arquivos (com filtros)
```

## Schemas MongoDB

### User

```typescript
{
  telegram_id: string (unique, indexed)
  username?: string
  first_name?: string
  last_name?: string
  language_code?: string
  is_bot: boolean
  created_at: Date
  updated_at: Date
}
```

### Conversation

```typescript
{
  user_id: ObjectId (ref: User)
  channel: 'telegram' | 'whatsapp' | 'webchat'
  chat_id: string (indexed)
  status: 'active' | 'transferred' | 'resolved' | 'closed'
  started_at: Date
  last_message_at?: Date
  metadata: object
  created_at: Date
  updated_at: Date
}
```

### Message

```typescript
{
  conversation_id: ObjectId (ref: Conversation)
  message_id: string
  user_id: ObjectId (ref: User)
  text?: string
  message_type: 'text' | 'document' | 'photo' | 'video' | 'audio'
  direction: 'incoming' | 'outgoing'
  timestamp: Date (indexed)
  metadata: object
  created_at: Date
}
```

### File

```typescript
{
  conversation_id: ObjectId (ref: Conversation)
  message_id: ObjectId (ref: Message)
  file_id: string (indexed)
  s3_bucket: string
  s3_key: string
  original_filename?: string
  file_size?: number
  mime_type?: string
  uploaded_at: Date
  metadata: object
  created_at: Date
}
```

## Deploy na AWS Lambda

### 1. Build e Package

```bash
npm run package:lambda
```

Isto gera dois arquivos:
- `dist.zip` - Codigo da aplicacao
- `nodejs-layer.zip` - Dependencias (node_modules)

### 2. Configurar Terraform

```bash
cd infrastructure/terraform/lambda
cp terraform.tfvars.example terraform.tfvars
```

Edite `terraform.tfvars` com seus valores:

```hcl
project_name     = "youvisa-api"
environment      = "dev"
aws_region       = "sa-east-1"
mongodb_uri      = "mongodb+srv://user:pass@cluster.mongodb.net/youvisa"
mongodb_database = "youvisa"
s3_bucket_name   = "youvisa-files-dev"
```

### 3. Deploy com Terraform

```bash
terraform init
terraform plan
terraform apply
```

### 4. Obter Lambda Function URL

```bash
terraform output lambda_function_url
```

Copie esta URL e adicione ao `.env` como `LAMBDA_FUNCTION_URL`.

## Estrutura do Projeto

```
backend/
├── src/
│   ├── config/              # Configuracoes (env, logger, fastify, database)
│   ├── models/              # Mongoose schemas
│   ├── repositories/        # Data access layer
│   ├── controllers/         # Business logic
│   ├── container.ts         # Dependency injection container
│   ├── routes.ts            # API routes
│   ├── app.ts               # Fastify app setup
│   ├── server.ts            # Local server entrypoint
│   └── lambda.ts            # Lambda handler entrypoint
├── infrastructure/
│   └── terraform/
│       └── lambda/          # Terraform para Lambda Function
├── scripts/
│   └── package-lambda.sh    # Script de build para Lambda
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Troubleshooting

### MongoDB connection error

Verifique que o MongoDB esta rodando:

```bash
docker-compose ps mongodb
docker-compose logs mongodb
```

### Lambda timeout

Se a Lambda estiver dando timeout, aumente o timeout no Terraform (`main.tf`):

```hcl
resource "aws_lambda_function" "api" {
  timeout = 30  # Aumentar se necessario
}
```

### CORS errors

Certifique-se de que as origens estao configuradas corretamente no Lambda Function URL (Terraform `main.tf`).

## Integracao com n8n

Para integrar com o workflow n8n, configure a variavel de ambiente no n8n:

```yaml
# docker-compose.yml
services:
  n8n:
    environment:
      - LAMBDA_FUNCTION_URL=https://xxx.lambda-url.sa-east-1.on.aws
```

Consulte o guia de workflow em `app/n8n-workflows/002-telegram-to-s3-mongodb.md`.

## Seguranca

- **NUNCA** commite arquivos `.env` ou `terraform.tfvars`
- Use variaveis de ambiente para credenciais
- MongoDB connection string deve incluir `authSource=admin`
- Lambda Function URL esta sem autenticacao (adicionar JWT futuramente)

## Proximos Passos

- [ ] Implementar autenticacao JWT
- [ ] Adicionar validacao de schemas com Zod
- [ ] Implementar paginacao nos endpoints de listagem
- [ ] Adicionar testes unitarios e de integracao
- [ ] Implementar soft delete
- [ ] Adicionar rate limiting
- [ ] Migrar para API Gateway (se necessario)

## Licenca

ISC
