import fastifySwagger from '@fastify/swagger';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import scalarUI from '@scalar/fastify-api-reference';
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

  await app.register(scalarUI, {
    routePrefix: '/docs',
    configuration: {
      showToolbar: 'never',
      defaultHttpClient: {
        clientKey: 'fetch',
        targetKey: 'node',
      },
      hiddenClients: {
        c: true,
        r: true,
        go: true,
        rust: true,
        clojure: true,
        csharp: true,
        dart: true,
        http: true,
        fsharp: true,
        java: ['unirest', 'asynchttp', 'okhttp'],
        js: true,
        kotlin: true,
        node: ['ofetch', 'undici'],
        objc: true,
        ocaml: true,
        php: true,
        powershell: true,
        python: true,
        ruby: true,
        shell: ['httpie'],
        swift: true,
      },
    },
  });

  app.route({
    method: 'POST',
    url: '/test',
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
