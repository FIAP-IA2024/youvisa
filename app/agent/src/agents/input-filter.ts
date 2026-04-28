/**
 * Deterministic prompt-injection guard. Runs BEFORE any LLM call.
 *
 * Sprint 4 governance — see context/specs/2026-04-26-sprint-4-multi-agent/spec.md
 * (Constraints, Success Criteria item 7).
 *
 * Strategy: regex-based detection of common attack patterns + length cap.
 * If the message matches any pattern, the entire pipeline is short-circuited:
 * the bot replies with a deterministic refusal, and the attempt is logged
 * with intent='injection_attempt' so it's visible in the operator console
 * and the customer portal.
 */

interface FilterPattern {
  regex: RegExp;
  reason: string;
}

const PATTERNS: FilterPattern[] = [
  {
    regex: /ignor[ae]?\s*(?:all|the|any|previous|prior|above|todas?\s+as)/i,
    reason: 'instruction_override',
  },
  {
    regex: /you\s+are\s+now\s+(?:dan|jailbroken|developer|admin|free)/i,
    reason: 'role_override',
  },
  {
    regex: /^\s*(?:system|assistant|user|tool)\s*[:>]/im,
    reason: 'system_role_attempt',
  },
  {
    regex: /(?:disregard|forget|override|esque[çc]a|ignore)\s+.{0,30}\s*(?:rules|instructions|prompt|regras|instru[çc][õo]es)/i,
    reason: 'instruction_override',
  },
  {
    regex: /(?:reveal|show|print|expose|tell\s+me|mostre|revele).{0,30}(?:system\s*prompt|system|prompt|instructions|instru[çc][õo]es)/i,
    reason: 'extraction_attempt',
  },
  {
    regex: /<\s*\/?\s*(?:system|user|assistant|tool)\s*>/i,
    reason: 'fake_role_tags',
  },
];

const MAX_LEN = 1000;

export interface InputFilterResult {
  blocked: boolean;
  reason?: string;
  length: number;
  /** For tracer.run: serialize cleanly */
  toTrace(): Record<string, unknown>;
}

export function inputFilter(message: string): InputFilterResult {
  const length = message.length;

  if (length > MAX_LEN) {
    return makeResult(true, 'length', length);
  }

  for (const { regex, reason } of PATTERNS) {
    if (regex.test(message)) {
      return makeResult(true, reason, length);
    }
  }

  return makeResult(false, undefined, length);
}

function makeResult(
  blocked: boolean,
  reason: string | undefined,
  length: number,
): InputFilterResult {
  return {
    blocked,
    reason,
    length,
    toTrace() {
      return { blocked, reason: reason ?? null, length };
    },
  };
}

export const REFUSAL_MESSAGE =
  'Desculpe, não posso processar essa mensagem. Se você tem uma dúvida sobre seu processo de visto, reformule sua pergunta ou digite "atendente" para falar com nossa equipe.';
