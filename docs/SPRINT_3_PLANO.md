# Sprint 3 - Plano de Implementacao

## Estado Atual do Projeto (mapeamento completo)

### API Backend (`app/api/src/`)
- **Framework**: Fastify 5 + TypeScript + Mongoose + tsyringe (DI)
- **Execucao**: `server.ts` (local, porta 5555) e `lambda.ts` (AWS Lambda Node 22)
- **Autenticacao**: header `x-api-key` validado em `app.ts` (skip no /health)
- **Build**: tsup gera `dist/lambda.js` + `dist/server.js`; `package-lambda.sh` cria `dist.zip` + `nodejs-layer.zip`

**Modelos existentes:**
| Modelo | Campos principais | Status enum |
|--------|-------------------|-------------|
| User | telegram_id (unique), username, first_name, last_name, email, email_updated_at, is_bot | - |
| Conversation | user_id (ref User), channel (telegram/whatsapp/webchat), chat_id, status, metadata, last_message_at | active, transferred, resolved, closed |
| Message | conversation_id, message_id, user_id, text, message_type, direction (incoming/outgoing), timestamp, metadata | - |
| File | conversation_id, message_id, file_id, s3_bucket, s3_key, original_filename, file_size, mime_type, uploaded_at, metadata | - |

**Endpoints existentes:**
- `GET /health`
- Users: `POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `POST /users/upsert/:telegramId`, `DELETE /users/:id`
- Conversations: `POST /conversations`, `GET /conversations?status=&channel=`, `GET /conversations/:id`, `PUT /conversations/:id`, `POST /conversations/upsert`
- Messages: `POST /messages`, `GET /messages?conversation_id=&message_type=`, `GET /messages/:id`
- Files: `POST /files`, `GET /files?conversation_id=`, `GET /files/:id`

**Container DI (`container.ts`):** Registra EnvConfig, LoggerConfig, DatabaseConfig, FastifyConfig + 4 repos + 4 controllers como singletons.

### Lambdas Python (ja deployados na AWS)

**NLP Lambda (`app/nlp/dist/`):**
- Trigger: HTTP POST via Lambda Function URL (chamado pelo n8n)
- Usa **AWS Bedrock Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
- Intents: greeting, provide_email, want_human, send_document, general, transferred
- Estados de conversa: NOVO -> AGUARDANDO_EMAIL -> PRONTO
- Armazenado em `conversation.metadata.state`
- Se conversation.status == 'transferred', retorna `skip_response: true`
- Se intent == 'want_human', muda conversation.status para 'transferred'
- Extrai email do texto e salva no user
- MongoDB: lê users, conversations (por chat_id), messages (ultimas 10)
- Env vars: MONGODB_URI, MONGODB_DATABASE, BEDROCK_REGION (us-east-1), API_KEY

**Classifier Lambda (`app/classifier/dist/`):**
- Trigger: S3 ObjectCreated -> SQS -> Lambda (event-driven)
- Usa **Bedrock Claude 3 Haiku Vision** para classificar documentos
- Tipos: Passaporte, RG, Comprovante, Formulario, Documento invalido
- Atualiza `files` collection: document_type, classification_confidence, classification_status='completed'
- Envia notificacao via Telegram Bot API (urllib, nao requests)
- Mensagem diferente para invalido vs valido
- MongoDB: files (update), conversations (read por file), messages (save bot msg)
- Env vars: MONGODB_URI, MONGODB_DATABASE, BEDROCK_REGION, TELEGRAM_BOT_TOKEN

**Validation Lambda (`app/validation/dist/`):**
- Trigger: HTTP POST via Lambda Function URL (chamado pelo n8n antes do upload)
- Usa OpenCV para validar qualidade da imagem
- Checks: formato valido, dimensoes >= 400x400, blur score >= 100, brightness 40-220
- Retorna: { valid: bool, reason: string, details: {...} }
- Sem env vars obrigatorias

### Workflow n8n (`app/n8n/workflows/telegram.template.json`)

Fluxo COMPLETO atual (21 nodes):
```
Telegram Trigger
  -> Upsert User (POST /users/upsert/{telegram_id})
  -> Upsert Conversation (POST /conversations/upsert)
  -> Check if Transferred?
     |-- SIM -> Save Message Only (POST /messages) [fim]
     |-- NAO -> Check if File Exists?
                |-- SIM (doc/photo) -> Get File from Telegram
                |   -> Extract Base64
                |   -> Validate Image (POST Lambda Validation)
                |   -> Check Validation?
                |      |-- VALIDO -> Prepare S3 Upload -> Upload to S3
                |      |   -> Save File Message (POST /messages)
                |      |   -> Save File Record (POST /files)
                |      |   -> Send File Confirmation (Telegram: "Documento recebido!")
                |      |   -> Save Bot Response File (POST /messages)
                |      |-- INVALIDO -> Send Validation Error (Telegram)
                |          -> Save Bot Response Validation (POST /messages)
                |-- NAO (texto) -> Save Text Message (POST /messages)
                    -> Process NLP (POST Lambda NLP)
                    -> Check Skip Response?
                       |-- NAO SKIP -> Send NLP Response (Telegram)
                       |   -> Save Bot Response (POST /messages)
                       |-- SKIP -> [fim]
