import chokidar from 'chokidar';
import fastify from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { database, env, logger } from './config';
import { ocrOrchestratorService } from './services';

async function startFileWatcher() {
  const watchDir = path.resolve(env.WATCH_DIR);

  logger.info(`Starting file watcher on ${watchDir}`);

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('add', async (filePath) => {
    const filename = path.basename(filePath);
    logger.info('New file detected', { filePath, filename });

    try {
      // Simulate S3 upload by using local path
      const mockBucket = 'local-bucket';
      const mockKey = `telegram/${new Date().toISOString().split('T')[0]}/${filename}`;

      // Process document
      await ocrOrchestratorService.processDocument(mockBucket, mockKey);

      logger.info('File processed successfully', { filename });

      // Optionally move file to processed folder
      const processedDir = path.join(watchDir, 'processed');
      await fs.mkdir(processedDir, { recursive: true });
      await fs.rename(filePath, path.join(processedDir, filename));
    } catch (error) {
      logger.error('Error processing file', { filename, error });
    }
  });

  logger.info('File watcher started successfully');
}

async function startAPI() {
  const app = fastify({ logger: false });

  app.get('/health', async () => {
    return { status: 'ok', mode: 'local', mongodb: database ? 'connected' : 'disconnected' };
  });

  app.post('/process', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'No file provided' });
      }

      const filename = data.filename;
      const buffer = await data.toBuffer();

      // Save to watch folder to trigger processing
      const watchDir = path.resolve(env.WATCH_DIR);
      const filePath = path.join(watchDir, filename);
      await fs.writeFile(filePath, buffer);

      return { success: true, message: 'File queued for processing', filename };
    } catch (error) {
      logger.error('Error in /process endpoint', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  logger.info(`API server listening on port ${env.API_PORT}`);
}

async function main() {
  try {
    logger.info('Starting OCR service in local mode');

    // Connect to database
    await database.connect();

    // Start file watcher
    await startFileWatcher();

    // Start API
    await startAPI();

    logger.info('OCR service started successfully');
  } catch (error) {
    logger.error('Failed to start OCR service', { error });
    process.exit(1);
  }
}

main();
