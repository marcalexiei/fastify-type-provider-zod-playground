import { createApp } from './app.ts';

async function run() {
  const app = await createApp();

  await app.ready();
  const address = await app.listen({ port: 5174 });

  app.log.info(`Documentation running at ${address}`);
}

run().catch(() => {});
