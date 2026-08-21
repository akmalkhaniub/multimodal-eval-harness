import { describe, it, expect } from 'vitest';
import { MultimodalCostEstimator } from '../src/evaluators/cost-estimator.js';

describe('Multimodal Cost Estimator & FinOps Tracker', () => {
  it('should accurately calculate Gemini 2.0 Flash cost including media units', () => {
    const cost = MultimodalCostEstimator.calculateCost('gemini-2.0-flash', {
      inputTokens: 1000,
      outputTokens: 500,
      cachedTokens: 200,
      mediaUnits: 1
    });

    expect(cost).toBeGreaterThan(0);
    // (800 / 1M * 0.1) + (200 / 1M * 0.025) + (500 / 1M * 0.4) + (1 * 0.00013)
    // 0.00008 + 0.000005 + 0.0002 + 0.00013 = ~0.000415
    expect(cost).toBeCloseTo(0.000415, 5);
  });

  it('should project cost per 1k requests accurately', () => {
    const costPer1k = MultimodalCostEstimator.projectCostPer1k('claude-3-7-sonnet', {
      inputTokens: 2000,
      outputTokens: 400,
      mediaUnits: 1
    });

    expect(costPer1k).toBeGreaterThan(1.0); // Claude Sonnet runs around $16-$17 per 1k complex multimodal calls
  });
});
