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
|  documento via   |     |  e armazena no   |     |  o documento e   |
|  Telegram        |     |  AWS S3          |     |  associa ao      |
|                  |     |                  |     |  processo         |
+------------------+     +------------------+     +------------------+
                                                         |
                                                         v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Operador muda   |---->|  Notificação     |---->|  Usuário consulta|
|  status no       |     |  automática via  |     |  status pelo     |
|  painel          |     |  Telegram        |     |  chatbot         |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
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
           | Classifica documento                          |
           v                                               |
    +------+------+         +-------------+                |
    |             |         |             |                |
    | Classifier  |-------->| Notificação |                |
    |   Lambda    |         |  Telegram   |                |
    |  (Python)   |         |             |                |
    +------+------+         +-------------+                |
           |                                               |
           | AWS Bedrock (Claude 3 Haiku)                  |
           |                                               |
    +------+------+                                        |
    |             |                                        |
    |  Webhook    |  Status mudou                          |
    |  n8n        |------> Notifica cliente via Telegram   |
    |             |                                        |
    +-------------+                                        |
                                                           |
    +-------------+                                        |
    |             |                                        |
    |  Console do |  Operador muda status do processo      |
    |  Operador   |----------------------------------------+
    |  (Next.js)  |
    |             |
    +-------------+
```

### Descrição dos Componentes

| Componente | Função |
|------------|--------|
| **Telegram** | Canal de comunicação com o usuário |
| **n8n** | Orquestra os fluxos entre componentes e dispara notificações |
| **API Lambda** | Backend que gerencia usuários, conversas, arquivos e processos |
| **NLP Lambda** | Processa mensagens de texto com IA conversacional e consulta de status |
| **MongoDB** | Banco de dados para persistência |
| **AWS S3** | Armazenamento de documentos |
| **Classifier Lambda** | Classifica documentos usando IA (Claude 3 Haiku) |
| **AWS Bedrock** | Serviço de IA (modelo Claude 3 Haiku) |
| **Frontend** | Console do operador para gerenciamento de conversas e processos |

---

## Componentes

### 3.1 Backend API

**Localização:** `app/api/`

**Propósito:** Gerenciar dados de usuários, conversas, mensagens, arquivos e processos de visto. Serve como ponto central de persistência e lógica de negócio do sistema.

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
- Gestão de processos de visto com máquina de estados finitos
- Validação de transições de status com histórico completo
- Disparo de webhook para notificações automáticas

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

**Propósito:** Orquestrar a comunicação entre Telegram, API e S3. Coordena fluxos de documentos, mensagens e notificações de status.

**Tecnologia:** n8n (plataforma de automação low-code)

**Workflows:**

| Workflow | Descrição |
|----------|-----------|
| **Telegram** | Recebe mensagens/documentos, processa com NLP/Classifier, responde ao usuário |
| **Notificação de Status** | Recebe webhook de mudança de status, gera mensagem e notifica cliente via Telegram |

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
|  Tem arquivo?    +-------> NÃO -------> Processa com NLP
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
|  Classifica com  |
|  IA (Classifier) |
+--------+---------+
         |
         v
+--------+---------+
|  Confirmação     |
|  ao usuário      |
+------------------+
```

**Workflow de Notificação de Status:**

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Webhook recebe  |---->|  Busca dados do  |---->|  Gera mensagem   |
|  mudança de      |     |  processo e do   |     |  determinística  |
|  status          |     |  usuário         |     |  (sem LLM)       |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                         |
                                                         v
                                                  +------------------+
                                                  |                  |
                                                  |  Envia via       |
                                                  |  Telegram        |
                                                  |                  |
                                                  +------------------+
