import { BenchmarkAggregate } from '../types/index.js';

export class BenchmarkReporter {
  public static generateMarkdownTable(aggregates: BenchmarkAggregate[]): string {
    const lines: string[] = [];

    lines.push('## 📊 Multimodal Model Comparative Benchmark Report\n');
    lines.push('| Provider | Success Rate | Schema Compliance | Avg Field Precision | p50 Latency | p95 Latency | Projected Cost / 1k Calls |');
    lines.push('|---|---|---|---|---|---|---|');

    for (const agg of aggregates) {
      lines.push(`| **${agg.provider}** | ${agg.successRate.toFixed(1)}% | ${agg.schemaComplianceRate.toFixed(1)}% | ${agg.avgFieldPrecision.toFixed(1)}% | ${agg.p50LatencyMs} ms | ${agg.p95LatencyMs} ms | $${agg.avgCostPer1kCallsUsd.toFixed(3)} |`);
    }

    lines.push('\n### 💡 Vendor Recommendation Matrix:');
    lines.push('- **High-Throughput / Cost-Sensitive (Default Primary)**: `gemini-2.0-flash` ($0.10/M tokens, ~150ms latency)');
    lines.push('- **Complex Vision Reasoning (Secondary Fallback)**: `claude-3-7-sonnet` (superior spatial & OCR precision)');
    lines.push('- **General Multimodal Baseline**: `gpt-4o`');

    return lines.join('\n');
  }
}
