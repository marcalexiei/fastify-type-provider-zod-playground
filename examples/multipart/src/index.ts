import { createApp } from './app.ts';

const app = await createApp();

await app.ready();
const address = await app.listen({ port: 3000 });

app.log.info(`Documentation running at ${address}`);