```

Placeholders no template: `__API_URL__`, `__API_KEY__`, `__S3_BUCKET__`, `__VALIDATION_URL__`, `__NLP_URL__`
Script `generate-workflow.sh` substitui e gera `telegram.output.json`.

### Frontend (`app/frontend/`)
- **Framework**: Next.js 16, React 19, Tailwind 4, shadcn/ui
- **Auth**: Cookie `youvisa_session`, credenciais hardcoded `admin@admin.com`/`Teste1234`
- **Middleware**: Protege /dashboard/*, redireciona /login se autenticado
- **API client** (`lib/api.ts`): fetchApi com x-api-key, API_URL from env

**Paginas existentes:**
| Rota | Tipo | O que faz |
|------|------|-----------|
| `/` | Server | Redirect para /dashboard ou /login |
| `/login` | Client | Form de login |
| `/dashboard` | Server | Stats: total users, conversations, files, classificados, distribuicao por tipo, docs recentes |
| `/dashboard/conversations` | Client | Lista conversas, badge por status, acao "Return to Bot" para transferred |
| `/dashboard/documents` | Server | Lista files com classificacao, confidence%, tamanho |
| `/dashboard/users` | Server | Lista users com telegram_id, tipo bot/user |

**Sidebar:** Dashboard, Documentos, Conversas, Usuarios

**Conversations actions.ts:**
- `fetchConversations()` - server action que chama getConversations()
- `setConversationStatus(id, status)` - server action que chama updateConversation()

### Docker Compose
- **api**: porta 5555, monta ./app/api, npm run dev
- **n8n**: porta 5678, n8nio/n8n:latest, volumes docker/n8n e app/n8n/workflows
- **ocr**: porta 5556, watch dir, mock textract (nao implementado de fato)

### Scripts
- `start.sh`: api (docker build+up), n8n (ngrok + docker up), ocr, all
- `stop.sh`: docker-compose stop + pkill ngrok
- `deploy.sh`: terraform para tf-state, s3, api, validation, classifier, nlp, n8n, all
- `generate-workflow.sh`: substitui placeholders no template e gera output.json

---

## O que a Sprint 3 pede vs o que ja existe

| Requisito | Existe? | O que falta |
|-----------|---------|-------------|
| Maquina de estados de processo (recebido, em_analise, pendente, aprovado, finalizado) | NAO | Criar model Process, repository, controller, rotas |
| Historico auditavel de transicoes | NAO | Campo status_history no Process, log de cada transicao |
| Chatbot responde "qual o status?" | PARCIAL - NLP Lambda processa texto mas nao sabe de processos | Adicionar intent "status_query" no NLP Lambda, consultar processos do usuario |
| Notificacoes automaticas por mudanca de status | NAO | Workflow n8n para disparar msg no Telegram quando status muda |
| IA Generativa traduz status em linguagem simples | PARCIAL - Bedrock Claude ja integrado | Expandir prompt do NLP para responder sobre status de processo |
| Interface web com timeline de status | NAO | Pagina /dashboard/processes e /dashboard/processes/[id] |
| Guardrails de governanca | PARCIAL - prompt ja tem regras basicas | Adicionar regras: nao dar prazos, nao aprovar, msgs pre-aprovadas |
| Extracao de info de documentos | JA EXISTE - Classifier classifica, Validation valida | Conectar classificacao ao processo |

---

## Plano de Implementacao

### Fase 1: Model Process + Maquina de Estados (Backend)

**Criar:**
- `app/api/src/models/process.model.ts`

```
Process {
  user_id: ObjectId (ref User, required, indexed)
  conversation_id: ObjectId (ref Conversation, optional)
  visa_type: string enum [turismo, trabalho, estudante, residencia, transito] (required)
  destination_country: string (required)
  status: string enum [recebido, em_analise, pendente_documentos, aprovado, rejeitado, finalizado, cancelado] (default: recebido, indexed)
  status_history: [{
    from_status: string
    to_status: string
    reason: string
    changed_by: string (default: 'system')
    timestamp: Date (default: Date.now)
  }]
  documents: [ObjectId] (ref File)
  notes: string (optional)
  created_at: Date
  updated_at: Date
}
```

Transicoes validas (maquina de estados finitos):
```
recebido          -> em_analise, cancelado
em_analise        -> pendente_documentos, aprovado, rejeitado, cancelado
pendente_documentos -> em_analise, cancelado
aprovado          -> finalizado, cancelado
rejeitado         -> (estado final)
finalizado        -> (estado final)
cancelado         -> (estado final)
```

- `app/api/src/repositories/process.repository.ts`
  - create, findById, findByUserId, findAll(filters), findByTelegramId(telegramId)
  - updateStatus(id, newStatus, reason, changedBy) - VALIDA transicao antes de mudar
  - addDocument(processId, fileId)
  - getStatusHistory(id)

- `app/api/src/controllers/process.controller.ts`
  - create, getById, getAll, getByUserId, getByTelegramId, updateStatus, addDocument, getStatusHistory

**Modificar:**
- `app/api/src/models/index.ts` - exportar ProcessModel
- `app/api/src/repositories/index.ts` - exportar ProcessRepository
- `app/api/src/controllers/index.ts` - exportar ProcessController
- `app/api/src/container.ts` - registrar ProcessRepository + ProcessController
- `app/api/src/routes.ts` - adicionar rotas:
  - `POST /processes` - criar
  - `GET /processes` - listar (?status=, ?user_id=, ?visa_type=)
  - `GET /processes/:id` - detalhe
  - `GET /processes/:id/history` - historico
  - `GET /processes/user/:userId` - por user
  - `GET /processes/telegram/:telegramId` - por telegram_id (o NLP precisa disso)
  - `POST /processes/:id/status` - mudar status (body: {status, reason, changed_by?})
  - `POST /processes/:id/documents` - associar documento (body: {file_id})

### Fase 2: Notificacoes Automaticas (n8n workflow)

**Criar:**
- `app/n8n/workflows/status-notification.template.json`

Fluxo:
```
[Webhook Trigger] (POST /webhook/status-change)
  -> recebe: { process_id, user_id, old_status, new_status, reason }
  -> [HTTP: GET processo] (GET /processes/{process_id})
  -> [HTTP: GET usuario] (GET /users/{user_id})
  -> [HTTP: GET conversa do usuario] (GET /conversations?channel=telegram) para pegar chat_id
  -> [Code: Gerar mensagem] (mensagens pre-definidas por status, com fallback)
  -> [Telegram: Enviar notificacao] (sendMessage para o chat_id)
  -> [HTTP: Salvar mensagem] (POST /messages)
