import { inject, injectable } from 'tsyringe';

import { LoggerConfig } from '@/config';
import {
  ConversationRepository,
  ProcessRepository,
  UserRepository,
} from '@/repositories';
import { TelegramNotifier } from './telegram-notifier';

/**
 * Sends user-facing notifications when a visa-process status changes.
 *
 * Templates are HARDCODED (Sprint 4 governance — see
 * context/learnings/status-notifications-deterministic.md). No LLM
 * call happens in this path; risk of hallucination in official
 * communication is zero.
 *
 * Pre-Sprint-4 this responsibility lived in an n8n workflow
 * (status-notification.template.json). Phase 2 of Sprint 4 moved it
 * here so we can drop n8n entirely in Phase 10.
 */

interface TemplateContext {
  from: string;
  to: string;
  userName: string;
  visaType?: string;
  country?: string;
  reason?: string;
}

const VISA_LABELS: Record<string, string | null> = {
  turismo: 'Turismo',
  trabalho: 'Trabalho',
  estudante: 'Estudante',
  residencia: 'Residência',
  transito: 'Trânsito',
  a_definir: null,
};

@injectable()
export class StatusNotifierService {
  constructor(
    @inject('TelegramNotifier') private readonly telegram: TelegramNotifier,
    @inject('ProcessRepository')
    private readonly processRepo: ProcessRepository,
    @inject('ConversationRepository')
    private readonly conversationRepo: ConversationRepository,
    @inject('UserRepository') private readonly userRepo: UserRepository,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  /**
   * Pure rendering: deterministic template selection by status pair.
   * Made public so it can be unit-tested in isolation.
   */
  renderTemplate(ctx: TemplateContext): string {
    // Visa: known label wins; unknown but present types pass through;
    // explicit null in VISA_LABELS (e.g., 'a_definir') => omit entirely.
    let visa: string | null = null;
    if (ctx.visaType) {
      if (Object.prototype.hasOwnProperty.call(VISA_LABELS, ctx.visaType)) {
        visa = VISA_LABELS[ctx.visaType]; // may be null (omit)
      } else {
        visa = ctx.visaType;
      }
    }

    const country =
      ctx.country && ctx.country.toLowerCase() !== 'a definir' && ctx.country.toLowerCase() !== 'a_definir'
        ? ctx.country
        : null;

    const visaPhrase = this.buildVisaPhrase(visa, country);

    const key = `${ctx.from}->${ctx.to}`;
    switch (key) {
      case 'recebido->em_analise':
        return `Olá ${ctx.userName}! ${visaPhrase ? `Seus documentos${visaPhrase} foram recebidos` : 'Seus documentos foram recebidos'} e estão sendo analisados pela nossa equipe.`;
      case 'em_analise->pendente_documentos':
        return `Olá ${ctx.userName}! Precisamos de documentos adicionais${visaPhrase ? ` para seu processo${visaPhrase}` : ' para seu processo'}.${ctx.reason ? ` Motivo: ${ctx.reason}.` : ''} Por favor, envie os documentos solicitados.`;
      case 'pendente_documentos->em_analise':
        return `Olá ${ctx.userName}! Recebemos seus documentos${visaPhrase ? ` para o processo${visaPhrase}` : ''} e retomamos a análise.`;
      case 'em_analise->aprovado':
        return `Parabéns ${ctx.userName}! Seu processo${visaPhrase ? visaPhrase : ' de visto'} foi aprovado! Em breve enviaremos as instruções dos próximos passos.`;
      case 'em_analise->rejeitado':
        return `Olá ${ctx.userName}. Infelizmente seu processo${visaPhrase ? visaPhrase : ' de visto'} não foi aprovado neste momento. Recomendamos entrar em contato com nossa equipe para mais detalhes.`;
      case 'aprovado->finalizado':
        return `Olá ${ctx.userName}! Seu processo${visaPhrase ? visaPhrase : ' de visto'} foi finalizado com sucesso! Obrigado por utilizar a YOUVISA.`;
      default:
        if (ctx.to === 'cancelado') {
          return `Olá ${ctx.userName}. Seu processo${visaPhrase ? visaPhrase : ' de visto'} foi cancelado.${ctx.reason ? ` Motivo: ${ctx.reason}.` : ''} Entre em contato se precisar de mais informações.`;
        }
        // Generic fallback for any unmapped transition
        return `Olá ${ctx.userName}. O status do seu processo${visaPhrase ? visaPhrase : ''} foi atualizado.`;
    }
  }

  /**
   * Look up process + user + conversation, render the template, send via Telegram.
   * Called by ProcessController right after a successful FSM transition.
   * Best-effort: does NOT throw — failure to notify must not roll back the FSM transition.
   */
  async notifyStatusChange(
    processId: string,
    fromStatus: string,
    toStatus: string,
    reason: string = '',
  ): Promise<void> {
    try {
      const process = await this.processRepo.findById(processId);
      if (!process) {
        this.logger.warn('Process not found for status notification', {
          processId,
        });
        return;
      }

      const user = await this.userRepo.findById(String(process.user_id));
      if (!user) {
        this.logger.warn('User not found for status notification', {
          processId,
          userId: process.user_id,
        });
        return;
      }

      // Find the user's Telegram conversation (chat_id) — most recent
      const conversations = await this.conversationRepo.findAllByUser(
        String(user._id),
      );
      const conv = conversations.find((c) => c.channel === 'telegram');
      if (!conv?.chat_id) {
        this.logger.warn('No telegram chat_id for user; skipping notification', {
          userId: user._id,
        });
        return;
      }

      const userName = user.first_name || user.username || 'cliente';
      const text = this.renderTemplate({
        from: fromStatus,
        to: toStatus,
        userName,
        visaType: process.visa_type,
        country: process.destination_country,
        reason,
      });

      await this.telegram.sendMessage(conv.chat_id, text);
    } catch (err: any) {
      this.logger.error('notifyStatusChange failed', {
        error: err.message,
        processId,
        fromStatus,
        toStatus,
      });
    }
  }

  private buildVisaPhrase(
    visa: string | null,
    country: string | null,
  ): string {
    if (visa && country) return ` de ${visa.toLowerCase()} para ${country}`;
    if (visa) return ` de ${visa.toLowerCase()}`;
    if (country) return ` para ${country}`;
    return '';
  }
}
