import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { BenchmarkReporter } from '../src/reporter/benchmark-reporter.js';
import { FieldPrecisionEvaluator } from '../src/evaluators/field-precision.js';
import { SchemaEvaluator } from '../src/evaluators/schema-evaluator.js';
import { BenchmarkAggregate } from '../src/types/index.js';

const DUMMY_AGGREGATES: BenchmarkAggregate[] = [
  {
    provider: 'gpt-4o-mini',
    totalSamples: 50,
    successRate: 96.0,
    schemaComplianceRate: 95.0,
    avgFieldPrecision: 91.5,
    p50LatencyMs: 240,
    p95LatencyMs: 500,
    avgCostPer1kCallsUsd: 0.41
  },
  {
    provider: 'claude-3-7-sonnet',
    totalSamples: 50,
    successRate: 99.2,
    schemaComplianceRate: 99.6,
    avgFieldPrecision: 98.4,
    p50LatencyMs: 790,
    p95LatencyMs: 1410,
    avgCostPer1kCallsUsd: 7.25
  },
  {
    provider: 'gemini-2.0-flash',
    totalSamples: 50,
    successRate: 98.8,
    schemaComplianceRate: 98.0,
    avgFieldPrecision: 95.7,
    p50LatencyMs: 180,
    p95LatencyMs: 390,
    avgCostPer1kCallsUsd: 0.22
  }
];

describe('BenchmarkReporter Leaderboard & Evaluator Guards', () => {
  it('renders ranked markdown summary comparing precision, latency, and cost', () => {
    const md = BenchmarkReporter.generateMarkdownTable(DUMMY_AGGREGATES);
    expect(md).toContain('| #1 | **claude-3-7-sonnet** |');
    expect(md).toContain('| #2 | **gemini-2.0-flash** |');
    expect(md).toContain('| #3 | **gpt-4o-mini** |');
    expect(md).toContain('98.4%');
    expect(md).toContain('180 ms');
    expect(md).toContain('$0.220');
    expect(md).toContain('Highest Field Precision');
    expect(md).toContain('Lowest p50 Latency');
    expect(md).toContain('Most Cost-Effective');
  });

  it('renders interactive HTML leaderboard with sorting, filter controls, and escaped values', () => {
    const html = BenchmarkReporter.generateHtmlLeaderboard(DUMMY_AGGREGATES, {
      title: 'Test <Leaderboard>',
      generatedAt: '2026-11-24T00:00:00Z'
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Test &lt;Leaderboard&gt;');
    expect(html).toContain('<table id="leaderboard-table">');
    expect(html).toContain('id="provider-filter"');
    expect(html).toContain('claude-3-7-sonnet');
    expect(html).toContain('Top Precision');
    expect(html).toContain('Fastest');
    expect(html).toContain('Lowest Cost');
  });

  it('exports leaderboard.html and leaderboard.md to disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meh-leaderboard-'));
    try {
      const res = await BenchmarkReporter.exportLeaderboard(DUMMY_AGGREGATES, tmpDir);
      expect(path.basename(res.htmlPath)).toBe('leaderboard.html');
      expect(path.basename(res.markdownPath)).toBe('leaderboard.md');

      const [htmlOnDisk, mdOnDisk] = await Promise.all([
        fs.readFile(res.htmlPath, 'utf8'),
        fs.readFile(res.markdownPath, 'utf8')
      ]);
      expect(htmlOnDisk).toContain('claude-3-7-sonnet');
      expect(mdOnDisk).toContain('#1 | **claude-3-7-sonnet**');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('does not score empty string actuals as fuzzy matches or treat arrays as schema objects', () => {
    const precisionRes = FieldPrecisionEvaluator.evaluate({ vendor: 'Acme Corp' }, { vendor: '' });
    expect(precisionRes.precision).toBe(0);
    expect(precisionRes.fieldScores[0].matchType).toBe('MISMATCH');

    const schemaRes = SchemaEvaluator.validate({ vendor: 'string' }, ['unexpected-array']);
    expect(schemaRes.valid).toBe(false);
  });
});
