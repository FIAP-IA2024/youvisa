# YOUVISA - Documentação Técnica do Projeto

## 1. Visão Geral

### O que é o YOUVISA

O YOUVISA é uma plataforma de atendimento multicanal inteligente para serviços consulares e emissão de vistos. O sistema utiliza **Inteligência Artificial**, **automação de processos (RPA)** e **visão computacional** para otimizar o atendimento ao cliente.

A plataforma permite que usuários enviem documentos (passaportes, comprovantes, formulários) através do Telegram, que são automaticamente classificados por IA e armazenados de forma organizada.

### Contexto Acadêmico

Este projeto foi desenvolvido como parte da **Sprint 2** do Challenge YOUVISA na **FIAP** (Faculdade de Informática e Administração Paulista).

**Objetivos da Sprint 2:**

- Automatizar o pipeline de documentos
- Integrar chatbot à gestão de arquivos
- Validar documentos com visão computacional
- Aplicar NLP e IA Generativa para classificação

### O que o Sistema Faz

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Usuário envia   |---->|  Sistema recebe  |---->|  IA classifica   |
|  documento via   |     |  e armazena no   |     |  o documento     |
|  Telegram        |     |  AWS S3          |     |  automaticamente |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                         +------------------+     +------------------+
                         |                  |     |                  |
                         |  Usuário recebe  |<----|  Resultado salvo |
                         |  notificação     |     |  no banco de     |
                         |  no Telegram     |     |  dados           |
                         |                  |     |                  |
                         +------------------+     +------------------+
```

---

## 2. Arquitetura

### Diagrama Geral

```
                                    YOUVISA - Arquitetura

    +-------------+
    |             |
    |   Usuário   |
    |  (Telegram) |
    |             |
    +------+------+
           |
           | Mensagem/Documento
           v
    +------+------+         +-------------+         +-------------+
    |             |         |             |         |             |
    |     n8n     |-------->|   Lambda    |-------->|   MongoDB   |
    | (Orquestrador)        | Function URL|         |  (Database) |
    |             |         |             |         |             |
    +------+------+         +-------------+         +------+------+
           |                                               ^
           | Upload                                        |
           v                                               |
    +------+------+                                        |
    |             |                                        |
    |   AWS S3    |                                        |
    | (Documentos)|                                        |
    |             |                                        |
    +------+------+                                        |
           |                                               |
           | Evento S3                                     |
           v                                               |
    +------+------+         +-------------+                |
    |             |         |             |                |
    |     SQS     |-------->| Classifier  |----------------+
    |   (Fila)    |         |   Lambda    |
    |             |         |  (Python)   |
    +-------------+         +------+------+
                                   |
                                   | AWS Bedrock
                                   | (Claude 3 Haiku)
                                   v
                            +------+------+
                            |             |
                            | Notificação |
                            |  Telegram   |
                            |             |
                            +-------------+
```

### Descrição dos Componentes

| Componente | Função |
|------------|--------|
| **Telegram** | Canal de comunicação com o usuário |
| **n8n** | Orquestra os fluxos entre componentes |
| **API Lambda** | Backend que gerencia usuários, conversas e arquivos |
| **MongoDB** | Banco de dados para persistência |
| **AWS S3** | Armazenamento de documentos |
| **SQS** | Fila de mensagens para processamento assíncrono |
| **Classifier Lambda** | Classifica documentos usando IA |
| **AWS Bedrock** | Serviço de IA (modelo Claude 3 Haiku) |

---

## 3. Componentes

### 3.1 Backend API

**Localização:** `app/api/`

**Propósito:** Gerenciar dados de usuários, conversas, mensagens e arquivos. Serve como ponto central de persistência do sistema.

**Tecnologias:**

- TypeScript
- Fastify (framework web)
- MongoDB + Mongoose (banco de dados)
- AWS Lambda (deploy serverless)

**Principais Funcionalidades:**

- Criar e atualizar usuários (sincronizado com Telegram)
- Gerenciar conversas por canal (Telegram, WhatsApp, Webchat)
- Armazenar mensagens trocadas
- Registrar metadados de arquivos enviados

**Autenticação:** Todas as requisições (exceto `/health`) exigem header `x-api-key`.

---

### 3.2 Classificador de Documentos

**Localização:** `app/classifier/`

**Propósito:** Classificar automaticamente documentos enviados pelos usuários usando Inteligência Artificial.

**Tecnologias:**

- Python 3.11
- AWS Bedrock (Claude 3 Haiku)
- boto3 (SDK AWS)
- pymongo (MongoDB)

**Categorias de Classificação:**

| Categoria | Descrição |
|-----------|-----------|
| **Passaporte** | Documento de viagem internacional |
| **RG** | Registro Geral (identidade brasileira) |
| **Comprovante** | Comprovantes de residência, renda, etc. |
| **Formulário** | Formulários preenchidos |
| **Documento inválido** | Documento não reconhecido ou ilegível |

**Fluxo de Classificação:**

```
+-------------+     +-------------+     +-------------+
|             |     |             |     |             |
|  Recebe     |---->|  Envia p/   |---->|  Normaliza  |
|  imagem     |     |  Claude AI  |     |  resposta   |
|  do S3      |     |             |     |             |
+-------------+     +-------------+     +-------------+
                                               |
                                               v
