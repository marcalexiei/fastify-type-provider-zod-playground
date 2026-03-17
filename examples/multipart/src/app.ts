import type { Multipart, MultipartValue } from '@fastify/multipart';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  createJsonSchemaTransform,
  createSerializerCompiler,
  createValidatorCompiler,
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from '@marcalexiei/fastify-type-provider-zod';
import scalarAPIReference from '@scalar/fastify-api-reference';
import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export const MULTIPART_MAX_SIZE = 10 * 1024;

// oxlint-disable-next-line max-lines-per-function
export async function createApp(): Promise<FastifyInstance> {
  const app = fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(createValidatorCompiler());
  app.setSerializerCompiler(createSerializerCompiler());

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({
        details: {
          issues: err.validation,
          method: req.method,
          url: req.url,
        },
        error: 'Response Validation Error',
        message: "Request doesn't match the schema",
        statusCode: 400,
      });
    }

    if (isResponseSerializationError(err)) {
      return reply.code(500).send({
        details: {
          issues: err.cause.issues,
          method: err.method,
          url: err.url,
        },
        error: 'Internal Server Error',
        message: "Response doesn't match the schema",
        statusCode: 500,
      });
    }

    // the rest of the error handler
    return reply.code(500).send(err);
  });

  await app.register(fastifySwagger, {
    openapi: {
      components: {
        securitySchemes: {
          signatureData: {
            in: 'header',
            name: 'SignatureData',
            type: 'apiKey',
          },
          timestamp: {
            description:
              '⚠️ Seconds, not milliseconds. ⚠️<br>Only in documentation: generated automatically, when not provided.',
            in: 'header',
            name: 'timestamp',
            type: 'apiKey',
          },
        },
      },
      info: {
        description: 'Sample backend service',
        title: 'SampleApi',
        version: '1.0.0',
      },
      openapi: '3.1.0',
      security: [{ signatureData: [], timestamp: [] }],
    },
    transform: createJsonSchemaTransform(),
  });

  await app.register(scalarAPIReference, {
    configuration: {
      onBeforeRequest: async ({ request }) => {
        await Promise.resolve(1);
        console.info(request.headers.get('signaturedata'));
        // request.headers.delete('signaturedata')
        request.headers.append('foo', 'bar');
        console.info(Array.from(request.headers.entries()));
      },
    },
    routePrefix: '/docs',
  });

  await app.register(fastifyMultipart, {
    attachFieldsToBody: 'keyValues',
    limits: {
      fieldSize: MULTIPART_MAX_SIZE,
      fileSize: MULTIPART_MAX_SIZE,
    },
    async onFile(part) {
      const buffer = await part.toBuffer();
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
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

      async function processPartAndCheckIfIsTruncated(part: Multipart): Promise<boolean> {
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

      // oxlint-disable-next-line typescript/consistent-return
      async function* guarded(): AsyncGenerator<Multipart> {
        for await (const part of it) {
          if (await processPartAndCheckIfIsTruncated(part)) {
            return res.status(413).send({
              code: 'FST_REQ_FIELD_TOO_LARGE',
              message: `Field "${part.fieldname}" exceeds ${MULTIPART_MAX_SIZE} bytes`,
              statusCode: 413,
            });
          }
          yield part;
        }
      }

      return guarded();
    };

    done();
  });

  app.addHook('preValidation', (req, _res, done) => {
    console.info({ body: req.body, place: 'preValidation' });
    done();
  });

  app.route({
    handler: (req, res) => {
      const bodyKeysType: Partial<Record<string, string>> = {};
      for (const [name, value] of Object.entries(req.body)) {
        bodyKeysType[name] = typeof value;
      }

      res.send({
        body: req.body,
        bodyKeysType,
        status: 'ok',
      });
    },
    method: 'POST',
    schema: {
      body: z.object({
        jsonField: z.preprocess(
          (input) => {
            // oxlint-disable-next-line no-console
            console.info('schema jsonField', input);
            try {
              // Consider using a safer alternative
              if (typeof input === 'string') {
                // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                return JSON.parse(input) as Record<string, unknown>;
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
        stringField: z.preprocess((input) => {
          // oxlint-disable-next-line no-console
          console.info('schema stringField', input);
          return input;
        }, z.string().max(MULTIPART_MAX_SIZE).describe('html')),
      }),
      consumes: ['multipart/form-data'],
    },
    url: '/testing-multi-part',
  });

  return app;
}
