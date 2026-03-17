import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  createJsonSchemaTransform,
  createJsonSchemaTransformObject,
  createSerializerCompiler,
  createValidatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify();
  app.setValidatorCompiler(createValidatorCompiler());
  app.setSerializerCompiler(createSerializerCompiler());

  const UserIdSchema = z.string().optional().default('J1').meta({
    description: 'User identifier',
    example: 'U234',
    id: 'UserId',
  });

  const UserSchema = z.strictObject({ name: z.string().optional().default('Unknown') }).meta({
    description: 'User Data',
    example: { name: 'Someone' },
    id: 'User',
  });

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

  await app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    handler: (_req, res) => {
      res.send({ baz: '', user: {} });
    },
    method: 'POST',
    schema: {
      body: z.object({
        userId: UserIdSchema,
      }),
      querystring: z.object({
        baz: z.string().meta({
          description: 'query string example',
          example: 'wiiiiiiiiii',
        }),
      }),
      response: {
        200: z.object({
          baz: z.string(),
          user: UserSchema,
          userId: UserIdSchema,
        }),
      },
    },
    url: '/login',
  });

  await app.ready();

  return app;
}
