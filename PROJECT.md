# YOUVISA - Documentacao Tecnica do Projeto

## 1. Visao Geral

### O que e o YOUVISA

O YOUVISA e uma plataforma de atendimento multicanal inteligente para servicos consulares e emissao de vistos. O sistema utiliza **Inteligencia Artificial**, **automacao de processos (RPA)** e **visao computacional** para otimizar o atendimento ao cliente.

A plataforma permite que usuarios enviem documentos (passaportes, comprovantes, formularios) atraves do Telegram, que sao automaticamente classificados por IA e armazenados de forma organizada.

### Contexto Academico

Este projeto foi desenvolvido como parte da **Sprint 2** do Challenge YOUVISA na **FIAP** (Faculdade de Informatica e Administracao Paulista).

**Objetivos da Sprint 2:**
- Automatizar o pipeline de documentos
- Integrar chatbot a gestao de arquivos
- Validar documentos com visao computacional
- Aplicar NLP e IA Generativa para classificacao

### O que o Sistema Faz

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Usuario envia   |---->|  Sistema recebe  |---->|  IA classifica   |
|  documento via   |     |  e armazena no   |     |  o documento     |
|  Telegram        |     |  AWS S3          |     |  automaticamente |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                         +------------------+     +------------------+
                         |                  |     |                  |
                         |  Usuario recebe  |<----|  Resultado salvo |
                         |  notificacao     |     |  no banco de     |
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
    |   Usuario   |
    |  (Telegram) |
    |             |
    +------+------+
           |
           | Mensagem/Documento
           v
    +------+------+         +-------------+         +-------------+
    |             |         |             |         |             |
    |     n8n     |-------->|  API Lambda |-------->|   MongoDB   |
    | (Orquestrador)        | (TypeScript)|         |  (Database) |
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
                            | Notificacao |
                            |  Telegram   |
                            |             |
                            +-------------+
```

### Descricao dos Componentes

| Componente | Funcao |
|------------|--------|
| **Telegram** | Canal de comunicacao com o usuario |
| **n8n** | Orquestra os fluxos entre componentes |
| **API Lambda** | Backend que gerencia usuarios, conversas e arquivos |
| **MongoDB** | Banco de dados para persistencia |
| **AWS S3** | Armazenamento de documentos |
| **SQS** | Fila de mensagens para processamento assincrono |
| **Classifier Lambda** | Classifica documentos usando IA |
| **AWS Bedrock** | Servico de IA (modelo Claude 3 Haiku) |

---

## 3. Componentes

### 3.1 Backend API

**Localizacao:** `app/api/`

**Proposito:** Gerenciar dados de usuarios, conversas, mensagens e arquivos. Serve como ponto central de persistencia do sistema.

**Tecnologias:**
- TypeScript
- Fastify (framework web)
- MongoDB + Mongoose (banco de dados)
- AWS Lambda (deploy serverless)

**Principais Funcionalidades:**
- Criar e atualizar usuarios (sincronizado com Telegram)
- Gerenciar conversas por canal (Telegram, WhatsApp, Webchat)
- Armazenar mensagens trocadas
- Registrar metadados de arquivos enviados

**Autenticacao:** Todas as requisicoes (exceto `/health`) exigem header `x-api-key`.

---

### 3.2 Classificador de Documentos

**Localizacao:** `app/classifier/`

**Proposito:** Classificar automaticamente documentos enviados pelos usuarios usando Inteligencia Artificial.

**Tecnologias:**
- Python 3.11
- AWS Bedrock (Claude 3 Haiku)
- boto3 (SDK AWS)
- pymongo (MongoDB)

**Categorias de Classificacao:**

| Categoria | Descricao |
|-----------|-----------|
| **Passaporte** | Documento de viagem internacional |
| **RG** | Registro Geral (identidade brasileira) |
| **Comprovante** | Comprovantes de residencia, renda, etc. |
| **Formulario** | Formularios preenchidos |
| **Documento invalido** | Documento nao reconhecido ou ilegivel |

**Fluxo de Classificacao:**

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
|  usuario    |     |  MongoDB    |     |  definida   |
|             |     |             |     |             |
+-------------+     +-------------+     +-------------+
```

