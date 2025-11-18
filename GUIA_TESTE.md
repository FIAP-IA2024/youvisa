# Guia de Teste - Integração Telegram + S3

Este documento fornece um passo a passo completo para testar a integração entre Telegram e AWS S3 via n8n.

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [ ] Docker Desktop (ou Docker + Docker Compose)
- [ ] Terraform (versão >= 1.5.0)
- [ ] AWS CLI configurado
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
```

Se algum comando falhar, instale a ferramenta correspondente antes de continuar.

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

## Passo 2: Provisionar Infraestrutura AWS

### 2.1. Preparar as Variáveis do Terraform

1. Abra um terminal na raiz do projeto

2. Navegue até o diretório do Terraform:

   ```bash
   cd infrastructure/terraform/s3
   ```

3. Copie o arquivo de exemplo:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

4. Abra o arquivo `terraform.tfvars` em um editor:

   ```bash
   # macOS/Linux
   nano terraform.tfvars

   # Ou use seu editor preferido
   code terraform.tfvars
   ```

5. Edite a linha do `s3_bucket_name` para torná-lo ÚNICO:

   ```hcl
   s3_bucket_name = "youvisa-files-dev-SEU-NOME-12345"
   ```

   **DICA**: Use algo como `youvisa-files-dev-gabriel-2024` ou adicione números aleatórios

6. Salve e feche o arquivo

### 2.2. Inicializar o Terraform

```bash
terraform init
```

**Resultado esperado**:

```
Terraform has been successfully initialized!
```

### 2.3. Revisar o Plano

```bash
terraform plan
```

Você verá uma lista de recursos que serão criados:

- 1 S3 bucket
- 1 IAM user
- 1 IAM access key
- 1 IAM policy
- Configurações de segurança do bucket

**Verifique**:

- [ ] O nome do bucket está correto e único
- [ ] A região é `sa-east-1`
- [ ] Aparece "Plan: 6 to add, 0 to change, 0 to destroy"

### 2.4. Aplicar a Configuração

```bash
terraform apply
```

1. Revise as mudanças
2. Digite `yes` quando solicitado
3. Aguarde a criação dos recursos (leva ~30 segundos)

**Resultado esperado**:

```
Apply complete! Resources: 6 added, 0 changed, 0 destroyed.

Outputs:

aws_access_key_id = <sensitive>
aws_region = "sa-east-1"
aws_secret_access_key = <sensitive>
bucket_arn = "arn:aws:s3:::youvisa-files-dev-SEU-NOME-12345"
bucket_name = "youvisa-files-dev-SEU-NOME-12345"
n8n_user_name = "youvisa-n8n-user-dev"
```

### 2.5. Obter as Credenciais AWS

Execute os comandos abaixo e **COPIE os valores**:

```bash
# Access Key ID
terraform output -raw aws_access_key_id

# Secret Access Key
terraform output -raw aws_secret_access_key

# Nome do Bucket
terraform output -raw bucket_name
```

**GUARDE ESSES VALORES** em um arquivo temporário. Você vai precisar deles no próximo passo.

### 2.6. Verificar no Console AWS (Opcional)

1. Acesse <https://console.aws.amazon.com/s3>
2. Verifique que o bucket foi criado
3. Verifique que a região é "South America (São Paulo) sa-east-1"

---

## Passo 3: Configurar Variáveis de Ambiente

### 3.1. Voltar para a Raiz do Projeto

```bash
cd ../../..
pwd  # Deve mostrar: /Users/seu-usuario/caminho/youvisa
```

### 3.2. Criar o Arquivo .env

```bash
cp .env.example .env
```

### 3.3. Editar o Arquivo .env

Abra o arquivo `.env` em um editor:

```bash
nano .env
# ou
code .env
```

Preencha os valores:

```bash
# Token do Telegram (do Passo 1.2)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz-1234567

# Credenciais AWS (do Passo 2.5)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1
S3_BUCKET_NAME=youvisa-files-dev-SEU-NOME-12345

# n8n - MUDE A SENHA!
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=SuaSenhaSegura123!

