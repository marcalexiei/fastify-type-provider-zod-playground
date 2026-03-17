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

// oxlint-disable-next-line max-lines-per-function
export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();
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

  await app.register(scalarAPIReference, {
    configuration: {
      defaultHttpClient: {
        clientKey: 'fetch',
        targetKey: 'node',
      },
      hiddenClients: {
        /* oxlint-disable id-length */
        c: true,
        clojure: true,
        csharp: true,
        dart: true,
        fsharp: true,
        go: true,
        http: true,
        java: ['unirest', 'asynchttp', 'okhttp'],
        js: true,
        kotlin: true,
        node: ['ofetch', 'undici'],
        objc: true,
        ocaml: true,
        php: true,
        powershell: true,
        python: true,
        r: true,
        ruby: true,
        rust: true,
        shell: ['httpie'],
        swift: true,
        /* oxlint-enable id-length */
      },
      showDeveloperTools: 'never',
    },
    routePrefix: '/docs',
  });

  app.route({
    handler: (req, res) => {
      res.send({ baz: 'asd', user: {}, userId: req.body.userId });
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
    url: '/without-trailing-slash',
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
    url: '/with-trailing-slash/',
  });

  await app.ready();

  return app;
}