+-------------+     +-------------+     +-------------+
|             |     |             |     |             |
|  Notifica   |<----|  Salva no   |<----|  Categoria  |
|  usuário    |     |  MongoDB    |     |  definida   |
|             |     |             |     |             |
+-------------+     +-------------+     +-------------+
```

---

### 3.3 n8n (Orquestrador)

**Localização:** `app/n8n/workflows/`

**Propósito:** Orquestrar a comunicação entre Telegram, API e S3. É o "cérebro" que coordena todos os fluxos.

**Tecnologia:** n8n (plataforma de automação low-code)

**Workflow Principal (Telegram):**

```
+------------------+
|  Telegram        |
|  Trigger         |
|  (recebe msg)    |
+--------+---------+
         |
         v
+--------+---------+
|  Upsert User     |
|  (cria/atualiza  |
|  usuário na API) |
+--------+---------+
         |
         v
+--------+---------+
|  Upsert          |
|  Conversation    |
|  (cria conversa) |
+--------+---------+
         |
         v
+--------+---------+
|  Tem arquivo?    +-------> NÃO -------> Envia instruções
+--------+---------+
         |
        SIM
         |
         v
+--------+---------+
|  Download do     |
|  Telegram        |
+--------+---------+
         |
         v
+--------+---------+
|  Upload p/ S3    |
+--------+---------+
         |
         v
+--------+---------+
|  Confirmação     |
|  ao usuário      |
+------------------+
```

**Estrutura de Armazenamento no S3:**

```
s3://bucket-name/
└── {file_id}_{timestamp}_{nome_original}
```

Os arquivos são armazenados diretamente na raiz do bucket, com nome único composto pelo ID do arquivo, timestamp e nome original.

---

### 3.4 Infraestrutura AWS

**Localização:** `app/infrastructure/terraform/`

**Recursos Provisionados:**

```
                        AWS (sa-east-1 - São Paulo)

    +----------------------------------------------------------+
    |                                                          |
    |  +-------------+     +-------------+     +-------------+ |
    |  |             |     |             |     |             | |
    |  |  S3 Bucket  |     |   Lambda    |     |   Lambda    | |
    |  | (documentos)|     |    (API)    |     | (Classifier)| |
    |  |             |     | Function URL|     |             | |
    |  +-------------+     +-------------+     +-------------+ |
    |                                                          |
    |  +-------------+     +-------------+     +-------------+ |
    |  |             |     |             |     |             | |
    |  |     SQS     |     |     IAM     |     |     EC2     | |
    |  |   (filas)   |     | (permissões)|     |    (n8n)    | |
    |  |             |     |             |     |             | |
    |  +-------------+     +-------------+     +-------------+ |
    |                                                          |
    +----------------------------------------------------------+
