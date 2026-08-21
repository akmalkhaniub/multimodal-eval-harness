import { IMultimodalAdapter } from '../adapters/provider-adapter.js';
import { MultimodalInput, ProviderResponse } from '../types/index.js';
import { CircuitBreaker } from './circuit-breaker.js';

export interface CascadeResult {
  successfulProvider?: string;
  response?: ProviderResponse;
  attempts: Array<{
    provider: string;
    status: string;
    latencyMs: number;
    error?: string;
  }>;
  totalLatencyMs: number;
  totalCostUsd: number;
  exhausted: boolean;
}

export class MultimodalFallbackCascade {
  private adapters: IMultimodalAdapter[];
  private circuitBreakers: Map<string, CircuitBreaker>;
  private maxRetriesPerProvider: number;

  constructor(adapters: IMultimodalAdapter[], maxRetriesPerProvider: number = 2) {
    if (adapters.length === 0) {
      throw new Error('At least one multimodal adapter is required for the fallback cascade.');
    }
    this.adapters = adapters;
    this.maxRetriesPerProvider = maxRetriesPerProvider;
    this.circuitBreakers = new Map();

    for (const adapter of adapters) {
      this.circuitBreakers.set(adapter.provider, new CircuitBreaker());
    }
  }

  public async execute(input: MultimodalInput): Promise<CascadeResult> {
    const startTime = Date.now();
    const attempts: CascadeResult['attempts'] = [];
    let totalCost = 0;

    for (const adapter of this.adapters) {
      const breaker = this.circuitBreakers.get(adapter.provider)!;

      if (!breaker.isAvailable()) {
        attempts.push({
          provider: adapter.provider,
          status: 'CIRCUIT_BREAKER_OPEN',
          latencyMs: 0,
          error: 'Provider circuit breaker is OPEN due to repeated recent failures.'
        });
        continue;
      }

      // Try with retries
      for (let retry = 0; retry <= this.maxRetriesPerProvider; retry++) {
        try {
          const res = await adapter.process(input);
          totalCost += res.costUsd;

          attempts.push({
            provider: adapter.provider,
            status: res.status,
            latencyMs: res.latencyMs,
            error: res.errorMessage
          });

          if (res.status === 'SUCCESS') {
            breaker.recordSuccess();
            return {
              successfulProvider: adapter.provider,
              response: res,
              attempts,
              totalLatencyMs: Date.now() - startTime,
              totalCostUsd: Number(totalCost.toFixed(6)),
              exhausted: false
            };
          }

          // If rate limited or network error, record failure
          if (res.status === 'RATE_LIMITED_429' || res.status === 'NETWORK_ERROR' || res.status === 'TIMEOUT') {
            breaker.recordFailure();
          }
        } catch (err: any) {
          breaker.recordFailure();
          attempts.push({
            provider: adapter.provider,
            status: 'UNCAUGHT_EXCEPTION',
            latencyMs: 0,
            error: err.message
          });
        }
      }
    }

    return {
      attempts,
      totalLatencyMs: Date.now() - startTime,
      totalCostUsd: Number(totalCost.toFixed(6)),
      exhausted: true
    };
  }
}
