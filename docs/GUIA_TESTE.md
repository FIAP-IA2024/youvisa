# Guia de Teste - Integração Telegram + S3

Este documento fornece um passo a passo completo para testar a integração entre Telegram e AWS S3 via n8n.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [ ] Docker Desktop (ou Docker + Docker Compose)
- [ ] Terraform (versão >= 1.5.0)
- [ ] AWS CLI configurado
- [ ] ngrok instalado e configurado
- [ ] Conta no Telegram (aplicativo instalado no celular)
- [ ] Conta AWS ativa

## Verificação dos Pré-requisitos

Execute os comandos abaixo para confirmar que tudo está instalado:

```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar Terraform
terraform version

# Verificar AWS CLI
aws --version
aws sts get-caller-identity

# Verificar ngrok
ngrok version
```

Se algum comando falhar, instale a ferramenta correspondente antes de continuar.

### Instalar ngrok (se necessário)

```bash
# macOS
brew install ngrok

# Configurar token do ngrok
# 1. Crie conta em: https://dashboard.ngrok.com/signup
# 2. Copie seu token em: https://dashboard.ngrok.com/get-started/your-authtoken
# 3. Configure:
ngrok config add-authtoken SEU_TOKEN_AQUI
```

---

## Passo 1: Criar o Bot no Telegram

### 1.1. Abrir o BotFather

1. Abra o Telegram no seu celular ou computador
2. Na busca, digite: `@BotFather`
3. Clique no contato verificado (deve ter um checkmark azul)
4. Clique em "START" ou envie `/start`

### 1.2. Criar um Novo Bot

1. Envie o comando: `/newbot`

2. O BotFather perguntará o nome do bot. Digite:
   ```
   YOUVISA Test Assistant
   ```
   (Você pode usar qualquer nome)

3. O BotFather pedirá um username. Digite:
   ```
   youvisa_test_assistant_bot
   ```

   **IMPORTANTE**: O username deve:
   - Terminar com `_bot` ou `Bot`
   - Ser único (se já existir, tente outro)
   - Não conter espaços

4. Se der certo, você receberá uma mensagem com o **TOKEN**:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567
   ```

5. **COPIE ESSE TOKEN** e guarde em um lugar seguro (você vai precisar dele)

### 1.3. Testar o Bot

1. No Telegram, busque pelo username do seu bot (ex: `@youvisa_test_assistant_bot`)
2. Clique em "START"
3. O bot ainda não responde (normal), ele só ficará ativo depois que configurarmos o n8n

---

## Passo 2: Configurar Terraform

### 2.1. Preparar as Variáveis do Terraform

1. Navegue até o diretório do Terraform:
   ```bash
   cd app/infrastructure/terraform/s3
   ```

2. Copie o arquivo de exemplo:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Edite o arquivo `terraform.tfvars`:
   ```bash
   nano terraform.tfvars
   ```

4. Altere o `s3_bucket_name` para torná-lo ÚNICO:
   ```hcl
   s3_bucket_name = "youvisa-files-dev-SEU-NOME-12345"
   ```

   **DICA**: Use algo como `youvisa-files-dev-gabriel-2024` ou adicione números aleatórios

5. Salve e feche o arquivo

6. Volte para a raiz do projeto:
   ```bash
   cd ../../../..
   ```

---

## Passo 3: Deploy da Infraestrutura AWS

Execute o comando:

```bash
make deploy
```

Este comando:
- Inicializa o Terraform automaticamente
- Provisiona bucket S3 na região sa-east-1
- Cria usuário IAM com permissões necessárias
- Gera credenciais AWS

**Resultado esperado**:
```
Deploying AWS infrastructure...
Initializing Terraform...
...
AWS infrastructure deployed!

AWS Credentials:
aws_access_key_id = AKIA...
aws_secret_access_key = <sensitive>
bucket_name = "youvisa-files-dev-SEU-NOME-12345"
...
```

**Copie as credenciais** (aws_access_key_id, aws_secret_access_key e bucket_name)

---

## Passo 4: Configurar Variáveis de Ambiente

### 4.1. Criar o Arquivo .env

```bash
cp .env.example .env
```

### 4.2. Editar o Arquivo .env

Abra o arquivo `.env` em um editor:

```bash
nano .env
```

Preencha os valores:

```bash
# Token do Telegram (do Passo 1.2)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567

# Credenciais AWS (do Passo 3)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1
S3_BUCKET_NAME=youvisa-files-dev-SEU-NOME-12345

# n8n - MUDE A SENHA!
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=SuaSenhaSegura123!

