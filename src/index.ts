import { app } from "./app.ts";

async function run() {
  await app.ready();
  const address = await app.listen({ port: 5173 });

  app.log.info(`Documentation running at ${address}`);
}

run().catch(() => {});
