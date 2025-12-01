import z, { ZodSchema } from 'zod/v3'

export function jsonStringOfSchema(schema: ZodSchema) {
  return z
    .string()
    .transform((val, ctx) => {
      try {
        return JSON.parse(val)
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
        return z.NEVER
      }
    })
    .pipe(schema)
}