# Webhook - será atualizado automaticamente pelo make start
WEBHOOK_URL=http://localhost:5678/
```

**IMPORTANTE**:
- Substitua TODOS os valores de exemplo pelos valores reais
- Mude a senha do n8n para algo seguro
- O WEBHOOK_URL será atualizado automaticamente no próximo passo
- Salve e feche o arquivo

---

## Passo 5: Iniciar a Plataforma

Execute o comando:

```bash
make start
```

Este comando faz TUDO automaticamente:
- Inicia o ngrok e obtém URL pública HTTPS
- Atualiza o `.env` com a URL do ngrok
- Inicia o n8n com a configuração correta

**Resultado esperado**:
```
Starting YOUVISA platform...

[1/3] Starting ngrok tunnel...
ngrok tunnel started

[2/3] Configuring webhook URL...
Public URL: https://abc123.ngrok-free.app
WEBHOOK_URL updated in .env

[3/3] Starting n8n container...
n8n is running at http://localhost:5678

Platform is ready!
Access n8n at: http://localhost:5678
Webhook URL: https://abc123.ngrok-free.app/
```

---

## Passo 6: Configurar o Workflow no n8n

### 6.1. Acessar o n8n

1. Abra o navegador em: http://localhost:5678
2. Faça login com as credenciais do `.env`:
   - Usuário: `admin` (ou o que você definiu)
   - Senha: a senha que você definiu

### 6.2. Importar o Workflow

1. No n8n, clique em **"Workflows"** no menu lateral
2. Clique no botão **"Add workflow"** > **"Import from file"**
3. Selecione o arquivo: `app/n8n-workflows/001-telegram-to-s3.json`
4. Clique em **"Import"**

O workflow aparecerá com vários nodes conectados.

### 6.3. Configurar Credenciais do Telegram

1. Clique no node **"Telegram Trigger"** (primeiro node)
2. No painel direito, clique em **"Create New Credential"**
3. Cole o **TELEGRAM_BOT_TOKEN** (do Passo 1.2)
4. Clique em **"Save"**

### 6.4. Configurar Credenciais da AWS

1. Clique no node **"Upload to S3"**
2. No painel direito, clique em **"Create New Credential"**
3. Preencha:
   - **Access Key ID**: copie do `.env`
   - **Secret Access Key**: copie do `.env`
   - **Region**: `sa-east-1`
4. Clique em **"Save"**

### 6.5. Ativar o Workflow

1. Clique no toggle **"Active"** no canto superior direito
2. O status deve mudar para verde ("Active")

---

## Passo 7: Testar a Integração

### 7.1. Enviar um Arquivo no Telegram

1. Abra o Telegram e encontre seu bot pelo username
2. Envie o comando `/start` (se ainda não enviou)
3. **Envie um arquivo** (qualquer documento, imagem, PDF)
4. Aguarde alguns segundos

### 7.2. Verificar a Confirmação

O bot deve responder com uma mensagem confirmando o upload:

```
Arquivo recebido e salvo com sucesso!

Nome: documento.pdf
Tamanho: 1.2 MB
Bucket: youvisa-files-dev-SEU-NOME-12345
Caminho: telegram/2025/11/22/12345_1732288000_documento.pdf
```

### 7.3. Verificar no S3

Execute o comando:

```bash
make s3-list
```

Você deve ver o arquivo no formato:
```
2025-11-22 15:30:00   1.2 MB telegram/2025/11/22/12345_1732288000_documento.pdf
```

### 7.4. Verificar no Console AWS (Opcional)

1. Acesse: https://s3.console.aws.amazon.com/s3/
2. Clique no seu bucket
3. Navegue até a pasta `telegram/YYYY/MM/DD/`
4. Verifique que o arquivo está lá

---

## Comandos Úteis

### Visualizar Logs do n8n

```bash
make logs
```

Pressione `Ctrl+C` para sair.

### Verificar Status do ngrok

```bash
make ngrok-status
```

### Parar a Plataforma

```bash
make stop
```

### Listar Arquivos no S3

```bash
make s3-list
```

---

## Troubleshooting

### Workflow não recebe mensagens

**Problema**: Envio mensagens no Telegram mas o workflow não é acionado.

**Soluções**:
1. Verifique se o workflow está ativo (toggle verde)
2. Verifique se o ngrok está rodando: `make ngrok-status`
3. Verifique os logs: `make logs`
4. Confirme que o WEBHOOK_URL no `.env` está correto

### Erro "Access Denied" no S3

**Problema**: Workflow falha ao fazer upload no S3.

**Soluções**:
1. Verifique se as credenciais AWS no n8n estão corretas
2. Confirme que o bucket name no `.env` está correto
3. Verifique se o usuário IAM tem permissões: `aws iam get-user --user-name youvisa-n8n-user-dev`

### n8n não inicia

**Problema**: Container não sobe ou falha ao iniciar.

**Soluções**:
1. Verifique os logs: `docker-compose logs n8n`
2. Confirme que a porta 5678 não está em uso: `lsof -i :5678`
3. Verifique se o `.env` existe e está preenchido: `cat .env`

### ngrok retorna erro 404

**Problema**: Ao acessar a URL do ngrok, recebo erro 404.

**Soluções**:
1. Verifique se o n8n está rodando: `docker-compose ps`
2. Teste o acesso local primeiro: `curl http://localhost:5678`
3. Reinicie tudo: `make stop && make start`

