# FIAP - Faculdade de Informática e Administração Paulista

<p align="center">
<a href= "https://www.fiap.com.br/"><img src="https://raw.githubusercontent.com/lfusca/templateFiap/main/assets/logo-fiap.png" alt="FIAP - Faculdade de Informática e Admnistração Paulista" border="0" width=40% height=40%></a>
</p>

<br>

## 👨‍🎓 Integrantes do Grupo

- RM559800 - [Jonas Felipe dos Santos Lima](https://www.linkedin.com/in/jonas-felipe-dos-santos-lima-b2346811b/)
- RM560173 - [Gabriel Ribeiro](https://www.linkedin.com/in/ribeirogab/)
- RM559926 - [Marcos Trazzini](https://www.linkedin.com/in/mstrazzini/)
- RM559645 - [Edimilson Ribeiro](https://www.linkedin.com/in/edimilson-ribeiro/)

## 👩‍🏫 Professores

### Coordenador(a)

- [André Godoi](https://www.linkedin.com/in/profandregodoi/)

## 1. Introdução

A YOUVISA é uma empresa brasileira especializada em soluções digitais baseadas em **Inteligência Artificial, RPA e automação cognitiva** para otimizar processos consulares e de atendimento.  
O objetivo deste projeto é desenvolver uma **plataforma de atendimento multicanal inteligente**, integrando **IA conversacional, visão computacional, automação de processos (RPA), e análise de dados**, com **atendimento humano assistido** em casos complexos.

A proposta reflete uma arquitetura **modular, escalável e segura**, contemplando:
- Agente de IA conversacional omnicanal;
- Integração orquestrada por **n8n**;
- Validação de documentos via OCR e visão computacional;
- Automação RPA para formulários e notificacões;
- Painel de **atendimento humano (console do operador)**;
- Data pipeline e análise de dados preditiva;
- Governança, LGPD e observabilidade.

---

## 2. Objetivos Estratégicos

| Dimensão | Objetivo |
|-----------|-----------|
| **Cliente** | Garantir uma jornada fluida, natural e sem rupturas entre canais (WhatsApp, Web, Telegram). |
| **Operação** | Automatizar até 70 % das interações repetitivas, mantendo qualidade e contexto. |
| **Negócio** | Reduzir custos operacionais e aumentar conversão de leads para clientes. |
| **Tecnologia** | Arquitetura baseada em nuvem e microserviços, extensível e observável. |

---

## 3. Escopo Funcional

1. Atendimento conversacional com **NLP/LLM**.  
2. **Omnicanalidade via n8n** com contexto persistente.  
3. **OCR + visão computacional** para análise de documentos.  
4. **RPA** para automações de formulários e agendamentos.  
5. **Console de operador humano**, integrado ao fluxo.  
6. **Data Lake e dashboards analíticos**.  
7. **Camadas de segurança e LGPD**.  

---

## 4. Arquitetura Global

```
                    ┌────────────────────────────────┐
                    │         Usuário Final           │
                    │ WhatsApp • Web • Telegram • App │
                    └───────────────┬─────────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │ n8n Omnichannel Gateway     │
                     │  - Conectores nativos       │
                     │  - Webhooks / APIs          │
                     │  - Orquestração de fluxos   │
                     └──────────────┬──────────────┘
                                    │
                     ┌──────────────▼──────────────┐
                     │ Agente de IA Conversacional │
                     │  - NLP/LLM + RAG            │
                     │  - Context Memory           │
                     │  - Intent / Entity Engine   │
                     │  - Fallback Humano          │
                     └──────────────┬──────────────┘
                                    │
               ┌────────────────────▼────────────────────┐
               │ Orquestrador / API Gateway (Nest/FastAPI)│
               │ - Autenticação e Regras                 │
               │ - Roteamento p/ serviços (RPA/OCR/CRM)  │
               └────────────────────┬────────────────────┘
                                    │
    ┌───────────────────────────────▼───────────────────────────────┐
    │ Serviços de Negócio                                            │
    │ OCR • RPA • Pagamentos • CRM • Scheduler • Email               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │ Data & Context Platform       │
                    │ MongoDB / PostgreSQL / S3     │
                    │ ETL → BI (PowerBI / Looker)   │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │ Console do Operador           │
                    │ React/Next + WebSocket + API  │
                    │ Fila Omnicanal + SLA + QA     │
                    └───────────────────────────────┘
```

---

## 5. Componentes Principais e Motivação

### 5.1 n8n — Hub Omnicanal e Orquestrador

**Função:** centralizar mensagens, automações e integrações entre canais e serviços.  
**Motivação:** elimina necessidade de middlewares proprietários (como Twilio), com suporte nativo a WhatsApp Business API, Telegram, Webhook e e-mail.  
**Valor para YOUVISA:**  
- Reduz custo de licenciamento.  
- Permite rápida adição de novos canais.  
- Cria camada única de automação visual e audível (logs e retries).  

---

### 5.2 Agente de IA Conversacional

**Função:** interpretar linguagem natural e manter diálogos contínuos e contextuais.  
**Recursos:**  
- NLP + LLM (Rasa / LangChain + GPT-4 / HuggingFace).  
- Memória contextual persistente (Redis/Mongo).  
- Compreensão semântica + geração contextual.  
- Recuperação de dados via RAG.  
- Integração direta ao n8n e ao console humano.  

**Valor:**  
- Conversas naturais → menor atrito e maior conversão.  
- Resposta imediata → redução de TMA em até 65 %.  
- Aprendizado contínuo (logs alimentam modelo).  

---

### 5.3 OCR + Visão Computacional

**Função:** processar documentos (passaportes, comprovantes, formulários) e extrair dados.  
**Stack sugerida:** AWS Textract, OpenCV, PaddleOCR ou Tesseract.  
**Etapas:** upload → OCR → validação semântica → retorno via n8n.  
**Valor:** precisão documental, redução de retrabalho e validação instantânea.  

---

### 5.4 RPA / Automação de Processos

**Função:** automação de formulários, agendamentos e comunicações.  
**Stack:** UiPath, Robocorp, scripts Python acionados via n8n.  
**Valor:** até 50 % de economia operacional, menos erros manuais, integração direta com IA e front-end.  

---

### 5.5 Console do Operador (Front-end Interno)

**Função:** interface única para o atendimento humano quando o chatbot transfere casos.  

**Características:**  
- Inbox unificada (WhatsApp, Web, Telegram).  
- Fila inteligente com regras por idioma, prioridade e pacote (Basic/Plus/Ultra).  
- Histórico completo da conversa e documentos.  
- Notas internas, macros, automações rápidas (via n8n).  
- Painel supervisor: QA, SLAs, NPS, tempo médio, retrabalho.  
- SSO, RBAC, logs e rastreabilidade.  

**Valor para YOUVISA:**  
- Garantia de qualidade e personalização humana.  
- Governança e métricas centralizadas.  
- Continuidade real entre IA e humano — o operador retoma o contexto completo.  

---

### 5.6 Data & Analytics Platform

**Função:** consolidar logs, interações, métricas e eventos operacionais.  
**Stack:** Kafka (stream), AWS S3 (Data Lake), BigQuery/Athena (DW), Looker/Power BI (visualização).  
**Insights possíveis:**  
- Gargalos de atendimento;  
- Eficiência por canal;  
- Taxa de automação/handoff;  
- Correlação entre perfil do cliente e sucesso de visto.  

---

### 5.7 Segurança e Conformidade

**Camadas de proteção:**  
- Criptografia (AES-256 / TLS 1.3).  
- IAM granular e SSO (OAuth2/SAML).  
- Logs imutáveis (WORM).  
- DLP básico para anexos.  
- Políticas LGPD: consentimento, anonimização, direito ao esquecimento.  
- Monitoramento e alertas de segurança (SIEM).  

**Valor:** garante confiança e compliance em um domínio sensível (dados consulares).  

---

## 6. Fluxo Omnicanal Integrado (Cliente ↔ IA ↔ Humano)

```
Cliente envia msg (WhatsApp)
      │
      ▼
n8n recebe trigger → roteia para Agente IA
      │
      ▼
Agente IA interpreta intenção e contexto
      │
 ┌────┴─────────────┐
 │ Caso resolvível  │──> Executa workflow (RPA/OCR/API)
 │ pelo bot         │     ↓
 │                  │<----Retorna resultado via n8n
 └────┬─────────────┘
      │
      ▼
 Se falha ou complexidade → cria "Case" via API
      │
      ▼
 Console Operador recebe contexto completo
      │
      ▼
 Operador atua, aciona automações (via n8n),
 atualiza status → IA retoma acompanhamento.
```

---

## 7. Plano de Implementação

| Fase | Entregas | Duração |
|------|-----------|----------|
| **S1** | Setup Cloud + n8n + Infra base + RBAC + SSO | 4 sem |
| **S2** | MVP Agente IA (NLP/LLM) + WhatsApp + Context Store | 6 sem |
| **S3** | OCR + RPA + integrações API | 6 sem |
| **S4** | Console Operador + Handoff + QA | 6 sem |
| **S5** | Data Lake + Dashboards + Segurança final | 4 sem |
| **Total** | **26 semanas (~6,5 meses)** | |

---

## 8. Indicadores de Sucesso

| Métrica | Antes | Depois | Variação |
|----------|--------|---------|-----------|
| Tempo médio de atendimento | 35 min | 12 min | −65 % |
| Retrabalho documental | 18 % | < 5 % | −72 % |
| Custo por lead | 100 % | 65 % | −35 % |
| Conversão para cliente | 22 % | 38 % | +16 p.p. |
| NPS médio | 70 | 90 | +20 pts |

---

## 9. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|--------|----------|-----------|
| Erro semântico do NLP | Médio | Fallback humano + retraining contínuo |
| Falha de canal (API WA/Telegram) | Alto | Failover n8n + logs automáticos |
| Vazamento de dados | Crítico | Criptografia + IAM + DLP + auditoria |
| Resistência da equipe | Médio | Treinamento e onboarding progressivo |
| Sobrecarga de fluxos | Médio | Escalabilidade cloud (EKS/Fargate) |

---

## 10. Conclusão

A **Plataforma YOUVISA 360°** entrega uma visão completa da transformação digital no atendimento consular:  
- **Inteligência conversacional** (IA + NLP) humaniza interações.  
- **n8n** orquestra canais, fluxos e automações com agilidade.  
- **OCR e RPA** automatizam tarefas manuais e reduzem erros.  
- **Console do Operador** garante qualidade e empatia no contato humano.  
- **Data & Analytics** tornam o negócio preditivo e orientado a dados.  
- **Segurança e LGPD** preservam reputação e conformidade.

Com essa arquitetura, a YOUVISA posiciona-se como referência em **IA aplicada a serviços consulares**, oferecendo **atendimento fluido, seguro e inteligente**, do primeiro contato até a emissão do visto.

---

## Apêndice Técnico

### A. Modelo de Dados Simplificado

| Entidade | Campos Principais | Observações |
|-----------|-------------------|-------------|
| **Conversation** | id, canal, status, timestamps | Persistência de sessões omnicanal |
| **Message** | id, conversation_id, autor, payload, anexos | Logs auditáveis |
| **Customer** | id, PII (criptografada), preferências, idioma | Conformidade LGPD |
| **Case** | id, tipo, prioridade, fila, owner | Roteamento no console |
| **Document** | id, tipo, OCR_data, hash, validade | Ligado ao pipeline OCR |

### B. Endpoints REST (exemplos)

```
GET /api/v1/conversations/{id}
POST /api/v1/conversations/{id}/messages
POST /api/v1/cases
PATCH /api/v1/cases/{id}/assign
GET /api/v1/documents/{id}/validate
POST /api/v1/workflows/n8n/trigger
```

### C. Estrutura de Workflow n8n (exemplo)

```
Trigger (WhatsApp Message)
   ↓
Webhook → Intent Detection (IA)
   ↓
If intent == "renovar_visto":
      Execute Node (RPA DS-160)
   ↓
If OCR required:
      Upload Document → Validate OCR → Return
   ↓
Else:
      Send reply via channel
```

### D. Diagrama de Sequência Simplificado

```
Cliente → n8n: mensagem
n8n → IA: webhook
IA → API: consulta status
API → RPA/OCR: execução
RPA/OCR → API: resultado
API → IA: resposta consolidada
IA → n8n: output formatado
n8n → Cliente: entrega da mensagem
```

---



