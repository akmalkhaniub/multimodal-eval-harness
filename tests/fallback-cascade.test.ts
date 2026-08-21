import { describe, it, expect } from 'vitest';
import { MockMultimodalAdapter } from '../src/adapters/mock-adapter.js';
import { MultimodalFallbackCascade } from '../src/resilience/fallback-cascade.js';

describe('Multimodal Resilient Fallback Cascade & Circuit Breaker', () => {
  it('should route to primary adapter when healthy', async () => {
    const primary = new MockMultimodalAdapter('gemini-2.0-flash', { simulatedStatus: 'SUCCESS' });
    const secondary = new MockMultimodalAdapter('claude-3-7-sonnet', { simulatedStatus: 'SUCCESS' });

    const cascade = new MultimodalFallbackCascade([primary, secondary]);
    const result = await cascade.execute({
      id: 'doc-001',
      mediaType: 'image',
      mediaUrlOrBase64: 'data:image/png;base64,...',
      prompt: 'Extract invoice metadata'
    });

    expect(result.exhausted).toBe(false);
    expect(result.successfulProvider).toBe('gemini-2.0-flash');
    expect(result.attempts).toHaveLength(1);
  });

  it('should seamlessly fail over to secondary adapter when primary hits 429 rate limit', async () => {
    const primary = new MockMultimodalAdapter('gemini-2.0-flash', { simulatedStatus: 'RATE_LIMITED_429' });
    const secondary = new MockMultimodalAdapter('claude-3-7-sonnet', { simulatedStatus: 'SUCCESS' });

    const cascade = new MultimodalFallbackCascade([primary, secondary], 1); // 1 retry
    const result = await cascade.execute({
      id: 'doc-002',
      mediaType: 'image',
      mediaUrlOrBase64: 'data:image/png;base64,...',
      prompt: 'Extract receipt data'
    });

    expect(result.exhausted).toBe(false);
    expect(result.successfulProvider).toBe('claude-3-7-sonnet');
    expect(result.attempts.some(a => a.provider === 'gemini-2.0-flash' && a.status === 'RATE_LIMITED_429')).toBe(true);
    expect(result.attempts.some(a => a.provider === 'claude-3-7-sonnet' && a.status === 'SUCCESS')).toBe(true);
  });
});
