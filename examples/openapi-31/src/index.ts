import { createApp } from './app.ts';

const app = await createApp();

app.listen({ port: 3000 });
