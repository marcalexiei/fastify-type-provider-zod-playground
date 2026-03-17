import { createApp } from './app.ts';

const app = await createApp();

await app.listen({ port: 3000 });
