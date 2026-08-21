import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { SchemaEvaluator } from '../src/evaluators/schema-evaluator.js';
import { FieldPrecisionEvaluator } from '../src/evaluators/field-precision.js';

describe('Multimodal Evaluators (Schema Compliance & Field Precision)', () => {
  const invoiceSchema = z.object({
    invoiceNumber: z.string(),
    totalAmount: z.number(),
    vendor: z.string()
  });

  it('should validate structured JSON against Zod schema', () => {
    const validOutput = {
      invoiceNumber: 'INV-2026-991',
      totalAmount: 450.75,
      vendor: 'AWS Cloud Services'
    };

    const result = SchemaEvaluator.validate(invoiceSchema, validOutput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should catch schema non-compliance and report missing keys', () => {
    const invalidOutput = {
      invoiceNumber: 'INV-2026-991'
      // missing totalAmount and vendor
    };

    const result = SchemaEvaluator.validate(invoiceSchema, invalidOutput);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should calculate field precision with string and numeric tolerance', () => {
    const groundTruth = {
      vendor: 'Google Cloud Platform',
      amount: 100.0,
      currency: 'USD'
    };

    const extracted = {
      vendor: 'google cloud platform',
      amount: 101.5, // within 2% tolerance
      currency: 'USD'
    };

    const evalResult = FieldPrecisionEvaluator.evaluate(groundTruth, extracted);
    expect(evalResult.precision).toBeGreaterThan(0.95);
    expect(evalResult.fieldScores.find(f => f.field === 'amount')?.matchType).toBe('NUMERIC_TOLERANT');
  });
});