```

Mensagens pre-definidas (deterministicas, sem LLM necessario):
```
recebido -> em_analise:
  "Ola {nome}! Seus documentos para visto de {tipo} para {pais} foram recebidos e estao sendo analisados pela nossa equipe."

em_analise -> pendente_documentos:
  "Ola {nome}! Precisamos de documentos adicionais para seu processo de visto de {tipo} para {pais}. Motivo: {reason}. Por favor, envie os documentos solicitados."

em_analise -> aprovado:
  "Parabens {nome}! Seu processo de visto de {tipo} para {pais} foi aprovado! Em breve voce recebera instrucoes sobre os proximos passos."

em_analise -> rejeitado:
  "Ola {nome}. Infelizmente seu processo de visto de {tipo} para {pais} nao foi aprovado neste momento. Recomendamos entrar em contato com nossa equipe para mais detalhes."

aprovado -> finalizado:
  "Ola {nome}! Seu processo de visto de {tipo} para {pais} foi finalizado com sucesso! Obrigado por utilizar a YOUVISA."

qualquer -> cancelado:
  "Ola {nome}. Seu processo de visto de {tipo} para {pais} foi cancelado. Motivo: {reason}. Entre em contato se precisar de mais informacoes."
```

**Modificar:**
- `app/api/src/controllers/process.controller.ts` - apos mudar status com sucesso, fazer HTTP POST para o webhook do n8n (`N8N_STATUS_WEBHOOK_URL`)
- `app/api/src/config/env.config.ts` - adicionar `N8N_STATUS_WEBHOOK_URL` (opcional, para nao quebrar se nao configurado)
- `.env.example` - adicionar `N8N_STATUS_WEBHOOK_URL`
- `scripts/generate-workflow.sh` - adicionar placeholder `__STATUS_WEBHOOK_URL__` se necessario

### Fase 3: Chatbot com Consulta de Status

**Modificar** o NLP Lambda (`app/nlp/dist/`) para:
1. Adicionar intent `status_query` no prompt (quando usuario pergunta sobre status/processo/andamento)
2. Quando intent == status_query:
   - Buscar processos do usuario via API: `GET /processes/telegram/{telegram_id}`
   - Gerar resposta com Bedrock usando dados reais do processo
   - Incluir guardrails no prompt

**Arquivos a modificar:**
- `app/nlp/dist/prompts.py` - Adicionar:
  - Intent `status_query` na lista
  - Novas instrucoes para consulta de status
  - Guardrails: nao dar prazos, nao aprovar, redirecionar duvidas complexas
- `app/nlp/dist/handler.py` - Quando intent == status_query:
  - Chamar API para buscar processos: `GET {API_URL}/processes/telegram/{telegram_id}`
  - Passar dados dos processos para o Bedrock gerar resposta
- `app/nlp/dist/bedrock.py` - Ajustar process() para aceitar dados de processo como contexto adicional

**Novo endpoint necessario na API:**
- `GET /processes/telegram/:telegramId` - busca user por telegram_id, depois busca processos do user

**Guardrails a adicionar no prompt:**
```
GUARDRAILS DE GOVERNANCA:
- NUNCA informe prazos especificos para conclusao do processo
- NUNCA confirme aprovacao a menos que o status do processo seja explicitamente "aprovado"
- NUNCA tome decisoes institucionais (aprovar, rejeitar, cancelar)
- Se o usuario fizer perguntas que voce nao pode responder, sugira falar com um atendente humano
- Use APENAS informacoes dos dados do processo fornecidos, NAO invente dados
- Para status "pendente_documentos", informe quais documentos estao associados ao processo
```

### Fase 4: Interface Web

**Criar:**
- `app/frontend/src/app/dashboard/processes/page.tsx` - Listagem de processos
  - Tabela: usuario, tipo de visto, pais, status (badge colorido), data
  - Filtros: status, tipo de visto
  - Link para detalhe

- `app/frontend/src/app/dashboard/processes/[id]/page.tsx` - Detalhe do processo
  - Dados do processo (tipo, pais, status)
  - Timeline visual do progresso (componente)
  - Historico de transicoes (tabela: data, de->para, motivo)
  - Documentos associados
  - Botao mudar status (dropdown com apenas transicoes validas do estado atual)
  - Form com motivo obrigatorio

- `app/frontend/src/app/dashboard/processes/actions.ts` - Server actions
  - fetchProcesses(filters?)
  - fetchProcess(id)
  - changeProcessStatus(id, status, reason)

- `app/frontend/src/components/process-timeline.tsx` - Componente de timeline
  - Barra visual: recebido -> em_analise -> pendente -> aprovado -> finalizado
  - Marca estado atual e estados completos
  - Se rejeitado/cancelado, mostra de forma diferente

**Modificar:**
- `app/frontend/src/lib/api.ts` - Adicionar:
  - Interface `Process` com todos os campos
  - `getProcesses(filters?)` -> GET /processes
  - `getProcess(id)` -> GET /processes/:id
  - `getProcessHistory(id)` -> GET /processes/:id/history
  - `updateProcessStatus(id, status, reason)` -> POST /processes/:id/status
  - Atualizar `getDashboardStats()` para incluir processos

- `app/frontend/src/components/layout/sidebar.tsx` - Adicionar link "Processos" com icone ClipboardList

- `app/frontend/src/app/dashboard/page.tsx` - Adicionar card "Total Processos" e "Processos por Status"

### Fase 5: Integracao n8n - Criacao automatica de processo

**Modificar workflow do Telegram** (`telegram.template.json`):

Apos o `Save File Record` (upload bem sucedido), adicionar nodes:
```
Save File Record
  -> [HTTP: Buscar processos do usuario] (GET /processes/telegram/{telegram_id}?status=recebido)
  -> [Code: Check se ja tem processo aberto]
     |-- SIM -> [HTTP: Associar documento] (POST /processes/{id}/documents)
     |-- NAO -> [HTTP: Criar processo] (POST /processes com visa_type='a_definir', destination_country='a_definir')
               -> [HTTP: Associar documento]
