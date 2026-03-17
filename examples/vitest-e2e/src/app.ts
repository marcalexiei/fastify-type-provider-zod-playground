import fastifySwagger from '@fastify/swagger';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  createJsonSchemaTransform,
  createJsonSchemaTransformObject,
  createSerializerCompiler,
  createValidatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import scalarAPIReference from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(createValidatorCompiler());
  app.setSerializerCompiler(createSerializerCompiler());

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'SampleApi',
        version: '1.0.1',
      },
      openapi: '3.1.0',
      servers: [],
    },
    transform: createJsonSchemaTransform(),
    transformObject: createJsonSchemaTransformObject(),
  });

  app.register(scalarAPIReference, {
    configuration: {
      defaultHttpClient: {
        clientKey: 'fetch',
        targetKey: 'node',
      },
      showDeveloperTools: 'never',
    },
    routePrefix: '/docs',
  });

  app.route({
    handler: (_req, res) => {
      res.send({ number: Math.random() });
    },
    method: 'GET',
    schema: {
      response: {
        200: z.object({ number: z.number() }),
      },
    },
    url: '/random',
  });

  app.route({
    handler: (req, res) => {
      res.send({ body: req.body, status: 'ok' });
    },
    method: 'POST',
    schema: {
      body: z.string(),
      consumes: ['text/html', 'text/plain'],
      response: {
        200: z.object({ body: z.unknown(), status: z.literal('ok') }),
      },
    },
    url: '/body-debug',
  });

  await app.ready();

  return app;
}
