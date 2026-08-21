import { IMultimodalAdapter } from './provider-adapter.js';
import { ModelProvider, MultimodalInput, ProviderResponse, ProviderTokenUsage } from '../types/index.js';
import { MultimodalCostEstimator } from '../evaluators/cost-estimator.js';

export interface MockAdapterOptions {
  simulatedLatencyMs?: number;
  simulatedStatus?: 'SUCCESS' | 'RATE_LIMITED_429' | 'TIMEOUT' | 'SCHEMA_ERROR' | 'NETWORK_ERROR';
  mockData?: Record<string, any>;
  tokenUsage?: ProviderTokenUsage;
}

export class MockMultimodalAdapter implements IMultimodalAdapter {
  public provider: ModelProvider;
  private options: MockAdapterOptions;

  constructor(provider: ModelProvider = 'gemini-2.0-flash', options: MockAdapterOptions = {}) {
    this.provider = provider;
    this.options = {
      simulatedLatencyMs: 150,
      simulatedStatus: 'SUCCESS',
      tokenUsage: { inputTokens: 850, outputTokens: 220, mediaUnits: 1 },
      ...options
    };
  }

  public setOptions(opts: Partial<MockAdapterOptions>) {
    this.options = { ...this.options, ...opts };
  }

  public async process(input: MultimodalInput): Promise<ProviderResponse> {
    const latency = this.options.simulatedLatencyMs || 100;
    const status = this.options.simulatedStatus || 'SUCCESS';
    const usage = this.options.tokenUsage || { inputTokens: 500, outputTokens: 150, mediaUnits: 1 };
    const cost = MultimodalCostEstimator.calculateCost(this.provider, usage);

    if (status !== 'SUCCESS') {
      return {
        provider: this.provider,
        latencyMs: latency,
        status,
        tokenUsage: usage,
        costUsd: cost,
        errorMessage: `Simulated error: ${status}`
      };
    }

    const structuredData = this.options.mockData || input.groundTruth || {
      vendor: 'Sample Vendor',
      invoiceNumber: 'INV-1092',
      totalAmount: 145.50,
      date: '2026-03-15'
    };

    return {
      provider: this.provider,
      latencyMs: latency,
      status: 'SUCCESS',
      structuredData,
      rawOutput: JSON.stringify(structuredData),
      tokenUsage: usage,
      costUsd: cost
    };
  }
}
