**Faculdade:** FIAP - Faculdade de Informática e Administração Paulista

**Curso:** Inteligência Artificial (Graduação)

**Turma:** 1TIAOR - 2024/2

**Integrantes:**

- RM560173 - Gabriel de Oliveira Soares Ribeiro
- RM559926 - Marcos de Souza Trazzini
- RM559800 - Jonas Felipe dos Santos Lima
- RM559645 - Edimilson Ribeiro da Silva

**Link do projeto no GitHub:** <https://github.com/ribeirogab/youvisa>

---

O código fonte e recursos do projeto estão organizados na pasta `./app`.

## Arquivos principais

- `./app/api/src/lambda.ts` - Handler AWS Lambda da API
- `./app/api/src/routes.ts` - Definição de rotas da API
- `./app/api/src/controllers/` - Controladores (users, conversations, messages, files, processes)
- `./app/api/src/models/process.model.ts` - Modelo de processo com máquina de estados
- `./app/api/src/repositories/process.repository.ts` - Repository com validação de transições
- `./app/api/src/controllers/process.controller.ts` - Controller com disparo de webhook
- `./app/classifier/src/handler.py` - Lambda classificador de documentos com IA
- `./app/classifier/src/bedrock.py` - Integração com AWS Bedrock (Claude 3 Haiku)
- `./app/nlp/src/handler.py` - Lambda NLP conversacional
- `./app/nlp/src/prompts.py` - Prompts do sistema para IA (com guardrails de governança)
- `./app/nlp/src/bedrock.py` - Processamento NLP com consulta de status de processos
- `./app/frontend/src/app/` - Páginas do dashboard (Next.js)
- `./app/frontend/src/app/dashboard/processes/` - Páginas de gestão de processos
- `./app/frontend/src/components/process-timeline.tsx` - Timeline visual de progresso
- `./app/n8n/workflows/telegram.template.json` - Workflow de automação Telegram
- `./app/n8n/workflows/status-notification.template.json` - Workflow de notificação de status

## Diretórios importantes

- `./app/api/` - Backend API (TypeScript/Fastify)
- `./app/classifier/` - Lambda classificador de documentos (Python)
- `./app/nlp/` - Lambda NLP conversacional (Python)
- `./app/frontend/` - Console do Operador (Next.js/React)
- `./app/n8n/workflows/` - Workflows de automação n8n
- `./app/infrastructure/terraform/` - Infraestrutura como código (Terraform)
- `./docs/diagramas/` - Diagramas da arquitetura

## Principais recursos

- **Bot Telegram com IA Conversacional** - Atendimento automatizado usando AWS Bedrock (Claude 3 Haiku)
- **Classificação de Documentos com Visão Computacional** - Identifica passaportes, RG, comprovantes e formulários
- **Gestão de Processos de Visto** - Máquina de estados finitos com transições validadas (recebido → em_análise → aprovado → finalizado)
- **Notificações Automáticas** - Mudanças de status disparam notificações via Telegram (workflow n8n)
- **Consulta de Status via Chatbot** - Cliente consulta o andamento do processo diretamente pelo Telegram
- **Guardrails de Governança de IA** - LLM não inventa prazos, não toma decisões institucionais, usa apenas dados reais
- **Dashboard do Operador** - Interface web para gerenciar conversas, documentos e processos
- **Timeline Visual de Processos** - Acompanhamento visual do progresso de cada solicitação
- **Transferência para Atendente Humano** - Sistema de handoff bot-humano
- **Armazenamento Seguro** - Documentos criptografados no AWS S3
- **Orquestração com n8n** - Automação de fluxos de trabalho
- **Infraestrutura Serverless** - AWS Lambda, S3 na região sa-east-1 (LGPD)

## Tecnologias utilizadas

| Categoria | Tecnologia |
|-----------|------------|
| **Backend** | TypeScript, Fastify, AWS Lambda |
| **Frontend** | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| **IA/ML** | AWS Bedrock (Claude 3 Haiku) |
| **Banco de Dados** | MongoDB Atlas |
| **Armazenamento** | AWS S3 |
| **Orquestração** | n8n |
| **IaC** | Terraform |
| **Cloud** | AWS (sa-east-1) |
