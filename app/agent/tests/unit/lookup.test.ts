import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ConversationModel, FileModel, ProcessModel, UserModel } from '@/db/repositories';
import { lookup } from '@/agents/lookup';

/**
 * Integration-ish test: drives the deterministic lookup() against a
 * real local MongoDB inside the docker network. We connect to the same
 * `mongo` service the agent runs against, but use a unique test database
 * so we don't pollute `youvisa`.
 */
describe('lookup agent (deterministic)', () => {
  const TEST_DB = 'youvisa_test_lookup';

  beforeAll(async () => {
    await mongoose.connect('mongodb://mongo:27017', { dbName: TEST_DB });
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  async function seedUserWithProcess(): Promise<{ userId: string }> {
    const user = await UserModel().create({
      telegram_id: 'tg-test',
      first_name: 'Test',
      is_bot: false,
    });
    const conv = await ConversationModel().create({
      user_id: user._id,
      channel: 'telegram',
      chat_id: 'tg-test',
      status: 'active',
    });
    await ProcessModel().create({
      user_id: user._id,
      conversation_id: conv._id,
      visa_type: 'turismo',
      destination_country: 'EUA',
      status: 'em_analise',
    });
    await FileModel().create({
      conversation_id: conv._id,
      file_id: 'file-1',
      s3_bucket: 'youvisa-files',
      s3_key: 'foo.jpg',
      document_type: 'Passaporte',
    });
    return { userId: String(user._id) };
  }

  it('status_query returns processes + documents', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('status_query', {}, userId);
    expect(r.processes.length).toBe(1);
    expect(r.processes[0].visa_type).toBe('turismo');
    expect(r.documents.length).toBe(1);
    expect(r.documents[0].document_type).toBe('Passaporte');
  });

  it('document_question returns processes (limit 1) + many documents', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('document_question', {}, userId);
    expect(r.processes.length).toBe(1);
    expect(r.documents.length).toBe(1);
  });

  it('general returns only the latest process', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('general', {}, userId);
    expect(r.processes.length).toBe(1);
    expect(r.documents.length).toBe(0);
  });

  it('want_human returns nothing', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('want_human', {}, userId);
    expect(r.processes.length).toBe(0);
    expect(r.documents.length).toBe(0);
  });

  it('open_portal returns nothing', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('open_portal', {}, userId);
    expect(r.processes.length).toBe(0);
    expect(r.documents.length).toBe(0);
  });

  it('returns empty for nonexistent user', async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const r = await lookup('status_query', {}, fakeUserId);
    expect(r.processes.length).toBe(0);
    expect(r.documents.length).toBe(0);
  });

  it('toTrace() exposes counts', async () => {
    const { userId } = await seedUserWithProcess();
    const r = await lookup('status_query', {}, userId);
    expect(r.toTrace()).toEqual({ processes_count: 1, documents_count: 1 });
  });
});
