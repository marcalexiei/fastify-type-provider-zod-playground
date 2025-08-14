import fastifyMultipart, {
  type Multipart,
  type MultipartValue,
} from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import type { ZodTypeProvider } from '@marcalexiei/fastify-type-provider-zod';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from '@marcalexiei/fastify-type-provider-zod';
import fastify from 'fastify';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';
import { z } from 'zod';

export const MULTIPART_MAX_SIZE = 10 * 1024;

export async function createApp() {
  const app = fastify();
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

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'SampleApi',
        description: 'Sample backend service',
        version: '1.0.0',
      },
      servers: [],
    },
    transform: jsonSchemaTransform,
  });

  const theme = new SwaggerTheme();
  const themeContent = theme.getBuffer(SwaggerThemeNameEnum.DARK);

  app.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
    theme: {
      css: [{ filename: 'theme.css', content: themeContent }],
    },
  });

  await app.register(fastifyMultipart, {
    attachFieldsToBody: true,
    limits: {
      fieldSize: MULTIPART_MAX_SIZE,
      fileSize: MULTIPART_MAX_SIZE,
    },
    async onFile(part) {
      (part as unknown as MultipartValue).value = (
        await part.toBuffer()
      ).toString();
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

  app.after(() => {
    app.withTypeProvider<ZodTypeProvider>().route({
      method: 'POST',
      url: '/testing-multi-part',
      schema: {
        consumes: ['multipart/form-data'],
        body: z.object({
          html: z.preprocess(
            (input: MultipartValue) => input.value,
            z.string().max(MULTIPART_MAX_SIZE).describe('html'),
          ),
          anotherField: z.preprocess(
            (input: MultipartValue<string>) => {
              try {
                if (input === undefined) {
                  return;
                }
                if (typeof input.value === 'object') {
                  return input;
                }
                return JSON.parse(input.value);
              } catch {
                return input.value;
              }
            },
            z
              .object({ mood: z.array(z.string()) }, { error: 'parsing error' })
              .optional()
              .describe('Options')
              .default({ mood: [] }),
          ),
          /* another fields here */
        }),
      },
      handler: (req, res) => {
        res.send({ status: 'ok', body: req.body });
      },
    });
  });

  return app;
}