```

| Recurso | Propósito |
|---------|-----------|
| **S3** | Armazena documentos com criptografia AES-256 |
| **Lambda (API)** | Executa o backend via Function URL (Node.js 22) |
| **Lambda (Classifier)** | Classifica documentos (Python 3.11) |
| **SQS** | Fila para processamento assíncrono de documentos |
| **EC2** | Hospeda o n8n em produção |
| **IAM** | Gerencia permissões de acesso |

**Região:** `sa-east-1` (São Paulo) para conformidade com LGPD.

---

## 4. Fluxos Principais

### 4.1 Fluxo Completo: Envio de Documento

```
Usuário              Telegram            n8n                API               S3                SQS           Classifier         MongoDB
   |                    |                 |                  |                 |                  |                |                |
   |  Envia documento   |                 |                  |                 |                  |                |                |
   |------------------->|                 |                  |                 |                  |                |                |
   |                    |  Webhook        |                  |                 |                  |                |                |
   |                    |---------------->|                  |                 |                  |                |                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |  POST /users     |                 |                  |                |                |
   |                    |                 |----------------->|                 |                  |                |                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |  POST /conversations               |                  |                |                |
   |                    |                 |----------------->|                 |                  |                |                |
   |                    |                 |                  |  Salva          |                  |                |                |
   |                    |                 |                  |---------------->|                  |                |                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |  Upload arquivo  |                 |                  |                |                |
   |                    |                 |---------------------------------->|                  |                |                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |                  |                 |  Evento S3       |                |                |
   |                    |                 |                  |                 |----------------->|                |                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |                  |                 |                  |  Trigger       |                |
   |                    |                 |                  |                 |                  |--------------->|                |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |                  |                 |                  |                |  Classifica    |
   |                    |                 |                  |                 |                  |                |  (Bedrock)     |
   |                    |                 |                  |                 |                  |                |                |
   |                    |                 |                  |                 |                  |                |  Salva result  |
   |                    |                 |                  |                 |                  |                |--------------->|
   |                    |                 |                  |                 |                  |                |                |
   |  Notificação       |                 |                  |                 |                  |                |                |
   |<-------------------|<----------------|------------------|-----------------|------------------|----------------|                |
   |                    |                 |                  |                 |                  |                |                |
```

### 4.2 Classificação com IA

O Classifier Lambda utiliza o modelo **Claude 3 Haiku** da AWS Bedrock para analisar imagens de documentos.

**Prompt utilizado (em português):**

```
Você é um classificador de documentos da plataforma YOUVISA.
Analise a imagem fornecida e identifique qual documento ela representa.
Responda com apenas uma das seguintes categorias:
- Passaporte
- RG
- Comprovante
- Formulário
- Documento inválido

Responda apenas o nome da categoria. Nada mais.
```

### 4.3 Notificação ao Usuário

Após a classificação, o usuário recebe uma notificação no Telegram:

**Documento válido:**

```
Seu documento foi classificado como: Passaporte
```

**Documento inválido:**

```
Não conseguimos identificar o documento enviado.
Por favor, envie novamente seguindo estas dicas:

- Certifique-se de que o documento está bem iluminado
- Capture o documento por inteiro
- Evite reflexos e sombras
- A imagem deve estar nítida (sem borrões)
```

---

## 5. Modelo de Dados

### Diagrama ER

```
+------------------+       +------------------+       +------------------+
|      User        |       |   Conversation   |       |     Message      |
+------------------+       +------------------+       +------------------+
| _id              |<------| user_id          |<------| conversation_id  |
| telegram_id (UK) |       | _id              |       | _id              |
| username         |       | channel          |       | message_id       |
| first_name       |       | chat_id          |       | user_id          |
| last_name        |       | status           |       | text             |
| language_code    |       | started_at       |       | message_type     |
| is_bot           |       | last_message_at  |       | direction        |
| created_at       |       | metadata         |       | timestamp        |
| updated_at       |       | created_at       |       | metadata         |
+------------------+       | updated_at       |       | created_at       |
                           +------------------+       +------------------+
                                   |
                                   |
                                   v
                           +------------------+
                           |      File        |
                           +------------------+
                           | _id              |
                           | conversation_id  |
                           | message_id       |
                           | file_id          |
                           | s3_bucket        |
                           | s3_key           |
                           | original_filename|
                           | file_size        |
                           | mime_type        |
                           | uploaded_at      |
                           | metadata         |
                           | created_at       |
                           +------------------+
