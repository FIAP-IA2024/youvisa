# Relatorio Tecnico - Sprint 3: Plataforma de Acompanhamento de Processos

## 1. Decisoes de Arquitetura

### 1.1 Maquina de Estados Finitos para Processos de Visto

O nucleo da Sprint 3 e o modelo `Process` com uma maquina de estados finitos (FSM) que governa o ciclo de vida das solicitacoes de visto. A FSM define 7 estados e transicoes validas entre eles:

```
recebido -> em_analise -> aprovado -> finalizado
                       -> pendente_documentos -> em_analise (loop)
                       -> rejeitado (final)
         -> cancelado (de qualquer estado nao-final)
```

**Justificativa:** Uma FSM garante que processos nao possam pular etapas (ex: ir de "recebido" direto para "aprovado"), mantendo integridade dos dados e rastreabilidade completa. A validacao de transicao ocorre no `ProcessRepository.updateStatus()` antes de qualquer persistencia.

### 1.2 Acesso Direto ao MongoDB pelo NLP Lambda

O plano original propunha que o NLP Lambda consultasse processos via API HTTP (`GET /processes/telegram/{id}`), mas isso criaria dependencia circular e adicionaria latencia. Optamos pelo acesso direto ao MongoDB a partir do Lambda, reutilizando o `MongoDBClient` ja existente com o novo metodo `get_processes_by_telegram_id()`.

### 1.3 Notificacoes Deterministicas via n8n

As mensagens de notificacao de mudanca de status sao **deterministicas** (templates pre-definidos), nao geradas por LLM. Isso garante consistencia, previsibilidade e elimina risco de alucinacao em comunicacoes oficiais. O webhook e acionado pelo `ProcessController` apos transicao bem-sucedida.

### 1.4 Criacao Automatica de Processos

Quando um usuario envia um documento pelo Telegram, o workflow n8n verifica se ja existe um processo aberto. Se sim, associa o documento ao processo existente. Se nao, cria um novo processo com `visa_type: "a_definir"` e `destination_country: "A definir"`, que sera atualizado pelo atendente posteriormente.

## 2. Logica de Status e Eventos

### Fluxo de Eventos

1. **Documento enviado** -> Processo criado automaticamente (status: `recebido`)
2. **Atendente inicia analise** -> Status muda para `em_analise`, notificacao enviada ao cliente
3. **Documentos faltantes** -> Status muda para `pendente_documentos`, cliente notificado com motivo
4. **Cliente envia documentos** -> Documentos associados ao processo, atendente retoma analise
5. **Decisao** -> `aprovado` ou `rejeitado`, cliente notificado
6. **Conclusao** -> `finalizado` (apos aprovacao) ou `cancelado`

### Historico de Transicoes

Cada mudanca de status registra: status anterior, novo status, motivo, responsavel e timestamp. Isso cria trilha de auditoria completa, visivel tanto no frontend (tabela de historico + timeline visual) quanto consultavel via API.

## 3. Governanca de IA

### Guardrails Implementados no Chatbot

O `SYSTEM_PROMPT` do agente conversacional inclui regras explicitas de governanca:

- **Sem prazos**: O bot nunca informa prazos especificos de conclusao
- **Sem decisoes autonomas**: O bot nao aprova, rejeita ou cancela processos
- **Dados factuais apenas**: Responde sobre status usando exclusivamente dados do MongoDB
- **Escalacao proativa**: Sugere falar com atendente quando nao pode responder
- **Transparencia**: Informa o status real do processo sem interpretacoes

### Intent `status_query`

Novo intent adicionado ao NLP que identifica quando o usuario pergunta sobre o andamento do processo. O handler busca os processos do usuario e os injeta no contexto do prompt, permitindo respostas precisas baseadas em dados reais.

## 4. Componentes Desenvolvidos

| Componente | Tecnologia | Funcao |
|-----------|------------|--------|
| ProcessModel | Mongoose/TypeScript | Schema com FSM |
| ProcessRepository | tsyringe/injectable | CRUD + validacao de transicao |
| ProcessController | Fastify | 8 endpoints REST + webhook |
| Timeline Visual | React/Tailwind | Barra de progresso interativa |
| Pagina de Processos | Next.js | Listagem com filtros |
| Detalhe do Processo | Next.js | Timeline + historico + status change |
| Status Notification | n8n workflow | Webhook -> Telegram |
| NLP com Processos | Lambda/Bedrock | Consulta de status via chatbot |

## 5. Endpoints da API de Processos

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | /processes | Criar processo |
| GET | /processes | Listar com filtros |
| GET | /processes/:id | Detalhe |
| GET | /processes/:id/history | Historico de transicoes |
| GET | /processes/user/:userId | Por usuario |
| GET | /processes/telegram/:telegramId | Por Telegram ID |
| POST | /processes/:id/status | Mudar status |
| POST | /processes/:id/documents | Associar documento |
