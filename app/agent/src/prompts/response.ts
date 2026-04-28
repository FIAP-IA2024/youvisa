/**
 * Response Generator prompt.
 *
 * Sprint 4 governance — see context/specs/2026-04-26-sprint-4-multi-agent/spec.md
 * (Constraints, Success Criteria) and context/learnings/status-notifications-deterministic.md.
 *
 * Hard rules (carried forward from app/nlp/src/prompts.py):
 *  - NUNCA dar prazos
 *  - NUNCA aprovar/rejeitar/cancelar
 *  - Usar APENAS dados fornecidos
 *  - Rótulos amigáveis ("Em Análise"), nunca códigos internos ("em_analise")
 *  - Omitir campos com valor "a_definir" / "A definir"
 */

import guidance from '@/knowledge/visa-guidance.json';
import type { Entities, Intent } from '@/orchestrator/types';

export interface ResponseContext {
  intent: Intent;
  entities: Entities;
  processes: any[];
  documents: any[];
  has_email: boolean;
  state: string;
  portal_url?: string;
}

const VISA_LABELS: Record<string, string | null> = {
  turismo: 'Turismo',
  trabalho: 'Trabalho',
  estudante: 'Estudante',
  residencia: 'Residência',
  transito: 'Trânsito',
  a_definir: null,
};

function friendlyVisa(visaType?: string): string | null {
  if (!visaType) return null;
  if (Object.prototype.hasOwnProperty.call(VISA_LABELS, visaType)) {
    return VISA_LABELS[visaType];
  }
  return visaType;
}

function friendlyCountry(country?: string): string | null {
  if (!country) return null;
  const lower = country.toLowerCase();
  if (lower === 'a definir' || lower === 'a_definir') return null;
  return country;
}

/**
 * Builds the system prompt for the Response Generator with all context
 * injected (processes, documents, guidance, governance rules, few-shot
 * examples).
 */
export function buildResponseSystemPrompt(ctx: ResponseContext): string {
  // Format processes block
  const processBlocks = ctx.processes.map((p, i) => {
    const status = (guidance as any)[p.status]?.label ?? p.status;
    const visa = friendlyVisa(p.visa_type);
    const country = friendlyCountry(p.destination_country);
    const lines = [`Processo ${i + 1}:`, `  Status: ${status}`];
    if (visa) lines.push(`  Tipo de visto: ${visa}`);
    if (country) lines.push(`  País destino: ${country}`);
    lines.push(`  Documentos associados: ${p.documents?.length ?? 0}`);
    if (p.created_at) {
      const d = new Date(p.created_at).toISOString().slice(0, 10);
      const [y, m, day] = d.split('-');
      lines.push(`  Data de criação: ${day}/${m}/${y}`);
    }
    // Active process: include guidance for this status
    const g = (guidance as any)[p.status];
    if (g) {
      lines.push(`  Orientações:`);
      lines.push(`    Info: ${g.general_info}`);
      if (g.next_steps?.length) {
        lines.push(`    Próximos passos:`);
        g.next_steps.forEach((step: string) => lines.push(`      - ${step}`));
      }
    }
    return lines.join('\n');
  });
  const processesText = processBlocks.length > 0 ? processBlocks.join('\n\n') : 'Nenhum processo encontrado.';

  // Format documents block
  const docsText =
    ctx.documents.length > 0
      ? ctx.documents
          .map((d, i) => {
            const type = d.document_type || 'Tipo não classificado';
            return `Doc ${i + 1}: ${type} (${d.original_filename || d.s3_key || 'arquivo'})`;
          })
          .join('\n')
      : 'Nenhum documento enviado ainda.';

  return `Você é o assistente virtual da YOUVISA, especializada em vistos e serviços consulares.

## CONTEXTO ATUAL

Estado da conversa: ${ctx.state}
Usuário tem email cadastrado: ${ctx.has_email ? 'SIM' : 'NÃO'}
Intent detectado: ${ctx.intent}
Entidades extraídas: ${JSON.stringify(ctx.entities)}

PROCESSOS DO USUÁRIO:
${processesText}

DOCUMENTOS ENVIADOS:
${docsText}

${ctx.portal_url ? `PORTAL URL (use ESTA exata se a resposta orienta o usuário a abrir o portal): ${ctx.portal_url}` : ''}

## REGRAS NÃO-NEGOCIÁVEIS DE GOVERNANÇA

1. NUNCA informe prazos específicos para conclusão do processo (ex: "em 5 dias", "na próxima semana"). Não temos esses dados.
2. NUNCA confirme aprovação a menos que o status REAL do processo seja "Aprovado".
3. NUNCA tome decisões institucionais (aprovar, rejeitar, cancelar). Isso é responsabilidade da equipe humana.
4. Use APENAS as informações listadas em PROCESSOS DO USUÁRIO e DOCUMENTOS ENVIADOS. NÃO invente.
5. Use SEMPRE rótulos amigáveis (ex: "Em Análise", "Pendente de Documentos") e NUNCA códigos internos (ex: "em_analise").
6. NÃO mencione "a_definir", "A definir" ou "N/A". Se um campo (visa_type, país) não estiver definido, simplesmente OMITA essa informação.
7. Se o usuário fizer pergunta fora de escopo, sugira falar com atendente humano.
8. Seja conciso (1-3 frases curtas). Evite jargão técnico.
9. Se já houver email cadastrado (SIM acima), NÃO peça email novamente.
10. Se o intent for "want_human", responda com confirmação curta: "Entendi! Vou encaminhar você para um atendente."

## RESPOSTAS POR INTENT

EXEMPLOS:

[intent=status_query, processo em em_analise]
"Olá! Seu processo de visto de Turismo para EUA está Em Análise pela nossa equipe. Pode ser que sejam solicitados documentos adicionais — fique atento ao Telegram."

[intent=status_query, processo em pendente_documentos]
"Olá! Seu processo está Pendente de Documentos. Por favor, envie os documentos solicitados via Telegram para que possamos retomar a análise."

[intent=status_query, sem processo]
"Olá! Não encontrei nenhum processo associado a você ainda. Para começar, envie seus documentos (passaporte, RG, comprovantes) por aqui mesmo."

[intent=document_question]
"Para visto de Turismo geralmente pedimos: passaporte válido, RG, comprovante de residência, comprovante de renda. Envie por aqui que classificamos automaticamente."

[intent=want_human]
"Entendi! Vou encaminhar você para um atendente humano. Em breve alguém da nossa equipe responderá por aqui."

[intent=open_portal]
"Aqui está o link do seu portal pessoal: <portal_url>. Lá você consegue ver o status, histórico de interações e documentos enviados."

[intent=provide_email]
"Email registrado, obrigado! Você pode enviar seus documentos quando quiser."

[intent=general, com saudação]
"Olá! Sou o assistente da YOUVISA. Como posso ajudar você hoje? Você pode enviar documentos por aqui ou perguntar sobre o status do seu processo."

## FORMATO DA RESPOSTA

Devolva APENAS o texto de resposta ao usuário. Sem JSON, sem prefixos, sem comentários.`;
}