```

**Exemplos de notificações:**

- *"Olá {nome}! Seus documentos estão sendo analisados."*
- *"Precisamos de documentos adicionais. Motivo: {motivo}."*
- *"Parabéns {nome}! Seu visto foi aprovado!"*

---

### 3.4 NLP (Processador de Linguagem Natural)

**Localização:** `app/nlp/`

**Propósito:** Processar mensagens de texto dos usuários usando IA conversacional, gerenciar o fluxo de coleta de informações, consulta de status de processos e transferência para atendentes humanos.

**Tecnologias:**

- Python 3.11
- AWS Bedrock (Claude 3 Haiku)
- boto3 (SDK AWS)
- pymongo (MongoDB)

**Funcionalidades:**

| Funcionalidade | Descrição |
|----------------|-----------|
| **Coleta de Email** | Solicita e extrai email do usuário quando necessário |
| **Detecção de Intenção** | Identifica se usuário quer falar com humano, enviar documento, consultar status, etc. |
| **Consulta de Status** | Busca processos do usuário no MongoDB e responde com dados reais |
| **Transferência** | Transfere conversa para atendente humano quando solicitado |
| **Contexto** | Mantém histórico de mensagens para respostas contextualizadas |

**Guardrails de Governança de IA:**

O sistema implementa regras rígidas para garantir respostas responsáveis:

- Nunca informa prazos específicos para conclusão do processo
- Nunca confirma aprovação sem que o status seja explicitamente "Aprovado"
- Nunca toma decisões institucionais (aprovar, rejeitar, cancelar)
- Usa apenas informações reais do banco de dados, nunca inventa dados
- Sugere contato com atendente humano para perguntas fora do escopo

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

---

### 3.5 Frontend (Console do Operador)

**Localização:** `app/frontend/`

**Propósito:** Interface web para operadores/atendentes gerenciarem conversas, visualizarem documentos, acompanharem processos de visto e monitorarem estatísticas.

**Tecnologias:**

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui (componentes)

**Páginas do Dashboard:**

| Página | Rota | Funcionalidade |
|--------|------|----------------|
| **Dashboard** | `/dashboard` | Visão geral com estatísticas de conversas, documentos e processos |
| **Documentos** | `/dashboard/documents` | Visualizar documentos classificados pela IA |
| **Processos** | `/dashboard/processes` | Listagem de processos com filtros por status e tipo de visto |
| **Detalhe do Processo** | `/dashboard/processes/[id]` | Timeline visual, histórico de transições e mudança de status |
| **Conversas** | `/dashboard/conversations` | Gerenciar conversas e transferências |
| **Usuários** | `/dashboard/users` | Lista de usuários cadastrados |

**Gestão de Processos:**

O console permite que operadores:

1. Visualizem todos os processos com filtros por status e tipo de visto
2. Acompanhem o progresso através de uma timeline visual
3. Alterem o status do processo (apenas transições válidas)
4. Consultem o histórico completo de transições
5. Visualizem documentos associados ao processo

**Funcionalidade de Transferência:**

O console permite que operadores:

1. Visualizem conversas transferidas (status `transferred`)
2. Devolvam conversas para o bot (status `active`)
3. Acompanhem o histórico de mensagens

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
| **Lambda (NLP)** | Processamento de linguagem natural (Python 3.11) |
| **SQS** | Fila para processamento assíncrono de documentos |
| **EC2** | Hospeda o n8n em produção |
| **IAM** | Gerencia permissões de acesso |

**Região:** `sa-east-1` (São Paulo) para conformidade com LGPD.

---

## Gestão de Processos de Visto

### Máquina de Estados Finitos

Cada processo de visto segue uma máquina de estados com transições validadas:

```
                    +-------------+
                    |  Recebido   |
                    +------+------+
                           |
                           v
                    +------+------+
             +----->| Em Análise  |<-----+
             |      +------+------+      |
             |             |             |
             |     +-------+-------+     |
             |     |       |       |     |
             |     v       v       v     |
         +---+----+ +-----++ +----+---+  |
         |Pendente | |Apro- | |Rejei-  |  |
         |de Docs  | |vado  | |tado    |  |
         +----+----+ +--+---+ +--------+  |
              |          |                 |
              +----------+                 |
                         |                 |
                         v                 |
                  +------+------+          |
                  | Finalizado  |          |
                  +-------------+          |
                                           |
                  +-------------+          |
                  | Cancelado   |<---------+
                  +-------------+   (de qualquer estado não-final)
```

**Transições válidas:**

| Estado Atual | Próximos Estados Possíveis |
|-------------|---------------------------|
| Recebido | Em Análise, Cancelado |
| Em Análise | Pendente de Documentos, Aprovado, Rejeitado, Cancelado |
| Pendente de Documentos | Em Análise, Cancelado |
| Aprovado | Finalizado, Cancelado |
| Rejeitado | *(estado final)* |
| Finalizado | *(estado final)* |
| Cancelado | *(estado final)* |

### Endpoints de Processos

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/processes` | Criar processo |
| GET | `/processes` | Listar com filtros (`?status=`, `?user_id=`, `?visa_type=`) |
| GET | `/processes/:id` | Detalhe do processo |
| GET | `/processes/:id/history` | Histórico de transições |
| GET | `/processes/user/:userId` | Processos por usuário |
| GET | `/processes/telegram/:telegramId` | Processos por Telegram ID |
| POST | `/processes/:id/status` | Mudar status (body: `{status, reason?, changed_by?}`) |
| POST | `/processes/:id/documents` | Associar documento ao processo |

