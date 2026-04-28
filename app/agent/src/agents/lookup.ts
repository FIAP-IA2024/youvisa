import { findFilesByUserId, findProcessesByUserId } from '@/db/repositories';
import type { Entities, Intent } from '@/orchestrator/types';

export interface LookupResult {
  processes: any[];
  documents: any[];
  toTrace(): Record<string, unknown>;
}

/**
 * Deterministic data fetch based on the (intent, entities) pair.
 *
 * No LLM here — this is a pure DB read step. Keeps the LLM Response
 * Generator grounded in real Mongo data (Sprint 4 governance:
 * "Use APENAS dados fornecidos, NÃO invente").
 */
export async function lookup(
  intent: Intent,
  _entities: Entities,
  userId: string,
): Promise<LookupResult> {
  let processes: any[] = [];
  let documents: any[] = [];

  switch (intent) {
    case 'status_query':
      processes = await findProcessesByUserId(userId, 5);
      // Also include the latest few documents — useful when a process is
      // in pendente_documentos and we want to show what was already sent.
      documents = await findFilesByUserId(userId, 5);
      break;

    case 'document_question':
      processes = await findProcessesByUserId(userId, 1);
      documents = await findFilesByUserId(userId, 10);
      break;

    case 'general':
      // For greetings or off-topic, surface the active process so the
      // response can be grounded ("oi! seu processo X está em análise").
      processes = await findProcessesByUserId(userId, 1);
      break;

    default:
      // open_portal, want_human, provide_email don't need lookup data
      break;
  }

  return {
    processes,
    documents,
    toTrace() {
      return {
        processes_count: processes.length,
        documents_count: documents.length,
      };
    },
  };
}
