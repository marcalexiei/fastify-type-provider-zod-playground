import fastifySwagger from '@fastify/swagger';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import scalarAPIReference from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import z from 'zod';

export async function createApp() {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SampleApi',
        version: '1.0.1',
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  app.register(scalarAPIReference, {
    routePrefix: '/docs',
    configuration: {
      showDeveloperTools: 'never',
      defaultHttpClient: {
        clientKey: 'fetch',
        targetKey: 'node',
      },
    },
  });

  app.route({
    method: 'GET',
    url: '/random',
    schema: {
      response: {
        200: z.object({ number: z.number() }),
      },
    },
    handler: (_, res) => {
      res.send({ number: Math.random() });
    },
  });

  app.route({
    method: 'POST',
    url: '/body-debug',
    schema: {
      consumes: ['text/html', 'text/plain'],
      body: z.string(),
      response: {
        200: z.object({ status: z.literal('ok'), body: z.unknown() }),
      },
    },
    handler: (req, res) => {
      res.send({ status: 'ok', body: req.body });
    },
  });

  await app.ready();

  return app;
}