### Notificações Automáticas

Quando um operador altera o status de um processo:

1. A API valida a transição pela máquina de estados
2. Registra a mudança no histórico do processo
3. Dispara webhook para o n8n
4. O n8n gera mensagem determinística (sem LLM) e envia via Telegram ao cliente

### Consulta de Status via Chatbot

O usuário pode perguntar *"qual o status do meu processo?"* e o bot responde com dados reais do MongoDB, respeitando os guardrails de governança.

### Timeline Visual

O Console do Operador exibe uma timeline visual do progresso de cada processo, com estados completos em verde, estado atual destacado e estados futuros em cinza.

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
+------------------+       +------------------+
|    Process       |       |      File        |
+------------------+       +------------------+
| _id              |       | _id              |
| user_id (FK)     |       | conversation_id  |
| conversation_id  |       | message_id       |
| visa_type        |       | file_id          |
| destination_     |       | s3_bucket        |
|   country        |       | s3_key           |
| status           |       | original_filename|
| status_history[] |       | file_size        |
| documents[] (FK) |------>| mime_type        |
| notes            |       | uploaded_at      |
| created_at       |       | metadata         |
| updated_at       |       | created_at       |
+------------------+       +------------------+
```

### Descrição das Entidades

**User:** Representa um usuário do sistema, vinculado ao Telegram. Armazena email coletado pelo bot para contato futuro.

**Conversation:** Uma conversa entre usuário e sistema. Suporta múltiplos canais (telegram, whatsapp, webchat). O campo `status` pode ser: `active` (bot respondendo), `transferred` (atendente humano), `resolved` ou `closed`. O campo `metadata.state` controla o fluxo do NLP (NOVO, AGUARDANDO_EMAIL, PRONTO).

**Message:** Mensagem individual dentro de uma conversa. Pode ser texto, documento, foto, vídeo ou áudio.

**File:** Metadados de arquivos enviados. Armazena referência ao S3 e resultados de classificação pela IA.

**Process:** Representa uma solicitação de visto. Possui máquina de estados finitos com transições validadas e histórico completo de mudanças de status. Cada processo pode ter múltiplos documentos associados.

---

## Fluxos Principais

### 4.1 Fluxo Completo: Envio de Documento

```
Usuário              Telegram            n8n                API               S3            Classifier         MongoDB
   |                    |                 |                  |                 |                |                |
   |  Envia documento   |                 |                  |                 |                |                |
   |------------------->|                 |                  |                 |                |                |
   |                    |  Webhook        |                  |                 |                |                |
   |                    |---------------->|                  |                 |                |                |
   |                    |                 |                  |                 |                |                |
   |                    |                 |  POST /users     |                 |                |                |
   |                    |                 |----------------->|                 |                |                |
   |                    |                 |                  |                 |                |                |
   |                    |                 |  POST /conversations               |                |                |
   |                    |                 |----------------->|                 |                |                |
   |                    |                 |                  |                 |                |                |
   |                    |                 |  Upload arquivo  |                 |                |                |
   |                    |                 |---------------------------------->|                |                |
   |                    |                 |                  |                 |                |                |
   |                    |                 |  Classifica documento              |                |                |
   |                    |                 |-------------------------------------------------->|                |
   |                    |                 |                  |                 |                |                |
   |                    |                 |                  |                 |                |  Classifica    |
   |                    |                 |                  |                 |                |  (Bedrock)     |
   |                    |                 |                  |                 |                |                |
   |                    |                 |                  |                 |                |  Salva result  |
   |                    |                 |                  |                 |                |--------------->|
   |                    |                 |                  |                 |                |                |
   |  Notificação       |                 |                  |                 |                |                |
   |<-------------------|<----------------|                  |                 |                |                |
   |                    |                 |                  |                 |                |                |