### URL do ngrok mudou

**Problema**: A URL do ngrok muda toda vez que reinicio.

**Solução**: Isso é normal no plano gratuito do ngrok. A URL muda a cada reinício. Para ter uma URL fixa, você precisa:
- Plano pago do ngrok (permite domínio customizado)
- OU usar um serviço de túnel alternativo (localtunnel, serveo)

Ao reiniciar, o `make start` atualiza automaticamente o WEBHOOK_URL.

---

## Próximos Passos

Com a integração Telegram + S3 funcionando, você pode explorar:

1. **Adicionar mais tipos de arquivo**: Modificar o workflow para processar vídeos, áudios, etc.
2. **Integrar MongoDB**: Salvar metadados das mensagens e usuários
3. **Adicionar OCR**: Usar AWS Textract para extrair dados dos documentos
4. **Integrar WhatsApp**: Adicionar WhatsApp Business API como canal
5. **Criar Agente de IA**: Implementar NLP/LLM para conversas inteligentes

---

## Limpeza (Destruir Recursos)

### Parar a Plataforma

```bash
make stop
```

### Destruir Infraestrutura AWS

```bash
cd app/infrastructure/terraform/s3
terraform destroy
```

Digite `yes` para confirmar.

**ATENÇÃO**: Isso apagará o bucket S3 e todos os arquivos. Não há como desfazer.

---

## Sprint 3: Testes de Processos

### Pre-requisitos Sprint 3

- API rodando: `cd app/api && npm run dev`
- Frontend rodando: `cd app/frontend && npm run dev`
- Ter ao menos um usuario no MongoDB (criado via Telegram)

---

### T1. Backend API - Processos

#### T1.1 Criar processo

```bash
# Substitua USER_ID por um _id real de usuario do MongoDB
curl -X POST http://localhost:5555/processes \
  -H "Content-Type: application/json" \
  -H "x-api-key: fiap-iatron" \
  -d '{
    "user_id": "USER_ID",
    "visa_type": "turismo",
    "destination_country": "Estados Unidos"
  }'
```

Esperado: `201` com `status: "recebido"`.

#### T1.2 Listar processos

```bash
# Todos
curl http://localhost:5555/processes -H "x-api-key: fiap-iatron"

# Com filtros
curl "http://localhost:5555/processes?status=recebido&visa_type=turismo" \
  -H "x-api-key: fiap-iatron"
```

#### T1.3 Mudar status (transicao valida)

```bash
curl -X POST http://localhost:5555/processes/PROCESS_ID/status \
  -H "Content-Type: application/json" \
  -H "x-api-key: fiap-iatron" \
  -d '{"status": "em_analise", "reason": "Documentos recebidos"}'
```

Esperado: `200` com status atualizado.

#### T1.4 Mudar status (transicao INVALIDA)

```bash
# Se o processo esta em "recebido", tentar ir direto para "aprovado"
curl -X POST http://localhost:5555/processes/PROCESS_ID/status \
  -H "Content-Type: application/json" \
  -H "x-api-key: fiap-iatron" \
  -d '{"status": "aprovado", "reason": "Tentativa invalida"}'
```

Esperado: `400` com `"Invalid transition from 'recebido' to 'aprovado'"`.

#### T1.5 Consultar historico

```bash
curl http://localhost:5555/processes/PROCESS_ID/history \
  -H "x-api-key: fiap-iatron"
```

Esperado: lista com `from_status`, `to_status`, `reason`, `changed_by`, `timestamp`.

#### T1.6 Buscar por Telegram ID

```bash
curl http://localhost:5555/processes/telegram/TELEGRAM_ID \
  -H "x-api-key: fiap-iatron"
```

#### T1.7 Associar documento

```bash
curl -X POST http://localhost:5555/processes/PROCESS_ID/documents \
  -H "Content-Type: application/json" \
  -H "x-api-key: fiap-iatron" \
  -d '{"file_id": "FILE_ID"}'
```

#### T1.8 Maquina de estados completa

| Transicao | Esperado |
|-----------|----------|
| recebido -> em_analise | 200 OK |
| em_analise -> pendente_documentos | 200 OK |
| pendente_documentos -> em_analise | 200 OK (loop) |
| em_analise -> aprovado | 200 OK |
| aprovado -> finalizado | 200 OK |
| recebido -> aprovado | 400 Erro |
| rejeitado -> em_analise | 400 Erro (estado final) |
| finalizado -> recebido | 400 Erro (estado final) |