```

Isso garante que quando o usuario envia documento via Telegram, um processo e criado automaticamente (ou o documento e associado a um existente).

---

## Ordem de implementacao

1. **Fase 1** - Model Process + API (fundacao, sem dependencias)
2. **Fase 4** - Frontend processos (permite testar visualmente)
3. **Fase 2** - Notificacoes n8n (depende da Fase 1)
4. **Fase 3** - Chatbot status no NLP Lambda (depende da Fase 1)
5. **Fase 5** - Integracao automatica no workflow (depende de tudo)

---

## Resumo de arquivos

### Criar (8 arquivos):
| Arquivo | Descricao |
|---------|-----------|
| `app/api/src/models/process.model.ts` | Modelo Process com maquina de estados |
| `app/api/src/repositories/process.repository.ts` | Repository com validacao de transicao |
| `app/api/src/controllers/process.controller.ts` | Controller com disparo de webhook |
| `app/n8n/workflows/status-notification.template.json` | Workflow notificacao de status |
| `app/frontend/src/app/dashboard/processes/page.tsx` | Listagem de processos |
| `app/frontend/src/app/dashboard/processes/[id]/page.tsx` | Detalhe com timeline |
| `app/frontend/src/app/dashboard/processes/actions.ts` | Server actions |
| `app/frontend/src/components/process-timeline.tsx` | Componente timeline visual |

### Modificar (12 arquivos):
| Arquivo | O que muda |
|---------|-----------|
| `app/api/src/models/index.ts` | +export ProcessModel |
| `app/api/src/repositories/index.ts` | +export ProcessRepository |
| `app/api/src/controllers/index.ts` | +export ProcessController |
| `app/api/src/container.ts` | +registrar Process repo+controller |
| `app/api/src/routes.ts` | +8 rotas de processo |
| `app/api/src/config/env.config.ts` | +N8N_STATUS_WEBHOOK_URL |
| `app/frontend/src/lib/api.ts` | +interface Process, +funcoes API, +stats |
| `app/frontend/src/components/layout/sidebar.tsx` | +link Processos |
| `app/frontend/src/app/dashboard/page.tsx` | +cards de processos |
| `app/nlp/dist/prompts.py` | +intent status_query, +guardrails |
| `app/nlp/dist/handler.py` | +logica de consulta de status |
| `.env.example` | +N8N_STATUS_WEBHOOK_URL |

### Nao modificar (manter como esta):
- `app/nlp/dist/bedrock.py` - se possivel, passar contexto via prompt sem mudar a interface
- `app/classifier/dist/*` - nao precisa mudar, ja funciona
- `app/validation/dist/*` - nao precisa mudar
- Terraform modules - nao precisa mudar infra
- `docker-compose.yml` - nao precisa de novos servicos
- `Makefile` e scripts - nao precisam mudar

### Env var nova:
```
N8N_STATUS_WEBHOOK_URL=http://localhost:5678/webhook/status-change
```
