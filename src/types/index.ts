export type ModelProvider = 'gemini-2.0-flash' | 'gemini-2.0-pro' | 'claude-3-7-sonnet' | 'claude-3-5-haiku' | 'gpt-4o' | 'gpt-4o-mini' | 'mock-provider';

export interface MultimodalInput {
  id: string;
  mediaType: 'image' | 'video' | 'document_pdf';
  mediaUrlOrBase64: string;
  prompt: string;
  expectedSchema?: Record<string, any>;
  groundTruth?: Record<string, any>;
}

export interface ProviderTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  mediaUnits?: number; // e.g. number of image tiles or video seconds
}

export interface ProviderResponse {
  provider: ModelProvider;
  latencyMs: number;
  status: 'SUCCESS' | 'RATE_LIMITED_429' | 'TIMEOUT' | 'SCHEMA_ERROR' | 'NETWORK_ERROR';
  rawOutput?: string;
  structuredData?: Record<string, any>;
  tokenUsage: ProviderTokenUsage;
  costUsd: number;
  errorMessage?: string;
}

export interface EvaluationMetric {
  sampleId: string;
  provider: ModelProvider;
  latencyMs: number;
  schemaAdherence: boolean;
  fieldPrecision: number; // 0.0 - 1.0
  costUsd: number;
  passed: boolean;
}

export interface BenchmarkAggregate {
  provider: ModelProvider;
  totalSamples: number;
  successRate: number; // Percentage
  schemaComplianceRate: number; // Percentage
  avgFieldPrecision: number; // Percentage
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgCostPer1kCallsUsd: number;
}