---

### T2. Frontend - Processos

#### T2.1 Sidebar

- Acessar `http://localhost:3000/dashboard`
- Verificar link "Processos" entre "Documentos" e "Conversas"

#### T2.2 Dashboard

- Card "Processos" com contagem total
- Card "Processos por Status" com badges coloridos

#### T2.3 Lista (`/dashboard/processes`)

- Tabela com: Tipo de Visto, Pais, Status, Documentos, Criado em, Acoes
- Filtro por status (dropdown)
- Filtro por tipo de visto (dropdown)
- Botao "Atualizar" recarrega dados
- Botao "Detalhes" leva para detalhe

#### T2.4 Detalhe (`/dashboard/processes/[id]`)

- Cards: Tipo de Visto, Pais Destino, Status Atual, Criado em
- **Timeline**: barra horizontal recebido -> em_analise -> aprovado -> finalizado
  - Completos em verde, atual pulsando, rejeitado/cancelado em vermelho
- **Alterar Status**: dropdown com APENAS transicoes validas
  - Campo "Motivo" obrigatorio
  - Apos alterar, pagina recarrega
- **Historico**: tabela Data, De, Para, Motivo, Alterado por
- **Documentos**: lista de docs associados

---

### T3. NLP Lambda (Chatbot com Status)

Pre-requisito: usuario com processos no MongoDB.

#### T3.1 Consulta de status

Enviar pelo Telegram: **"qual o status do meu processo?"**

Esperado: bot responde com dados reais (tipo visto, pais, status).

#### T3.2 Guardrails

| Mensagem | Esperado |
|----------|----------|
| "quando meu visto sera aprovado?" | NAO informa prazos |
| "meu visto foi aprovado?" | Responde com status real |
| "pode aprovar meu processo?" | Sugere falar com atendente |

---

### T4. Workflow n8n (Notificacoes)

#### T4.1 Importar workflow

```bash
./scripts/generate-workflow.sh
```

Importar `app/n8n/workflows/status-notification.output.json` no n8n e ativar.

#### T4.2 Testar webhook manualmente

```bash
curl -X POST http://localhost:5678/webhook/status-change \
  -H "Content-Type: application/json" \
  -d '{
    "process_id": "PROCESS_ID",
    "user_id": "USER_ID",
    "old_status": "recebido",
    "new_status": "em_analise",
    "reason": "Documentos completos"
  }'
```

Esperado: usuario recebe mensagem no Telegram.

#### T4.3 Mensagens por transicao

| Transicao | Mensagem |
|-----------|----------|
| recebido -> em_analise | "...foram recebidos e estao sendo analisados." |
| em_analise -> pendente_documentos | "...Precisamos de documentos adicionais..." |
| em_analise -> aprovado | "Parabens! ...foi aprovado!" |
| em_analise -> rejeitado | "...nao foi aprovado..." |
| aprovado -> finalizado | "...finalizado com sucesso!" |
| * -> cancelado | "...foi cancelado. Motivo: ..." |

---

### T5. Criacao Automatica de Processo

#### T5.1 Primeiro documento

1. Envie documento pelo Telegram (foto de passaporte)
2. Verificar via API que processo foi criado:
   ```bash
   curl http://localhost:5555/processes/telegram/SEU_TELEGRAM_ID \
     -H "x-api-key: fiap-iatron"
   ```
3. Esperado: processo com `visa_type: "a_definir"`, `status: "recebido"`, documento no array

#### T5.2 Segundo documento

1. Envie outro documento pelo Telegram
2. Verificar que foi associado ao MESMO processo (array `documents` com 2 itens)

---

### Checklist Sprint 3

- [ ] API: `POST /processes` cria processo
- [ ] API: Transicao valida retorna 200
- [ ] API: Transicao invalida retorna 400
- [ ] API: `GET /processes/:id/history` retorna historico
- [ ] API: `GET /processes/telegram/:id` retorna processos
- [ ] Frontend: Link "Processos" no sidebar
- [ ] Frontend: Dashboard com card de processos
- [ ] Frontend: Listagem com filtros
- [ ] Frontend: Timeline visual no detalhe
- [ ] Frontend: Dropdown mostra apenas transicoes validas
- [ ] Frontend: Mudanca de status funciona
- [ ] NLP: "qual o status?" retorna dados reais
- [ ] NLP: Guardrails (sem prazos, sem decisoes)
- [ ] n8n: Notificacao chega no Telegram
- [ ] n8n: Documento cria processo automaticamente

---

## Referencias

- [README.md](../README.md) - Documentação completa do projeto
- [docs/n8n-workflows.md](n8n-workflows.md) - Documentação do workflow
- [app/infrastructure/terraform/s3/README.md](../app/infrastructure/terraform/s3/README.md) - Documentação do Terraform