```

### 4.2 Fluxo: Mudança de Status com Notificação

```
Operador             Console             API               n8n               Telegram         Usuário
   |                    |                 |                  |                 |                |
   |  Muda status       |                 |                  |                 |                |
   |------------------->|                 |                  |                 |                |
   |                    |  POST /status   |                  |                 |                |
   |                    |---------------->|                  |                 |                |
   |                    |                 |  Valida FSM      |                 |                |
   |                    |                 |  Salva histórico |                 |                |
   |                    |                 |                  |                 |                |
   |                    |                 |  Webhook         |                 |                |
   |                    |                 |----------------->|                 |                |
   |                    |                 |                  |  Gera mensagem  |                |
   |                    |                 |                  |  determinística |                |
   |                    |                 |                  |                 |                |
   |                    |                 |                  |  sendMessage    |                |
   |                    |                 |                  |---------------->|                |
   |                    |                 |                  |                 |  Notificação   |
   |                    |                 |                  |                 |--------------->|
   |                    |                 |                  |                 |                |
```

### 4.3 Classificação com IA

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

### 4.4 Fluxo de Transferência para Atendente Humano

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

### 4.5 Notificação ao Usuário

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

   # Notificações (n8n)
   N8N_STATUS_WEBHOOK_URL=http://localhost:5678/webhook/status-change
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
|   |   |   +-- controllers/    # Lógica de negócio (users, conversations, files, processes)
|   |   |   +-- models/         # Schemas MongoDB (incluindo Process com FSM)
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
|   |       +-- bedrock.py      # Integração AWS Bedrock (com consulta de processos)
|   |       +-- mongodb.py      # Operações MongoDB (incluindo busca de processos)
|   |       +-- prompts.py      # Prompts do sistema (com guardrails de governança)
|   |
|   +-- frontend/               # Console do Operador (Next.js)
|   |   +-- src/
|   |   |   +-- app/            # App Router (páginas)
|   |   |   |   +-- dashboard/  # Páginas do dashboard
|   |   |   |   |   +-- processes/  # Gestão de processos
|   |   |   |   +-- layout.tsx  # Layout principal
|   |   |   +-- components/     # Componentes React
|   |   |   |   +-- ui/         # shadcn/ui
|   |   |   |   +-- layout/     # Header, Sidebar, etc.
|   |   |   |   +-- process-timeline.tsx  # Timeline visual
|   |   |   +-- lib/            # Utilitários e API client
|   |   +-- package.json
|   |
|   +-- n8n/
|   |   +-- workflows/          # Workflows n8n
|   |       +-- telegram.template.json
|   |       +-- status-notification.template.json
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
|   +-- RELATORIO_SPRINT_3.md  # Relatório técnico da Sprint 3
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
- **Governança de IA:** Guardrails impedem que o LLM invente dados ou tome decisões institucionais

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
| Erro semântico do NLP | Médio | Guardrails de governança + fallback humano |
| Falha de canal (API WA/Telegram) | Alto | Failover n8n + logs automáticos |
| Vazamento de dados | Crítico | Criptografia + IAM + DLP + auditoria |
| Resistência da equipe | Médio | Treinamento e onboarding progressivo |
| Sobrecarga de fluxos | Médio | Escalabilidade cloud (EKS/Fargate) |
| IA inventar informações | Alto | Guardrails de governança + dados reais do MongoDB |

---

## Conclusão

A Sprint 3 do projeto YOUVISA consolida a evolução da plataforma para uma solução completa de acompanhamento de processos de visto, unindo:

- **Gestão de processos** com máquina de estados finitos e transições validadas
- **Notificações automáticas** via Telegram a cada mudança de status
- **Consulta de status pelo chatbot** com guardrails de governança de IA
- **Timeline visual** para acompanhamento do progresso de cada solicitação
- **Classificação de documentos** com IA e associação automática ao processo
- **Console do Operador** completo para gerenciar conversas, documentos e processos
- **Chatbot funcional** via Telegram com IA conversacional (Claude 3 Haiku)
- **Transferência humana** quando o usuário solicita atendente

O sistema demonstra a viabilidade de automatizar processos consulares com IA de forma responsável, mantendo controle humano sobre decisões institucionais e fornecendo visibilidade completa ao cliente sobre o andamento de sua solicitação.

A arquitetura serverless na AWS (Lambda, S3, SQS) garante escalabilidade e conformidade com LGPD, enquanto o n8n proporciona flexibilidade para evolução dos fluxos de automação.
