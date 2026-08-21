import { z, ZodSchema } from 'zod';

export interface SchemaValidationResult {
  valid: boolean;
  parsedData?: any;
  errors: string[];
}

export class SchemaEvaluator {
  public static validate(schema: ZodSchema | Record<string, any>, data: any): SchemaValidationResult {
    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: ['Output data is not a valid JSON object.']
      };
    }

    if (schema instanceof z.ZodType) {
      const parsed = schema.safeParse(data);
      if (parsed.success) {
        return {
          valid: true,
          parsedData: parsed.data,
          errors: []
        };
      } else {
        return {
          valid: false,
          errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        };
      }
    }

    // Key presence verification
    const expectedKeys = Object.keys(schema);
    const missingKeys = expectedKeys.filter(k => !(k in data) || data[k] === null || data[k] === undefined);

    if (missingKeys.length > 0) {
      return {
        valid: false,
        errors: missingKeys.map(k => `Missing required key: '${k}'`)
      };
    }

    return {
      valid: true,
      parsedData: data,
      errors: []
    };
  }
}
