import type { Multipart, MultipartValue } from '@fastify/multipart';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import scalarUI from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import { z } from 'zod';

export const MULTIPART_MAX_SIZE = 10 * 1024;

export async function createApp() {
  const app = fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        error: 'Response Validation Error',
        message: "Request doesn't match the schema",
        statusCode: 400,
        details: {
          issues: err.validation,
          method: req.method,
          url: req.url,
        },
      });
    }

    if (isResponseSerializationError(err)) {
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: "Response doesn't match the schema",
        statusCode: 500,
        details: {
          issues: err.cause.issues,
          method: err.method,
          url: err.url,
        },
      });
    }

    // the rest of the error handler
    return reply.code(500).send(err);
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SampleApi',
        description: 'Sample backend service',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          timestamp: {
            type: 'apiKey',
            description:
              '⚠️ Seconds, not milliseconds. ⚠️<br>Only in documentation: generated automatically, when not provided.',
            in: 'header',
            name: 'timestamp',
          },
          signatureData: {
            type: 'apiKey',
            in: 'header',
            name: 'SignatureData',
          },
        },
      },
      security: [{ timestamp: [], signatureData: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(scalarUI, {
    routePrefix: '/docs',
    configuration: {
      onBeforeRequest: async ({ request }) => {
        await Promise.resolve(1);
        console.info(request.headers.get('signaturedata'));
        // request.headers.delete('signaturedata')
        request.headers.append('foo', 'bar');
        console.info(Array.from(request.headers.entries()));
      },
    },
  });

  await app.register(fastifyMultipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
      fieldSize: MULTIPART_MAX_SIZE,
      fileSize: MULTIPART_MAX_SIZE,
    },
    async onFile(part) {
      const buffer = await part.toBuffer();
      (part as unknown as MultipartValue).value = buffer.toString();
    },
  });

  app.addHook('onRequest', (req, res, done) => {
    if (!req.headers['content-type']?.trim().startsWith('multipart/')) {
      done();
      return;
    }

    const originalParts = req.parts.bind(req);
    // Override per-request parts() with a guarded iterator
    req.parts = function parts(opts): AsyncGenerator<Multipart> {
      const it = originalParts({
        ...opts,
        limits: {
          fieldSize: MULTIPART_MAX_SIZE,
          ...(opts?.limits ?? {}),
        },
      });

      async function processPartAndCheckIfIsTruncated(
        part: Multipart,
      ): Promise<boolean> {
        if (part.type !== 'field' || !part.valueTruncated) {
          return false;
        }

        // Drain remaining parts so the socket is reusable
        for await (const rest of it) {
          if (rest.type === 'file') {
            rest.file.resume();
          }
        }
        return true;
      }

      async function* guarded(): AsyncGenerator<Multipart> {
        for await (const part of it) {
          if (await processPartAndCheckIfIsTruncated(part)) {
            return res.status(413).send({
              statusCode: 413,
              code: 'FST_REQ_FIELD_TOO_LARGE',
              message: `Field "${part.fieldname}" exceeds ${MULTIPART_MAX_SIZE} bytes`,
            });
          }
          yield part;
        }
      }

      return guarded();
    };

    done();
  });

  app.addHook('preValidation', (req, _, done) => {
    console.info({ place: 'preValidation', body: req.body });
    done();
  });

  app.route({
    method: 'POST',
    url: '/testing-multi-part',
    schema: {
      consumes: ['multipart/form-data'],
      body: z.object({
        stringField: z.preprocess((input) => {
          console.info('schema stringField', input);
          return input;
        }, z.string().max(MULTIPART_MAX_SIZE).describe('html')),
        jsonField: z.preprocess(
          (input) => {
            console.info('schema jsonField', input);
            try {
              // Consider using a safer alternative
              if (typeof input === 'string') {
                return JSON.parse(input);
              }
              return input;
            } catch {
              return input;
            }
          },
          z
            .strictObject({ mood: z.array(z.string()) })
            .optional()
            .describe('Options')
            .default({ mood: [] }),
        ),
      }),
    },
    handler: (req, res) => {
      const bodyKeysType: Partial<Record<string, string>> = {};
      for (const [name, value] of Object.entries(req.body)) {
        bodyKeysType[name] = typeof value;
      }

      res.send({
        status: 'ok',
        bodyKeysType,
        body: req.body,
      });
    },
  });

  return app;
}