---

### 3.3 n8n (Orquestrador)

**Localizacao:** `app/n8n/workflows/`

**Proposito:** Orquestrar a comunicacao entre Telegram, API e S3. E o "cerebro" que coordena todos os fluxos.

**Tecnologia:** n8n (plataforma de automacao low-code)

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
|  usuario na API) |
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
|  Tem arquivo?    +-------> NAO -------> Envia instrucoes
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
|  (organizado     |
|  por data)       |
+--------+---------+
         |
         v
+--------+---------+
|  Confirmacao     |
|  ao usuario      |
+------------------+
```

**Estrutura de Armazenamento no S3:**
```
s3://bucket-name/
└── telegram/
    └── YYYY/
        └── MM/
            └── DD/
                └── {file_id}_{timestamp}_{nome_original}
```

---

### 3.4 Infraestrutura AWS

**Localizacao:** `app/infrastructure/terraform/`

**Recursos Provisionados:**

```
                        AWS (sa-east-1 - Sao Paulo)

    +----------------------------------------------------------+
    |                                                          |
    |  +-------------+     +-------------+     +-------------+ |
    |  |             |     |             |     |             | |
    |  |  S3 Bucket  |     | API Gateway |     |   Lambda    | |
    |  | (documentos)|     |   Lambda    |     | (Classifier)| |
    |  |             |     |             |     |             | |
    |  +-------------+     +-------------+     +-------------+ |
    |                                                          |
    |  +-------------+     +-------------+     +-------------+ |
    |  |             |     |             |     |             | |
    |  |     SQS     |     |     IAM     |     |     EC2     | |
    |  | (filas)     |     |  (permissoes)|    |   (n8n)     | |
    |  |             |     |             |     |             | |
    |  +-------------+     +-------------+     +-------------+ |
    |                                                          |
    +----------------------------------------------------------+
```

| Recurso | Proposito |
|---------|-----------|
| **S3** | Armazena documentos com criptografia AES-256 |
| **Lambda (API)** | Executa o backend (Node.js 22) |
| **Lambda (Classifier)** | Classifica documentos (Python 3.11) |
| **SQS** | Fila para processamento assincrono de documentos |
| **EC2** | Hospeda o n8n em producao |
| **IAM** | Gerencia permissoes de acesso |

**Regiao:** `sa-east-1` (Sao Paulo) para conformidade com LGPD.

---

## 4. Fluxos Principais

### 4.1 Fluxo Completo: Envio de Documento

```
Usuario              Telegram            n8n                API               S3                SQS           Classifier         MongoDB
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
   |  Notificacao       |                 |                  |                 |                  |                |                |
   |<-------------------|<----------------|------------------|-----------------|------------------|----------------|                |
   |                    |                 |                  |                 |                  |                |                |
```

### 4.2 Classificacao com IA

O Classifier Lambda utiliza o modelo **Claude 3 Haiku** da AWS Bedrock para analisar imagens de documentos.

**Prompt utilizado (em portugues):**
```
Voce e um classificador de documentos da plataforma YOUVISA.
Analise a imagem fornecida e identifique qual documento ela representa.
Responda com apenas uma das seguintes categorias:
- Passaporte
- RG
- Comprovante
- Formulario
- Documento invalido

Responda apenas o nome da categoria. Nada mais.
```

### 4.3 Notificacao ao Usuario

Apos a classificacao, o usuario recebe uma notificacao no Telegram:

**Documento valido:**
```
Seu documento foi classificado como: Passaporte
```

**Documento invalido:**
```
Nao conseguimos identificar o documento enviado.
Por favor, envie novamente seguindo estas dicas:

- Certifique-se de que o documento esta bem iluminado
- Capture o documento por inteiro
- Evite reflexos e sombras
- A imagem deve estar nitida (sem borroes)
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

### Descricao das Entidades

**User:** Representa um usuario do sistema, vinculado ao Telegram.

