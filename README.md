# FIAP - Faculdade de Informática e Administração Paulista

<p align="center">
<a href= "https://www.fiap.com.br/"><img src="https://raw.githubusercontent.com/lfusca/templateFiap/main/assets/logo-fiap.png" alt="FIAP - Faculdade de Informática e Administração Paulista" border="0" width=40% height=40%></a>
</p>

<br>

## Integrantes do Grupo e responsabilidades no projeto

- `RM559800` - [Jonas Felipe dos Santos Lima](https://www.linkedin.com/in/jonas-felipe-dos-santos-lima-b2346811b/)
- `RM560173` - [Gabriel Ribeiro](https://www.linkedin.com/in/ribeirogab/)
- `RM559926` - [Marcos Trazzini](https://www.linkedin.com/in/mstrazzini/)
- `RM559645` - [Edimilson Ribeiro](https://www.linkedin.com/in/edimilson-ribeiro/)

## Professores

### Coordenador(a)

- [André Godoi](https://www.linkedin.com/in/profandregodoi/)

---

## Introdução

A YOUVISA é uma empresa brasileira especializada em soluções digitais baseadas em **Inteligência Artificial, RPA e automação cognitiva** para otimizar processos consulares e de atendimento.

Este projeto foi desenvolvido como parte do **Challenge YOUVISA** na **FIAP**. A **Sprint 3** evolui o sistema para uma **plataforma inteligente de acompanhamento de processos de visto**, adicionando gestão completa de processos com máquina de estados, notificações automáticas via Telegram, consulta de status pelo chatbot e guardrails de governança de IA.

O sistema cobre o ciclo completo de atendimento — desde o recebimento e classificação de documentos com IA até o acompanhamento do processo de visto pelo cliente e pelo operador, com notificações em tempo real a cada mudança de status.

---

## Vídeo Demonstrativo

*Link do vídeo será adicionado em breve.*

---

## Objetivos da Sprint 3

- Implementar gestão de processos de visto com máquina de estados finitos
- Notificar automaticamente o cliente via Telegram a cada mudança de status
- Permitir consulta de status do processo pelo chatbot com guardrails de governança
- Construir interface de acompanhamento com timeline visual no Console do Operador
- Classificar documentos com IA e associá-los automaticamente ao processo

---

## O que o Sistema Faz

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

## Arquitetura

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
| **NLP Lambda** | Processa mensagens de texto com IA conversacional |
| **MongoDB** | Banco de dados para persistência |
| **AWS S3** | Armazenamento de documentos |
| **SQS** | Fila de mensagens para processamento assíncrono |
| **Classifier Lambda** | Classifica documentos usando IA |
| **AWS Bedrock** | Serviço de IA (modelo Claude 3 Haiku) |
| **Frontend** | Console do operador para gerenciamento de conversas |

---

## Componentes

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
+-- {file_id}_{timestamp}_{nome_original}
```

Os arquivos são armazenados diretamente na raiz do bucket, com nome único composto pelo ID do arquivo, timestamp e nome original.

---

### 3.4 NLP (Processador de Linguagem Natural)

**Localização:** `app/nlp/`

**Propósito:** Processar mensagens de texto dos usuários usando IA conversacional, gerenciar o fluxo de coleta de informações e transferência para atendentes humanos.

**Tecnologias:**

- Python 3.11
- AWS Bedrock (Claude 3 Haiku)
- boto3 (SDK AWS)
- pymongo (MongoDB)

**Funcionalidades:**

| Funcionalidade | Descrição |
|----------------|-----------|
| **Coleta de Email** | Solicita e extrai email do usuário quando necessário |
| **Detecção de Intenção** | Identifica se usuário quer falar com humano, enviar documento, etc. |
| **Transferência** | Transfere conversa para atendente humano quando solicitado |
| **Contexto** | Mantém histórico de mensagens para respostas contextualizadas |

**Estados da Conversa:**

```
+--------+     Email fornecido     +--------+
|  NOVO  | ----------------------> | PRONTO |
+--------+                         +--------+
    |                                  |
    | Aguardando email                 | Usuário pede humano
    v                                  v
+------------------+            +-------------+
| AGUARDANDO_EMAIL |            | TRANSFERRED |
+------------------+            +-------------+
```

**Fluxo de Processamento:**

```
+-------------+     +-------------+     +-------------+
|             |     |             |     |             |
|  Recebe     |---->|  Verifica   |---->|  Processa   |
|  mensagem   |     |  contexto   |     |  com Claude |
|             |     |  (email,    |     |             |
|             |     |  estado)    |     |             |
+-------------+     +-------------+     +-------------+
                                               |
                                               v
+-------------+     +-------------+     +-------------+
|             |     |             |     |             |
|  Retorna    |<----|  Atualiza   |<----|  Extrai     |
|  resposta   |     |  estado     |     |  intenção   |
|             |     |             |     |             |
+-------------+     +-------------+     +-------------+
```

---

### 3.5 Frontend (Console do Operador)

**Localização:** `app/frontend/`

**Propósito:** Interface web para operadores/atendentes gerenciarem conversas, visualizarem documentos e acompanharem estatísticas.

**Tecnologias:**

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui (componentes)

**Páginas do Dashboard:**

| Página | Rota | Funcionalidade |
|--------|------|----------------|
| **Dashboard** | `/dashboard` | Visao geral com estatisticas |
| **Documentos** | `/dashboard/documents` | Visualizar documentos classificados |
| **Processos** | `/dashboard/processes` | Acompanhamento de processos de visto |
| **Processos Detalhe** | `/dashboard/processes/[id]` | Timeline, historico e mudanca de status |
| **Conversas** | `/dashboard/conversations` | Gerenciar conversas e transferencias |
| **Usuarios** | `/dashboard/users` | Lista de usuarios cadastrados |

**Funcionalidade de Transferência:**

O console permite que operadores:

1. Visualizem conversas transferidas (status `transferred`)
2. Devolvam conversas para o bot (status `active`)
3. Acompanhem o histórico de mensagens

```
+-------------------+
|  Lista Conversas  |
|                   |
| [Ativas]          |
| - Conversa 1      |
| - Conversa 2      |
|                   |
| [Transferidas]    |  <-- Destaque para atendente
| - Conversa 3      |
|   [Voltar p/ Bot] |  <-- Botão para devolver
+-------------------+
```

**Autenticação:** Utiliza header `x-api-key` para comunicação com a API.

---

### 3.6 Infraestrutura AWS

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

## Modelo de Dados

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
| email            |       | metadata         |       | timestamp        |
| email_updated_at |       | created_at       |       | metadata         |
| created_at       |       | updated_at       |       | created_at       |
| updated_at       |       +------------------+       +------------------+
+------------------+
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

+------------------+       +------------------+
|      User        |<------| Process (Sprint 3)|
+------------------+       +------------------+
                           | _id              |
                           | user_id (FK)     |
                           | conversation_id  |
                           | visa_type        |
                           | destination_country|
                           | status           |
                           | status_history[] |
                           | documents[] (FK) |
                           | notes            |
                           | created_at       |
                           | updated_at       |
                           +------------------+
```

### Descrição das Entidades

**User:** Representa um usuário do sistema, vinculado ao Telegram. Armazena email coletado pelo bot para contato futuro.

**Conversation:** Uma conversa entre usuário e sistema. Suporta múltiplos canais (telegram, whatsapp, webchat). O campo `status` pode ser: `active` (bot respondendo), `transferred` (atendente humano), `resolved` ou `closed`. O campo `metadata.state` controla o fluxo do NLP (NOVO, AGUARDANDO_EMAIL, PRONTO).

**Message:** Mensagem individual dentro de uma conversa. Pode ser texto, documento, foto, vídeo ou áudio.

**File:** Metadados de arquivos enviados. Armazena referencia ao S3 e resultados de classificacao.

**Process (Sprint 3):** Representa uma solicitacao de visto. Possui maquina de estados finitos (`recebido` -> `em_analise` -> `aprovado` -> `finalizado`), com historico completo de transicoes. Cada processo pode ter multiplos documentos associados.

---

## Fluxos Principais

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

### 4.3 Fluxo de Transferência para Atendente Humano

Quando o usuário solicita falar com um atendente humano, o sistema transfere a conversa:

```
Usuário              Bot                  MongoDB              Console Operador
   |                  |                      |                        |
   | "quero humano"   |                      |                        |
   |----------------->|                      |                        |
   |                  |  status=transferred  |                        |
   |                  |--------------------->|                        |
   |                  |                      |                        |
   | "Transferido!"   |                      |                        |
   |<-----------------|                      |                        |
   |                  |                      |                        |
   |                  |                      |  Conversa aparece      |
   |                  |                      |  em "Transferidas"     |
   |                  |                      |----------------------->|
   |                  |                      |                        |
   | (novas msgs)     |                      |                        |
   |----------------->|  Bot NÃO responde    |                        |
   |                  |  (skip_response)     |                        |
   |                  |                      |                        |
   |                  |                      |  [Voltar p/ Bot]       |
   |                  |                      |<-----------------------|
   |                  |                      |                        |
   |                  |                      |  status=active         |
   |                  |                      |                        |
   | (nova msg)       |                      |                        |
   |----------------->|  Bot responde        |                        |
   |<-----------------|  normalmente         |                        |
```

**Comportamento:**

1. Usuário diz "quero falar com atendente" ou similar
2. NLP detecta intent `want_human` e atualiza status para `transferred`
3. Bot envia mensagem de confirmação e PARA de responder
4. Conversa aparece no Console do Operador na seção "Transferidas"
5. Operador pode devolver conversa para o bot clicando "Voltar para Bot"

---

### 4.4 Notificação ao Usuário

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

## Tecnologias Utilizadas

| Categoria | Tecnologia | Versão/Detalhes |
|-----------|------------|-----------------|
| **Backend** | TypeScript | - |
| **Framework API** | Fastify | 5.5.0 |
| **Frontend** | Next.js | 15 (App Router) |
| **UI Components** | shadcn/ui | - |
| **Estilização** | Tailwind CSS | 4.0 |
| **Banco de Dados** | MongoDB | Atlas |
| **Orquestração** | n8n | Latest |
| **IA/ML** | AWS Bedrock | Claude 3 Haiku |
| **Cloud** | AWS | sa-east-1 |
| **IaC** | Terraform | >= 1.5.0 |
| **Containers** | Docker | - |
| **Runtime (API)** | Node.js | 22.x |
| **Runtime (NLP/Classifier)** | Python | 3.11 |

---

## Como Executar

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
| `make logs nlp` | Visualiza logs do NLP |
| `make stop` | Para todos os serviços |

### Executar Frontend Localmente

```bash
cd app/frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:3000`.

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

## Estrutura do Projeto

```
youvisa/
+-- app/
|   +-- api/                    # Backend API (TypeScript/Fastify)
|   |   +-- src/
|   |   |   +-- controllers/    # Lógica de negócio
|   |   |   +-- models/         # Schemas MongoDB
|   |   |   +-- repositories/   # Acesso a dados
|   |   |   +-- config/         # Configurações
|   |   |   +-- routes.ts       # Definição de rotas
|   |   |   +-- lambda.ts       # Handler AWS Lambda
|   |   |   +-- server.ts       # Servidor local
|   |   +-- package.json
|   |
|   +-- classifier/             # Lambda classificador (Python)
|   |   +-- src/
|   |       +-- handler.py      # Entry point Lambda
|   |       +-- bedrock.py      # Integração AWS Bedrock
|   |       +-- mongodb.py      # Operações MongoDB
|   |       +-- telegram.py     # Notificações Telegram
|   |
|   +-- nlp/                    # Lambda NLP conversacional (Python)
|   |   +-- src/
|   |       +-- handler.py      # Entry point Lambda
|   |       +-- bedrock.py      # Integração AWS Bedrock
|   |       +-- mongodb.py      # Operações MongoDB
|   |       +-- prompts.py      # Prompts do sistema
|   |
|   +-- frontend/               # Console do Operador (Next.js)
|   |   +-- src/
|   |   |   +-- app/            # App Router (páginas)
|   |   |   |   +-- dashboard/  # Páginas do dashboard
|   |   |   |   +-- layout.tsx  # Layout principal
|   |   |   +-- components/     # Componentes React
|   |   |   |   +-- ui/         # shadcn/ui
|   |   |   |   +-- layout/     # Header, Sidebar, etc.
|   |   |   +-- lib/            # Utilitários e API client
|   |   +-- package.json
|   |
|   +-- n8n/
|   |   +-- workflows/          # Workflows n8n
|   |       +-- telegram.template.json
|   |
|   +-- infrastructure/
|       +-- terraform/          # Infraestrutura como código
|           +-- s3/             # Bucket S3
|           +-- api/            # Lambda API
|           +-- classifier/     # Lambda Classifier + SQS
|           +-- nlp/            # Lambda NLP
|           +-- validation/     # Lambda Validation
|           +-- n8n/            # EC2 para n8n
|           +-- tf-state/       # Backend Terraform
|
+-- scripts/                    # Scripts de automação
|   +-- deploy.sh              # Deploy de infraestrutura
|   +-- start.sh               # Iniciar serviços
|   +-- generate-workflow.sh   # Gerar workflow n8n
|
+-- docs/
|   +-- diagramas/             # Diagramas da arquitetura
|
+-- docker-compose.yml         # Configuração Docker
+-- Makefile                   # Comandos make
+-- .env.example               # Exemplo de variáveis
+-- README.md                  # Documentação principal
```

---

## Conformidade e Segurança

- **LGPD:** Dados processados na região `sa-east-1` (São Paulo)
- **Criptografia:** AES-256 para dados em repouso (S3)
- **Autenticação:** API Key obrigatória em todas as requisições
- **IAM:** Princípio do menor privilégio para permissões AWS

---

## Indicadores de Sucesso

**IMPORTANTE**: Os indicadores a seguir foram estimados, apenas a título de exemplificar áreas de ganho com o projeto, pois não obtivemos acesso aos indicadores reais da empresa. De qualquer forma, é possível adaptá-los à realidade da YOUVISA.

| Métrica | Antes  | Depois | Variação |
|---------|--------|--------|----------|
| Tempo médio de atendimento | 35 min | 12 min | -65 % |
| Retrabalho documental | 18 % | < 5 % | -72 % |
| Custo por lead | R$ 100 | R$ 65 | -R$35 |
| Conversão para cliente | 22 % | 38 % | +16 p.p. |
| NPS médio | 70 | 90 | +20 pts |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Erro semântico do NLP | Médio | Fallback humano + retraining contínuo |
| Falha de canal (API WA/Telegram) | Alto | Failover n8n + logs automáticos |
| Vazamento de dados | Crítico | Criptografia + IAM + DLP + auditoria |
| Resistência da equipe | Médio | Treinamento e onboarding progressivo |
| Sobrecarga de fluxos | Médio | Escalabilidade cloud (EKS/Fargate) |

---

## Sprint 3: Acompanhamento de Processos

A Sprint 3 evolui o sistema para uma **plataforma inteligente de acompanhamento de processos de visto**, adicionando visibilidade ao cliente e ao time interno sobre o andamento das solicitacoes.

### Fluxo de Status do Processo

```
                    +-------------+
                    |  recebido   |
                    +------+------+
                           |
                           v
                    +------+------+
             +----->| em_analise  |<-----+
             |      +------+------+      |
             |             |             |
             |     +-------+-------+     |
             |     |       |       |     |
             |     v       v       v     |
         +---+---+ +------+ +-----+--+  |
         |pendente| |aprova| |rejeita |  |
         |_docs   | |do    | |do      |  |
         +--------+ +--+---+ +--------+  |
                        |                 |
                        v                 |
                  +-----+------+          |
                  | finalizado |          |
                  +------------+          |
                                          |
                  +------------+          |
                  | cancelado  |<---------+
                  +------------+   (de qualquer estado nao-final)
```

### Endpoints de Processos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/processes` | Criar processo |
| GET | `/processes` | Listar com filtros (`?status=`, `?user_id=`, `?visa_type=`) |
| GET | `/processes/:id` | Detalhe do processo |
| GET | `/processes/:id/history` | Historico de transicoes |
| GET | `/processes/user/:userId` | Processos por usuario |
| GET | `/processes/telegram/:telegramId` | Processos por Telegram ID |
| POST | `/processes/:id/status` | Mudar status (body: `{status, reason, changed_by?}`) |
| POST | `/processes/:id/documents` | Associar documento ao processo |

### Notificacoes Automaticas

Quando um atendente altera o status de um processo, o sistema:
1. Valida a transicao (FSM)
2. Registra no historico
3. Dispara webhook para n8n
4. n8n gera mensagem deterministica e envia via Telegram

### Consulta de Status via Chatbot

O usuario pode perguntar "qual o status do meu processo?" e o bot responde com dados reais do MongoDB. Guardrails de governanca impedem que o bot:
- Informe prazos especificos
- Confirme aprovacao sem dados
- Tome decisoes institucionais

### Console do Operador - Processos

Novas paginas no dashboard:
- **Listagem**: tabela com filtros por status e tipo de visto
- **Detalhe**: timeline visual, historico de transicoes, documentos associados, formulario de mudanca de status

### Diagrama de Fluxo de Estados

O diagrama completo esta disponivel em `docs/diagramas/fluxo_estados_processo.png`.

### Relatorio Tecnico

Disponivel em `docs/RELATORIO_SPRINT_3.md`.

---

## Conclusao

A Sprint 2 do projeto YOUVISA consolida a implementação de uma plataforma de atendimento multicanal inteligente, unindo:

- **Chatbot funcional** via Telegram com orquestração n8n
- **Pipeline de automação** para recebimento e classificação de documentos
- **IA Generativa** (Claude 3 Haiku) para classificação e NLP conversacional
- **Visão Computacional** para validação de qualidade de imagem
- **Console do Operador** em React/Next.js para gerenciamento de conversas
- **Transferência humana** quando o usuário solicita atendente

O sistema demonstra a viabilidade de automatizar processos consulares com IA, reduzindo tempo de atendimento e mantendo a opção de escalação para atendimento humano quando necessário.

A arquitetura serverless na AWS (Lambda, S3, SQS) garante escalabilidade e conformidade com LGPD, enquanto o n8n proporciona flexibilidade para evolução dos fluxos de automação.
