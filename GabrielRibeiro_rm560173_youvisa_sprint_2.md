**Faculdade:** FIAP - Faculdade de Informatica e Administracao Paulista
**Curso:** Inteligencia Artificial (Graduacao)
**Turma:** 1TIAOR - 2024/2

**Integrantes:**

- RM560173 - Gabriel de Oliveira Soares Ribeiro
- RM559926 - Marcos de Souza Trazzini
- RM559800 - Jonas Felipe dos Santos Lima
- RM559645 - Edimilson Ribeiro da Silva

**Link do projeto no GitHub:** <https://github.com/ribeirogab/youvisa>
**Link do video no YouTube:** <https://youtu.be/dyTIJXozWXk>

---

## Links de Acesso

| Componente | URL |
|------------|-----|
| **Dashboard (Console)** | <https://youvisa-dashboard.gabrielribeiro.work/> |
| **n8n (Orquestrador)** | <https://youvisa-n8n.gabrielribeiro.work/> |
| **Bot Telegram** | <https://web.telegram.org/a/#8196147608> |

**Credenciais de Acesso (Dashboard):**

- Usuario: `admin@admin.com`
- Senha: `Teste1234`

**Bot Telegram:**

- Link direto: <https://web.telegram.org/a/#8196147608>
- Ou procure por: `@youvisa_test_assistant_bot`

---

O codigo fonte e recursos do projeto estao organizados na pasta `./app`.

## Arquivos principais

- `./app/api/src/lambda.ts` - Handler AWS Lambda da API
- `./app/api/src/routes.ts` - Definicao de rotas da API
- `./app/api/src/controllers/` - Controladores (users, conversations, messages, files)
- `./app/classifier/src/handler.py` - Lambda classificador de documentos com IA
- `./app/classifier/src/bedrock.py` - Integracao com AWS Bedrock (Claude 3 Haiku)
- `./app/nlp/src/handler.py` - Lambda NLP conversacional
- `./app/nlp/src/prompts.py` - Prompts do sistema para IA
- `./app/frontend/src/app/` - Paginas do dashboard (Next.js)
- `./app/n8n/workflows/telegram.template.json` - Workflow de automacao n8n

## Diretorios importantes

- `./app/api/` - Backend API (TypeScript/Fastify)
- `./app/classifier/` - Lambda classificador de documentos (Python)
- `./app/nlp/` - Lambda NLP conversacional (Python)
- `./app/frontend/` - Console do Operador (Next.js/React)
- `./app/n8n/workflows/` - Workflows de automacao n8n
- `./app/infrastructure/terraform/` - Infraestrutura como codigo (Terraform)
- `./docs/diagramas/` - Diagramas da arquitetura

## Principais recursos

- **Bot Telegram com IA Conversacional** - Atendimento automatizado usando AWS Bedrock (Claude 3 Haiku)
- **Classificacao de Documentos com Visao Computacional** - Identifica passaportes, RG, comprovantes e formularios
- **Dashboard do Operador** - Interface web para gerenciar conversas e documentos
- **Transferencia para Atendente Humano** - Sistema de handoff bot-humano
- **Armazenamento Seguro** - Documentos criptografados no AWS S3
- **Orquestracao com n8n** - Automacao de fluxos de trabalho
- **Infraestrutura Serverless** - AWS Lambda, SQS, S3 na regiao sa-east-1 (LGPD)

## Tecnologias utilizadas

| Categoria | Tecnologia |
|-----------|------------|
| **Backend** | TypeScript, Fastify, AWS Lambda |
| **Frontend** | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| **IA/ML** | AWS Bedrock (Claude 3 Haiku) |
| **Banco de Dados** | MongoDB Atlas |
| **Armazenamento** | AWS S3 |
| **Orquestracao** | n8n |
| **IaC** | Terraform |
| **Cloud** | AWS (sa-east-1) |