**Conversation:** Uma conversa entre usuario e sistema. Suporta multiplos canais (telegram, whatsapp, webchat).

**Message:** Mensagem individual dentro de uma conversa. Pode ser texto, documento, foto, video ou audio.

**File:** Metadados de arquivos enviados. Armazena referencia ao S3 e resultados de classificacao.

---

## 6. Como Executar

### Pre-requisitos

- Docker e Docker Compose
- Terraform (>= 1.5.0)
- AWS CLI configurado
- Conta Telegram (para criar bot via @BotFather)
- MongoDB Atlas (ou instancia local)

### Configuracao

1. **Copie o arquivo de ambiente:**
   ```bash
   cp .env.example .env
   ```

2. **Configure as variaveis principais:**
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

| Comando | Descricao |
|---------|-----------|
| `make help` | Lista todos os comandos disponiveis |
| `make start all` | Inicia todos os servicos localmente |
| `make deploy s3` | Faz deploy do bucket S3 |
| `make deploy api` | Faz deploy da API Lambda |
| `make deploy classifier` | Faz deploy do classificador |
| `make logs api` | Visualiza logs da API |
| `make stop` | Para todos os servicos |

### Deploy Completo (Producao)

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
│   │   │   ├── controllers/    # Logica de negocio
│   │   │   ├── models/         # Schemas MongoDB
│   │   │   ├── repositories/   # Acesso a dados
│   │   │   ├── config/         # Configuracoes
│   │   │   ├── routes.ts       # Definicao de rotas
│   │   │   ├── lambda.ts       # Handler AWS Lambda
│   │   │   └── server.ts       # Servidor local
│   │   └── package.json
│   │
│   ├── classifier/             # Lambda classificador (Python)
│   │   └── src/
│   │       ├── handler.py      # Entry point Lambda
│   │       ├── bedrock.py      # Integracao AWS Bedrock
│   │       ├── mongodb.py      # Operacoes MongoDB
│   │       └── telegram.py     # Notificacoes Telegram
│   │
│   ├── n8n/
│   │   └── workflows/          # Workflows n8n
│   │       └── telegram.template.json
│   │
│   └── infrastructure/
│       └── terraform/          # Infraestrutura como codigo
│           ├── s3/             # Bucket S3
│           ├── api/            # Lambda API
│           ├── classifier/     # Lambda Classifier + SQS
│           ├── nlp/            # Lambda NLP
│           ├── validation/     # Lambda Validation
│           ├── n8n/            # EC2 para n8n
│           └── tf-state/       # Backend Terraform
│
├── scripts/                    # Scripts de automacao
│   ├── deploy.sh              # Deploy de infraestrutura
│   ├── start.sh               # Iniciar servicos
│   └── generate-workflow.sh   # Gerar workflow n8n
│
├── docs/
│   └── diagramas/             # Diagramas da arquitetura
│
├── docker-compose.yml         # Configuracao Docker
├── Makefile                   # Comandos make
├── .env.example               # Exemplo de variaveis
└── README.md                  # Documentacao principal
```

---

## Tecnologias Utilizadas

| Categoria | Tecnologia | Versao/Detalhes |
|-----------|------------|-----------------|
| **Backend** | TypeScript | - |
| **Framework** | Fastify | 5.5.0 |
| **Banco de Dados** | MongoDB | Atlas |
| **Orquestracao** | n8n | Latest |
| **IA/ML** | AWS Bedrock | Claude 3 Haiku |
| **Cloud** | AWS | sa-east-1 |
| **IaC** | Terraform | >= 1.5.0 |
| **Containers** | Docker | - |
| **Runtime (API)** | Node.js | 22.x |
| **Runtime (Classifier)** | Python | 3.11 |

---

## Conformidade e Seguranca

- **LGPD:** Dados processados na regiao `sa-east-1` (Sao Paulo)
- **Criptografia:** AES-256 para dados em repouso (S3)
- **Autenticacao:** API Key obrigatoria em todas as requisicoes
- **IAM:** Principio do menor privilegio para permissoes AWS
