import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BenchmarkAggregate } from '../types/index.js';

export interface LeaderboardExportResult {
  htmlPath: string;
  markdownPath: string;
  html: string;
  markdown: string;
}

export interface HtmlLeaderboardOptions {
  title?: string;
  generatedAt?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export class BenchmarkReporter {
  /**
   * Rank aggregates by highest average field precision, then schema compliance, then lowest cost.
   */
  public static rankAggregates(aggregates: BenchmarkAggregate[]): BenchmarkAggregate[] {
    return [...aggregates].sort((a, b) => {
      if (b.avgFieldPrecision !== a.avgFieldPrecision) {
        return b.avgFieldPrecision - a.avgFieldPrecision;
      }
      if (b.schemaComplianceRate !== a.schemaComplianceRate) {
        return b.schemaComplianceRate - a.schemaComplianceRate;
      }
      return a.avgCostPer1kCallsUsd - b.avgCostPer1kCallsUsd;
    });
  }

  public static generateMarkdownTable(aggregates: BenchmarkAggregate[]): string {
    const ranked = this.rankAggregates(aggregates);
    const lines: string[] = [];

    lines.push('## 📊 Multimodal Model Comparative Benchmark Report\n');
    if (ranked.length === 0) {
      lines.push('_No benchmark samples recorded._');
      return lines.join('\n');
    }

    lines.push('| Rank | Provider | Samples | Success Rate | Schema Compliance | Avg Field Precision | p50 Latency | p95 Latency | Projected Cost / 1k Calls |');
    lines.push('|---|---|---|---|---|---|---|---|---|');

    ranked.forEach((agg, idx) => {
      lines.push(
        `| #${idx + 1} | **${agg.provider}** | ${agg.totalSamples} | ${agg.successRate.toFixed(1)}% | ${agg.schemaComplianceRate.toFixed(1)}% | ${agg.avgFieldPrecision.toFixed(1)}% | ${agg.p50LatencyMs} ms | ${agg.p95LatencyMs} ms | $${agg.avgCostPer1kCallsUsd.toFixed(3)} |`
      );
    });

    const bestPrecision = ranked[0];
    const fastest = [...ranked].sort((a, b) => a.p50LatencyMs - b.p50LatencyMs)[0];
    const lowestCost = [...ranked].sort((a, b) => a.avgCostPer1kCallsUsd - b.avgCostPer1kCallsUsd)[0];

    lines.push('\n### 💡 Dynamic Leaderboard Summary:');
    lines.push(`- **Highest Field Precision**: \`${bestPrecision.provider}\` (${bestPrecision.avgFieldPrecision.toFixed(1)}% precision, ${bestPrecision.schemaComplianceRate.toFixed(1)}% schema compliance)`);
    lines.push(`- **Lowest p50 Latency**: \`${fastest.provider}\` (${fastest.p50LatencyMs} ms p50 / ${fastest.p95LatencyMs} ms p95)`);
    lines.push(`- **Most Cost-Effective**: \`${lowestCost.provider}\` ($${lowestCost.avgCostPer1kCallsUsd.toFixed(3)} per 1k calls)`);

    return lines.join('\n');
  }

  /**
   * Generate a self-contained interactive HTML leaderboard with sorting and provider filtering.
   */
  public static generateHtmlLeaderboard(
    aggregates: BenchmarkAggregate[],
    options: HtmlLeaderboardOptions = {}
  ): string {
    const ranked = this.rankAggregates(aggregates);
    const title = options.title ?? 'Multimodal Eval Harness — Model Leaderboard';
    const generatedAt = options.generatedAt ?? new Date().toISOString();

    const bestPrecisionProvider = ranked[0]?.provider ?? '—';
    const fastestProvider = ranked.length > 0
      ? [...ranked].sort((a, b) => a.p50LatencyMs - b.p50LatencyMs)[0].provider
      : '—';
    const cheapestProvider = ranked.length > 0
      ? [...ranked].sort((a, b) => a.avgCostPer1kCallsUsd - b.avgCostPer1kCallsUsd)[0].provider
      : '—';

    const rowsHtml = ranked
      .map((agg, idx) => {
        const badges: string[] = [];
        if (agg.provider === bestPrecisionProvider) badges.push('<span class="badge badge-precision">Top Precision</span>');
        if (agg.provider === fastestProvider) badges.push('<span class="badge badge-speed">Fastest</span>');
        if (agg.provider === cheapestProvider) badges.push('<span class="badge badge-cost">Lowest Cost</span>');

        return `
        <tr data-provider="${escapeHtml(agg.provider.toLowerCase())}">
          <td data-value="${idx + 1}">#${idx + 1}</td>
          <td data-value="${escapeHtml(agg.provider)}">
            <strong>${escapeHtml(agg.provider)}</strong>
            <div class="badges">${badges.join(' ')}</div>
          </td>
          <td data-value="${agg.totalSamples}">${agg.totalSamples}</td>
          <td data-value="${agg.successRate}">${agg.successRate.toFixed(1)}%</td>
          <td data-value="${agg.schemaComplianceRate}">${agg.schemaComplianceRate.toFixed(1)}%</td>
          <td data-value="${agg.avgFieldPrecision}"><strong>${agg.avgFieldPrecision.toFixed(1)}%</strong></td>
          <td data-value="${agg.p50LatencyMs}">${agg.p50LatencyMs} ms</td>
          <td data-value="${agg.p95LatencyMs}">${agg.p95LatencyMs} ms</td>
          <td data-value="${agg.avgCostPer1kCallsUsd}">$${agg.avgCostPer1kCallsUsd.toFixed(3)}</td>
        </tr>`;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #e2e8f0;
      --accent: #2563eb;
      --row-hover: #f1f5f9;
    }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 2rem; }
    .container { max-width: 1120px; margin: 0 auto; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; margin: 0; }
    .meta { color: var(--muted); font-size: 0.875rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; }
    .summary-card .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
    .summary-card .value { font-size: 1.125rem; font-weight: 700; margin-top: 0.25rem; }
    .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; }
    input[type="search"] { padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; width: 280px; font-size: 0.9rem; }
    .table-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 10px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th, td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    th { cursor: pointer; user-select: none; background: #f1f5f9; font-weight: 600; white-space: nowrap; }
    th:hover { color: var(--accent); }
    tr:hover td { background: var(--row-hover); }
    .badges { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
    .badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 999px; font-weight: 600; }
    .badge-precision { background: #dbeafe; color: #1d4ed8; }
    .badge-speed { background: #dcfce7; color: #15803d; }
    .badge-cost { background: #fef3c7; color: #b45309; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">Generated at ${escapeHtml(generatedAt)} &middot; ${ranked.length} providers evaluated</div>
      </div>
    </header>
    <section class="summary-grid">
      <div class="summary-card"><div class="label">Top Precision</div><div class="value">${escapeHtml(bestPrecisionProvider)}</div></div>
      <div class="summary-card"><div class="label">Lowest p50 Latency</div><div class="value">${escapeHtml(fastestProvider)}</div></div>
      <div class="summary-card"><div class="label">Lowest Cost / 1k</div><div class="value">${escapeHtml(cheapestProvider)}</div></div>
    </section>
    <div class="controls">
      <input id="provider-filter" type="search" placeholder="Filter provider (e.g., gemini, claude)..." aria-label="Filter providers" />
    </div>
    <div class="table-wrap">
      <table id="leaderboard-table">
        <thead>
          <tr>
            <th data-col="0" data-type="number">Rank</th>
            <th data-col="1" data-type="string">Provider</th>
            <th data-col="2" data-type="number">Samples</th>
            <th data-col="3" data-type="number">Success Rate</th>
            <th data-col="4" data-type="number">Schema Compliance</th>
            <th data-col="5" data-type="number">Avg Field Precision</th>
            <th data-col="6" data-type="number">p50 Latency</th>
            <th data-col="7" data-type="number">p95 Latency</th>
            <th data-col="8" data-type="number">Cost / 1k Calls</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="9">No benchmark samples recorded.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
  <script>
    (function () {
      const table = document.getElementById('leaderboard-table');
      const tbody = table.querySelector('tbody');
      const filterInput = document.getElementById('provider-filter');
      let sortState = { col: 5, asc: false };

      filterInput.addEventListener('input', function () {
        const term = filterInput.value.trim().toLowerCase();
        Array.from(tbody.querySelectorAll('tr[data-provider]')).forEach((row) => {
          const provider = row.getAttribute('data-provider') || '';
          row.style.display = provider.includes(term) ? '' : 'none';
        });
      });

      table.querySelectorAll('th[data-col]').forEach((th) => {
        th.addEventListener('click', function () {
          const col = Number(th.getAttribute('data-col'));
          const type = th.getAttribute('data-type');
          const asc = sortState.col === col ? !sortState.asc : type === 'string' || col === 0 || col >= 6;
          sortState = { col, asc };

          const rows = Array.from(tbody.querySelectorAll('tr[data-provider]'));
          rows.sort((a, b) => {
            const va = a.children[col].getAttribute('data-value') || '';
            const vb = b.children[col].getAttribute('data-value') || '';
            const cmp = type === 'number' ? Number(va) - Number(vb) : va.localeCompare(vb);
            return asc ? cmp : -cmp;
          });
          rows.forEach((r) => tbody.appendChild(r));
        });
      });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * Export both leaderboard.html and leaderboard.md to the target directory.
   */
  public static async exportLeaderboard(
    aggregates: BenchmarkAggregate[],
    outputDir: string = '.',
    options: HtmlLeaderboardOptions = {}
  ): Promise<LeaderboardExportResult> {
    const resolvedDir = path.resolve(outputDir);
    await fs.mkdir(resolvedDir, { recursive: true });

    const markdown = this.generateMarkdownTable(aggregates);
    const html = this.generateHtmlLeaderboard(aggregates, options);

    const markdownPath = path.join(resolvedDir, 'leaderboard.md');
    const htmlPath = path.join(resolvedDir, 'leaderboard.html');

    await Promise.all([
      fs.writeFile(markdownPath, markdown + '\n', 'utf8'),
      fs.writeFile(htmlPath, html, 'utf8')
    ]);

    return { htmlPath, markdownPath, html, markdown };
  }
}
