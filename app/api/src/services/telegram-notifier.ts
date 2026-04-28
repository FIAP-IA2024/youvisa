import { inject, injectable } from 'tsyringe';

import { EnvConfig, LoggerConfig } from '@/config';

/**
 * Sends Telegram messages from the API.
 * Used by StatusNotifierService when a visa-process status transitions.
 *
 * Sprint 4 governance: this is a deterministic notifier (templates only).
 * It does NOT invoke any LLM — see context/learnings/status-notifications-deterministic.md.
 */
@injectable()
export class TelegramNotifier {
  constructor(
    @inject('EnvConfig') private readonly env: EnvConfig,
    @inject('LoggerConfig') private readonly logger: LoggerConfig,
  ) {}

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.env.TELEGRAM_BOT_TOKEN) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN not set; skipping Telegram notification',
        { chatId },
      );
      return false;
    }

    const url = `https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error('Telegram sendMessage failed', {
          status: res.status,
          body,
          chatId,
        });
        return false;
      }

      this.logger.info('Telegram notification sent', { chatId });
      return true;
    } catch (err: any) {
      this.logger.error('Telegram sendMessage error', {
        error: err.message,
        chatId,
      });
      return false;
    }
  }
}
