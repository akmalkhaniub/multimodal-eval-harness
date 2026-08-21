import { ModelProvider, ProviderTokenUsage } from '../types/index.js';

export interface ModelPricingTier {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  cachedInputPerMillionUsd: number;
  perMediaUnitUsd: number; // e.g. per high-res image tile
}

export const PRICING_REGISTRY: Record<ModelProvider, ModelPricingTier> = {
  'gemini-2.0-flash': {
    inputPerMillionUsd: 0.10,
    outputPerMillionUsd: 0.40,
    cachedInputPerMillionUsd: 0.025,
    perMediaUnitUsd: 0.00013 // ~258 tokens per standard image
  },
  'gemini-2.0-pro': {
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 5.00,
    cachedInputPerMillionUsd: 0.31,
    perMediaUnitUsd: 0.00065
  },
  'claude-3-7-sonnet': {
    inputPerMillionUsd: 3.00,
    outputPerMillionUsd: 15.00,
    cachedInputPerMillionUsd: 0.30,
    perMediaUnitUsd: 0.0048 // ~1600 tokens per image tile
  },
  'claude-3-5-haiku': {
    inputPerMillionUsd: 0.80,
    outputPerMillionUsd: 4.00,
    cachedInputPerMillionUsd: 0.08,
    perMediaUnitUsd: 0.0016
  },
  'gpt-4o': {
    inputPerMillionUsd: 2.50,
    outputPerMillionUsd: 10.00,
    cachedInputPerMillionUsd: 1.25,
    perMediaUnitUsd: 0.0036
  },
  'gpt-4o-mini': {
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.60,
    cachedInputPerMillionUsd: 0.075,
    perMediaUnitUsd: 0.00022
  },
  'mock-provider': {
    inputPerMillionUsd: 0.00,
    outputPerMillionUsd: 0.00,
    cachedInputPerMillionUsd: 0.00,
    perMediaUnitUsd: 0.00
  }
};

export class MultimodalCostEstimator {
  /**
   * Calculate exact cost in USD for an API call
   */
  public static calculateCost(provider: ModelProvider, usage: ProviderTokenUsage): number {
    const tier = PRICING_REGISTRY[provider] || PRICING_REGISTRY['gemini-2.0-flash'];

    const cachedTokens = usage.cachedTokens || 0;
    const freshInputTokens = Math.max(0, usage.inputTokens - cachedTokens);

    const inputCost = (freshInputTokens / 1_000_000) * tier.inputPerMillionUsd;
    const cachedCost = (cachedTokens / 1_000_000) * tier.cachedInputPerMillionUsd;
    const outputCost = (usage.outputTokens / 1_000_000) * tier.outputPerMillionUsd;
    const mediaCost = (usage.mediaUnits || 0) * tier.perMediaUnitUsd;

    return Number((inputCost + cachedCost + outputCost + mediaCost).toFixed(6));
  }

  /**
   * Project cost for 1,000 requests
   */
  public static projectCostPer1k(provider: ModelProvider, avgUsage: ProviderTokenUsage): number {
    const singleCost = this.calculateCost(provider, avgUsage);
    return Number((singleCost * 1000).toFixed(3));
  }
}
