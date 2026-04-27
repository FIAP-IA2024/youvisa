# Relatório Técnico — Sprint 4: Plataforma de Atendimento Inteligente

**Faculdade:** FIAP — 1TIAOR 2024/2 · Inteligência Artificial (Graduação)
**Equipe:** RM560173 Gabriel Ribeiro · RM559926 Marcos Trazzini · RM559800 Jonas Lima · RM559645 Edimilson Silva

---

## 1. Organização dos Agentes Inteligentes

A Sprint 4 substituiu o NLP monolítico (uma única chamada ao Bedrock) por um **pipeline multi-agente em TypeScript** rodando como um serviço dedicado (`app/agent/`) com o **Claude Agent SDK**, autenticado via volume Docker (`claude_home`) que recebe o token do plano Max do desenvolvedor por `claude setup-token`.

```
Inbound message
   │
   ▼
[0] Handoff check ──── if conversation.status == 'transferred' → silencia o bot
   │                    (preserva o contrato Sprint 2/3 sem regressão)
   ▼
[1] Input Filter ───── deterministic regex + length cap; bloqueia prompt
   │                    injection antes de qualquer chamada de LLM
   ▼
[2] Intent Classifier ─── Claude Haiku 4.5, JSON com {intent, confidence}
                          ─┐
[3] Entity Extractor   ─── Claude Haiku 4.5, JSON com entidades
                          ─┘  (ambos rodam em paralelo)
   ▼
[4] Lookup ─────────── deterministic; lê MongoDB direto
                          (pula o API HTTP — ver context/learnings/
                          nlp-direct-mongodb-access.md)
   ▼
[5] Response Generator ── Claude Haiku 4.5; system prompt com 8 few-shot
                          + 10 regras de governança (sem prazos, sem
                          decisões, só dados reais, rótulos amigáveis)
   ▼
[6] Output Filter ───── deterministic; rejeita resposta se mencionar
                          códigos internos, prazos, ou placeholders
   ▼
[7] Logger ──────────── persiste InteractionLog completo na API
```

Cada step é um módulo isolado em `app/agent/src/agents/` com sua própria responsabilidade, testável e debugável separadamente. Os passos LLM produzem JSON estruturado validado por Zod; falha de schema cai em fallback determinístico.

**Atalhos arquiteturais** que entram em ação antes do pipeline completo:
- **Handoff (step 0)** — short-circuit silencioso quando o operador assumiu a conversa.
- **Input filter (step 1)** — bloqueia injeções em ~5ms sem gastar token de LLM.
- **Open portal** (após step 4) — quando intent é `open_portal`, gera JWT HS256 (`{user_id, exp}`, 24h) e devolve a URL do portal sem chamar o Response Generator.

## 2. Interpretação das Perguntas

A interpretação acontece em **duas etapas explícitas**, conforme o briefing:

**Intent Classification.** O Intent Classifier recebe a mensagem do usuário (saneada pelo Input Filter) e devolve uma das categorias: `status_query`, `document_question`, `want_human`, `provide_email`, `open_portal`, `general`. O system prompt inclui **9 exemplos few-shot** cobrindo formulações em português coloquial e formal, com confidence de 0–1.

**Entity Extraction.** Em paralelo ao Intent, o Entity Extractor identifica entidades estruturadas — `visa_type`, `country`, `process_id`, `doc_type`, `email`, `dates` — usando outro prompt few-shot. Não chuta: se a mensagem não menciona uma entidade, devolve `{}`.

**Engenharia de prompt e proteção contra prompt injection.** Cada prompt LLM contém:
1. Identidade clara ("Você é um classificador..." / "Você é o assistente da YOUVISA...")
2. Lista exaustiva de saídas válidas (categorias, schemas)
3. Few-shot examples controlados (5–9 por agente)
4. Formato de resposta explícito (JSON apenas, sem prosa antes ou depois)

Como camada de defesa **independente do prompt**, o Input Filter aplica regex determinísticos para padrões como `ignore previous instructions`, `you are now DAN`, `system:`, `<system>` etc. — em português e inglês — antes da mensagem chegar a qualquer LLM. Saída do filtro é logada com `intent: 'injection_attempt'` para auditoria.

Para o documento (foto/imagem), o caminho é distinto: validação de qualidade visual (FastAPI + OpenCV em `app/validation/`), upload para MinIO (S3-compatible local), e classificação por tipo via Claude Vision (Passaporte / RG / Comprovante / Formulário / Documento inválido) — chamada feita por `fetch` direto à Anthropic Messages API porque o `query()` do Claude Agent SDK só aceita prompts de texto.

## 3. Registro das Interações

Toda inbound message produz exatamente um documento na coleção `interaction_logs` no MongoDB, persistido pela API ao final do pipeline:

```typescript
{
  session_id:        string,            // conversation_id (forward-compat para outros canais)
  user_id:           ObjectId,
  conversation_id:   ObjectId,
  channel:           'telegram',
  user_message:      string,            // texto original do usuário
  intent:            string,            // 'status_query' | 'injection_attempt' | ...
  intent_confidence: number,            // 0..1
  entities:          object,            // visa_type, country, doc_type, email, ...
  agent_trace:       AgentTraceEntry[], // 1 entrada por step do pipeline
  response:          string,            // resposta enviada (vazio quando handoff silencia)
  response_skipped:  boolean,
  total_latency_ms:  number,
  created_at:        Date,
}
```

`agent_trace[]` é o coração da rastreabilidade: cada agente é envolvido por um `Tracer` (`app/agent/src/orchestrator/tracer.ts`) que captura `{step, started_at, duration_ms, output}`. Em uma chamada típica de status query, vê-se 6 entradas — `input-filter`, `intent-classifier`, `entity-extractor`, `lookup`, `response-generator`, `output-filter` — cada uma com o output estruturado do seu próprio passo. Em uma tentativa de injeção, vê-se uma única entrada de `input-filter` com `{blocked: true, reason: 'instruction_override'}` em ~5ms.

A API expõe os logs em endpoints dedicados:
- `GET /interactions?intent=...&user_id=...` — filtros operacionais
- `GET /interactions/conversation/:id` — drilldown por conversa
- `GET /interactions/user/:id` — histórico do cliente (alimenta o **Portal Cliente**)

**Visibilidade dupla.** O **operador** vê tudo em `/dashboard/interactions` (com badges de intent + latência por step + entidades). O **cliente** vê seu próprio histórico em `/portal/<jwt>` com o badge da intent ao lado de cada mensagem que enviou — prova visual de que cada pergunta foi interpretada antes de respondida.

---

**Verificação E2E.** O smoke script `scripts/smoke-e2e.ts` exercita oito cenários (status query, saudação geral, duas variantes de prompt injection, abrir portal, pedir humano, handoff silencia o bot, voltar ao bot). Resultado da última execução: **8/8 passing**. Latências: ~5–15s para cenários LLM, **2–5ms** para os bloqueios determinísticos pré-LLM.
