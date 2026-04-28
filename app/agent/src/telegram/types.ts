/**
 * Minimal subset of Telegram Bot API types we care about.
 * Reference: https://core.telegram.org/bots/api#update
 */

import { z } from 'zod';

const userSchema = z.object({
  id: z.number(),
  is_bot: z.boolean(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

const chatSchema = z.object({
  id: z.number(),
  type: z.string(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

const photoSizeSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number(),
  height: z.number(),
  file_size: z.number().optional(),
});

const documentSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().optional(),
});

const messageSchema = z.object({
  message_id: z.number(),
  from: userSchema.optional(),
  chat: chatSchema,
  date: z.number(),
  text: z.string().optional(),
  photo: z.array(photoSizeSchema).optional(),
  document: documentSchema.optional(),
  caption: z.string().optional(),
});

export const updateSchema = z.object({
  update_id: z.number(),
  message: messageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof updateSchema>;
export type TelegramMessage = z.infer<typeof messageSchema>;
export type TelegramUser = z.infer<typeof userSchema>;