# Webhook
WEBHOOK_URL=http://localhost:5678/
```

**IMPORTANTE**:

- Substitua TODOS os valores de exemplo pelos valores reais
- Mude a senha do n8n para algo seguro
- Salve e feche o arquivo

### 3.4. Verificar o Arquivo .env

```bash
cat .env | grep -v "^#" | grep -v "^$"
```

Confirme que todos os valores estão preenchidos (sem "your_", "change_this", etc.)

---

## Passo 4: Iniciar o n8n

### 4.1. Subir o Container

```bash
docker-compose up -d
```

**Resultado esperado**:

```
Creating network "youvisa-network" with driver "bridge"
Creating volume "youvisa_n8n_data" with driver "local"
Creating youvisa-n8n ... done
```

### 4.2. Verificar que está Rodando

```bash
docker-compose ps
```

**Resultado esperado**:

```
NAME          STATUS    PORTS
youvisa-n8n   Up        0.0.0.0:5678->5678/tcp
```

### 4.3. Verificar os Logs (Opcional)

```bash
docker-compose logs -f n8n
```

Aguarde até ver mensagens como:

```
Editor is now accessible via:
http://localhost:5678/
```

Pressione `Ctrl+C` para sair dos logs.

### 4.4. Acessar a Interface do n8n

1. Abra o navegador
2. Acesse: <http://localhost:5678>
3. Faça login com:
   - **Usuário**: `admin` (ou o que você definiu no .env)
   - **Senha**: A senha que você definiu no .env

**Se não conseguir acessar**:

- Aguarde 30 segundos (n8n pode estar iniciando)
- Verifique se a porta 5678 não está sendo usada por outro programa
- Verifique os logs: `docker-compose logs n8n`

---

## Passo 5: Importar e Configurar o Workflow

### 5.1. Importar o Workflow

1. No n8n, clique em **"Workflows"** no menu lateral
2. Clique no botão **"Add workflow"** > **"Import from file"**
3. Selecione o arquivo: `n8n-workflows/001-telegram-to-s3.json`
4. Clique em **"Import"**

O workflow aparecerá com vários nodes conectados.

### 5.2. Configurar Credenciais do Telegram

1. Clique no primeiro node chamado **"Telegram Trigger"**
2. Você verá um ícone de aviso (⚠️) em "Credential to connect with"
3. Clique em **"Select Credential"** > **"Create New"**
4. Preencha:
   - **Name**: `Telegram Bot API`
   - **Access Token**: Cole o token do Telegram (do Passo 1.2)
5. Clique em **"Create"**

### 5.3. Configurar Credenciais da AWS

1. Clique no node **"Upload to S3"**
2. Clique em **"Select Credential"** > **"Create New"**
3. Selecione o tipo **"AWS"**
4. Preencha:
   - **Name**: `AWS Credentials`
   - **Access Key ID**: Cole o valor do .env
   - **Secret Access Key**: Cole o valor do .env
   - **Region**: `sa-east-1`
5. Clique em **"Create"**

### 5.4. Verificar Outros Nodes

Alguns nodes também usam as credenciais do Telegram. Para cada node com ⚠️:

1. Clique no node
2. Em "Credential to connect with", selecione **"Telegram Bot API"** (a que você criou)
3. Repita para todos os nodes do Telegram

### 5.5. Ativar o Workflow

1. No canto superior direito, você verá um **toggle switch**
2. Clique para mudar de "Inactive" para **"Active"**
3. O workflow agora está ativo e ouvindo mensagens do Telegram

---

## Passo 6: Testar a Integração

### 6.1. Teste 1: Mensagem de Texto (Sem Arquivo)

1. Abra o Telegram
2. Encontre seu bot (busque pelo username, ex: `@youvisa_test_assistant_bot`)
3. Envie uma mensagem de texto qualquer:

   ```
   Olá, bot!
   ```

**Resultado esperado**:
O bot deve responder:

```
Please send a file (document, image, PDF, etc.) so I can process it.
```

**Se não funcionar**:

- Aguarde 10 segundos e tente novamente
- Verifique que o workflow está ativo (toggle verde)
- Veja os logs do n8n: `docker-compose logs -f n8n`

### 6.2. Teste 2: Enviar uma Imagem

1. No Telegram, clique no ícone de anexo (📎)
2. Selecione uma foto ou tire uma foto nova
3. Envie a foto

**Resultado esperado**:

```
File "photo.jpg" received and stored successfully!
```

### 6.3. Teste 3: Enviar um Documento PDF

1. Prepare um arquivo PDF qualquer (pode ser qualquer documento)
2. No Telegram, clique no ícone de anexo (📎)
3. Selecione "Document" ou "File"
4. Escolha o PDF
5. Envie

**Resultado esperado**:

```
File "documento.pdf" received and stored successfully!
```

### 6.4. Verificar no n8n

1. No n8n, clique em **"Executions"** no menu lateral
2. Você verá a lista de execuções do workflow
3. As execuções bem-sucedidas aparecem com status **"Success"** (verde)
4. Clique em uma execução para ver os detalhes de cada node

### 6.5. Verificar no S3

#### Opção 1: Via AWS CLI

```bash
aws s3 ls s3://youvisa-files-dev-SEU-NOME-12345/telegram/ --recursive
```

**Resultado esperado**:

```
2025-11-18 10:30:00    245123 telegram/2025/11/18/AgAD...12345_1731933000000_photo.jpg
2025-11-18 10:31:15    512456 telegram/2025/11/18/BQAc...67890_1731933075000_documento.pdf
```

#### Opção 2: Via Console AWS

1. Acesse <https://console.aws.amazon.com/s3>
2. Clique no seu bucket
3. Navegue até `telegram/2025/11/18/` (ajuste para a data atual)
4. Veja os arquivos enviados

---

## Passo 7: Testes Adicionais

### 7.1. Teste de Múltiplos Arquivos

Envie 3 arquivos diferentes em sequência:

- Uma foto
- Um PDF
- Um documento Word/Excel

Verifique que todos foram processados com sucesso.

### 7.2. Teste de Arquivo Grande

Envie um arquivo entre 10-20MB (limite do Telegram).

Verifique:

- [ ] Upload bem-sucedido
- [ ] Tempo de processamento < 15 segundos

### 7.3. Teste de Diferentes Tipos de Arquivo

Teste com:

- [ ] Imagem JPG
- [ ] Imagem PNG
- [ ] PDF
- [ ] Documento Word (.docx)
- [ ] Planilha Excel (.xlsx)
- [ ] Vídeo (pequeno, < 10MB)

---

## Troubleshooting

### Problema: Bot não responde no Telegram

**Soluções**:

1. Verifique que o workflow está ativo (toggle verde no n8n)
2. Verifique o token do Telegram nas credenciais
3. Veja os logs: `docker-compose logs -f n8n`
4. Tente desativar e reativar o workflow

### Problema: Erro "Access Denied" no S3

**Soluções**:

1. Verifique as credenciais AWS no n8n
2. Confirme que o bucket name está correto
3. Verifique as permissões IAM:

   ```bash
   aws iam get-user-policy --user-name youvisa-n8n-user-dev --policy-name youvisa-n8n-s3-policy-dev
   ```

### Problema: n8n não inicia

**Soluções**:

1. Verifique se a porta 5678 está livre:

   ```bash
   lsof -i :5678
   ```

2. Veja os logs:

   ```bash
   docker-compose logs n8n
   ```

3. Recrie o container:

   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Problema: Workflow executa mas arquivo não aparece no S3

**Soluções**:

1. Verifique o nome do bucket na execução do n8n
2. Confira se há erros no node "Upload to S3"
3. Teste as credenciais AWS manualmente:

   ```bash
   aws s3 ls s3://youvisa-files-dev-SEU-NOME-12345/
   ```

---

## Limpeza e Destruição (Opcional)

Se você quiser remover tudo depois dos testes:

### Parar o n8n

```bash
docker-compose down
```

### Remover Volumes (CUIDADO: Apaga os workflows salvos)

```bash
docker-compose down -v
```

### Destruir Infraestrutura AWS

```bash
cd infrastructure/terraform/s3
terraform destroy
```

Digite `yes` para confirmar.

**ATENÇÃO**: Isso apagará o bucket S3 e todos os arquivos. Não há como desfazer.

---

## Checklist Final

Após completar todos os passos, você deve ter:

- [ ] Bot do Telegram criado e ativo
- [ ] Bucket S3 provisionado na região sa-east-1
- [ ] IAM user com credenciais funcionando
- [ ] n8n rodando em <http://localhost:5678>
- [ ] Workflow importado, configurado e ativo
- [ ] Teste 1: Mensagem de texto respondida com instruções
- [ ] Teste 2: Imagem enviada e armazenada no S3
- [ ] Teste 3: PDF enviado e armazenado no S3
- [ ] Arquivos visíveis no S3 com estrutura: `telegram/YYYY/MM/DD/`
- [ ] Execuções bem-sucedidas visíveis no n8n

---

## Próximos Passos

Depois de validar que tudo funciona:

1. **Integração com MongoDB**: Salvar metadados das mensagens
2. **Processamento OCR**: Extrair dados dos documentos com AWS Textract
3. **Adicionar WhatsApp**: Integrar WhatsApp Business API
4. **Agente de IA**: Implementar conversação com NLP/LLM
5. **Console do Operador**: Interface web para atendimento humano

---

## Suporte

Se encontrar problemas:

1. Verifique a seção **Troubleshooting** acima
2. Consulte a documentação detalhada:
   - [README.md](README.md) - Seção "Integração Telegram + S3"
   - [docs/n8n-workflows.md](docs/n8n-workflows.md) - Documentação do workflow
   - [infrastructure/terraform/s3/README.md](infrastructure/terraform/s3/README.md) - Documentação do Terraform

3. Revise os logs:

   ```bash
   # Logs do n8n
   docker-compose logs -f n8n

   # Status do Terraform
   cd infrastructure/terraform/s3
   terraform show
   ```

Boa sorte com os testes!
