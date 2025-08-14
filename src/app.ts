import fastifyMultipart, { type MultipartValue } from "@fastify/multipart";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { SwaggerTheme, SwaggerThemeNameEnum } from "swagger-themes";
import type { ZodTypeProvider } from "@marcalexiei/fastify-type-provider-zod";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "@marcalexiei/fastify-type-provider-zod";
import fastify from "fastify";
import { z } from "zod";
import { MULTIPART_MAX_SIZE } from "./constants.ts";

export async function createApp() {
  const app = fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      if (err.validation.some((it) => it.keyword === "too_big")) {
        return reply.code(413).send({
          error: "Response Validation Error",
          message: "Request doesn't match the schema",
          statusCode: 415,
          details: {
            issues: err.validation,
            method: req.method,
            url: req.url,
          },
        });
      }

      return reply.code(400).send({
        error: "Response Validation Error",
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
        error: "Internal Server Error",
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
        title: "SampleApi",
        description: "Sample backend service",
        version: "1.0.0",
      },
      servers: [],
    },
    transform: jsonSchemaTransform,

    // You can also create transform with custom skiplist of endpoints that should not be included in the specification:
    //
    // transform: createJsonSchemaTransform({
    //   skipList: [ '/documentation/static/*' ]
    // })
  });

  const theme = new SwaggerTheme();
  const themeContent = theme.getBuffer(SwaggerThemeNameEnum.DARK);

  app.register(fastifySwaggerUI, {
    routePrefix: "/documentation",
    theme: {
      css: [{ filename: "theme.css", content: themeContent }],
    },
  });

  await app.register(fastifyMultipart, {
    attachFieldsToBody: true,
    limits: {
      fieldSize: MULTIPART_MAX_SIZE * 3,
      fileSize: MULTIPART_MAX_SIZE,
    },
    async onFile(part) {
      (part as unknown as MultipartValue).value = (
        await part.toBuffer()
      ).toString();
    },
  });

  app.after(() => {
    app.withTypeProvider<ZodTypeProvider>().route({
      method: "POST",
      url: "/testing-multi-part",
      schema: {
        consumes: ["multipart/form-data"],
        body: z.object({
          html: z.preprocess((input: MultipartValue) => {
            return input?.valueTruncated
              ? " ".repeat(MULTIPART_MAX_SIZE + 1)
              : input.value;
          }, z.string().max(MULTIPART_MAX_SIZE).describe("html")),
          anotherField: z.preprocess(
            (input: MultipartValue<string>) => {
              try {
                if (input == undefined) return undefined;
                if (typeof input.value === "object") return input;
                return JSON.parse(input.value);
              } catch {
                return input.value;
              }
            },
            z
              .object({ mood: z.array(z.string()) }, { error: "parsing error" })
              .optional()
              .describe("Options")
              .default({ mood: [] })
          ),
          /* another fields here */
        }),
      },
      handler: (req, res) => {
        res.send({ status: "ok", body: req.body });
      },
    });
  });

  return app;
}
