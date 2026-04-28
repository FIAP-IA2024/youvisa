/**
 * Deterministic guard on the LLM's response. Catches violations of the
 * governance rules even when the system prompt fails to enforce them.
 *
 * Sprint 4 governance — defense-in-depth alongside the prompt itself.
 */

interface ForbiddenPattern {
  regex: RegExp;
  reason: string;
}

const FORBIDDEN: ForbiddenPattern[] = [
  // Internal status codes leaked
  {
    regex: /\b(?:em_analise|pendente_documentos|status_query|document_question|want_human|open_portal|injection_attempt)\b/i,
    reason: 'internal_code',
  },
  // Specific timeframes
  {
    regex: /\bem\s+\d+\s+dias?\b/i,
    reason: 'prazo',
  },
  {
    regex: /\bprazo\s+de\s+\d+/i,
    reason: 'prazo',
  },
  {
    regex: /\bprevis[ãa]o\s+de\s+\d+/i,
    reason: 'prazo',
  },
  // Placeholder leaks
  {
    regex: /\ba_definir\b/i,
    reason: 'placeholder_a_definir',
  },
  {
    regex: /\b[Aa] definir\b/,
    reason: 'placeholder_a_definir',
  },
];

export interface OutputFilterResult {
  allowed: boolean;
  reason?: string;
  toTrace(): Record<string, unknown>;
}

export function outputFilter(text: string): OutputFilterResult {
  for (const { regex, reason } of FORBIDDEN) {
    if (regex.test(text)) {
      return {
        allowed: false,
        reason,
        toTrace() {
          return { allowed: false, reason };
        },
      };
    }
  }
  return {
    allowed: true,
    toTrace() {
      return { allowed: true };
    },
  };
}

export const FALLBACK_MESSAGE =
  'Desculpe, não consegui formular uma resposta adequada agora. Você pode falar com nossa equipe digitando "atendente".';