```

### Descrição das Entidades

**User:** Representa um usuário do sistema, vinculado ao Telegram.

**Conversation:** Uma conversa entre usuário e sistema. Suporta múltiplos canais (telegram, whatsapp, webchat).

**Message:** Mensagem individual dentro de uma conversa. Pode ser texto, documento, foto, vídeo ou áudio.

**File:** Metadados de arquivos enviados. Armazena referência ao S3 e resultados de classificação.

---

## 6. Como Executar

### Pré-requisitos

- Docker e Docker Compose
- Terraform (>= 1.5.0)
- AWS CLI configurado
- Conta Telegram (para criar bot via @BotFather)
- MongoDB Atlas (ou instância local)

### Configuração

1. **Copie o arquivo de ambiente:**

   ```bash
   cp .env.example .env
   ```

2. **Configure as variáveis principais:**

   ```bash
   # Telegram
   TELEGRAM_BOT_TOKEN=seu_token_do_botfather

   # MongoDB
   MONGODB_URI=mongodb+srv://...
   MONGODB_DATABASE=youvisa

   # AWS
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=sa-east-1

   # API
   API_KEY=sua_chave_secreta
   ```

### Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `make help` | Lista todos os comandos disponíveis |
| `make start all` | Inicia todos os serviços localmente |
| `make deploy s3` | Faz deploy do bucket S3 |
| `make deploy api` | Faz deploy da API Lambda |
| `make deploy classifier` | Faz deploy do classificador |
| `make logs api` | Visualiza logs da API |
| `make stop` | Para todos os serviços |

### Deploy Completo (Produção)

```bash
# 1. Criar backend do Terraform
make deploy tf-state

# 2. Deploy dos componentes
make deploy s3
make deploy api
make deploy classifier
make deploy nlp
make deploy n8n
```

---

## 7. Estrutura do Projeto

```
youvisa/
├── app/
│   ├── api/                    # Backend API (TypeScript/Fastify)
│   │   ├── src/
│   │   │   ├── controllers/    # Lógica de negócio
│   │   │   ├── models/         # Schemas MongoDB
│   │   │   ├── repositories/   # Acesso a dados
│   │   │   ├── config/         # Configurações
│   │   │   ├── routes.ts       # Definição de rotas
│   │   │   ├── lambda.ts       # Handler AWS Lambda
│   │   │   └── server.ts       # Servidor local
│   │   └── package.json
│   │
│   ├── classifier/             # Lambda classificador (Python)
│   │   └── src/
│   │       ├── handler.py      # Entry point Lambda
│   │       ├── bedrock.py      # Integração AWS Bedrock
│   │       ├── mongodb.py      # Operações MongoDB
│   │       └── telegram.py     # Notificações Telegram
│   │
│   ├── n8n/
│   │   └── workflows/          # Workflows n8n
│   │       └── telegram.template.json
│   │
│   └── infrastructure/
│       └── terraform/          # Infraestrutura como código
│           ├── s3/             # Bucket S3
│           ├── api/            # Lambda API
│           ├── classifier/     # Lambda Classifier + SQS
│           ├── nlp/            # Lambda NLP
│           ├── validation/     # Lambda Validation
│           ├── n8n/            # EC2 para n8n
│           └── tf-state/       # Backend Terraform
│
├── scripts/                    # Scripts de automação
│   ├── deploy.sh              # Deploy de infraestrutura
│   ├── start.sh               # Iniciar serviços
│   └── generate-workflow.sh   # Gerar workflow n8n
│
├── docs/
│   └── diagramas/             # Diagramas da arquitetura
│
├── docker-compose.yml         # Configuração Docker
├── Makefile                   # Comandos make
├── .env.example               # Exemplo de variáveis
└── README.md                  # Documentação principal
```

---

## Tecnologias Utilizadas

| Categoria | Tecnologia | Versão/Detalhes |
|-----------|------------|-----------------|
| **Backend** | TypeScript | - |
| **Framework** | Fastify | 5.5.0 |
| **Banco de Dados** | MongoDB | Atlas |
| **Orquestração** | n8n | Latest |
| **IA/ML** | AWS Bedrock | Claude 3 Haiku |
| **Cloud** | AWS | sa-east-1 |
| **IaC** | Terraform | >= 1.5.0 |
| **Containers** | Docker | - |
| **Runtime (API)** | Node.js | 22.x |
| **Runtime (Classifier)** | Python | 3.11 |

---

## Conformidade e Segurança

- **LGPD:** Dados processados na região `sa-east-1` (São Paulo)
- **Criptografia:** AES-256 para dados em repouso (S3)
- **Autenticação:** API Key obrigatória em todas as requisições
- **IAM:** Princípio do menor privilégio para permissões AWS
