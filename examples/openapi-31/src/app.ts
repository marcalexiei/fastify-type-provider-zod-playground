import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  validatorCompiler,
  serializerCompiler,
  type ZodTypeProvider,
} from '@marcalexiei/fastify-type-provider-zod';
import z from 'zod';

export async function createApp() {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const UserIdSchema = z.string().optional().default('J1').meta({
    description: 'User identifier',
    example: 'U234',
    id: 'UserId',
  });

  const UserSchema = z
    .strictObject({ name: z.string().optional().default('Unknown') })
    .meta({
      description: 'User Data',
      example: { name: 'Someone' },
      id: 'User',
    });

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

  await app.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/login',
    schema: {
      querystring: z.object({
        baz: z.string().meta({
          description: 'query string example',
          example: 'wiiiiiiiiii',
        }),
      }),
      body: z.object({
        userId: UserIdSchema,
      }),
      response: {
        200: z.object({
          baz: z.string(),
          userId: UserIdSchema,
          user: UserSchema,
        }),
      },
    },
    handler: (_, res) => {
      res.send({} as never);
    },
  });

  await app.ready();

  return app;
}
