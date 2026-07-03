// Conversational speculative execution — branch prediction for calls.
// While the rep talks (copilot dead time), pre-warm the top-k most likely next objections' rebuttals.
// When STT confirms the objection, serve from cache in ~0ms instead of waiting on the LLM.
// Cold-call objection distributions are Zipf-skewed, so k=3 captures ~85% of mass → ~6× lower
// perceived latency at bounded cost.

export type Dist = Record<string, number>; // objectionId -> probability mass (sums ≈ 1)
export type RNG = () => number;

export class SpeculativeCache {
  hits = 0;
  total = 0;
  private latencySum = 0;

  constructor(
    public k = 3,
    public tCacheMs = 5,   // serve a pre-warmed rebuttal
    public tLlmMs = 700,   // reactive generation on a miss
  ) {}

  /** Pick the top-k objections by probability mass to pre-generate rebuttals for. */
  prewarm(dist: Dist): string[] {
    return Object.entries(dist)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.k)
      .map(([id]) => id);
  }

  /** The prospect actually raised `actual`; record whether it was pre-warmed and the latency paid. */
  observe(prewarmed: string[], actual: string): { hit: boolean; latencyMs: number } {
    const hit = prewarmed.includes(actual);
    const latencyMs = hit ? this.tCacheMs : this.tLlmMs;
    this.total++;
    if (hit) this.hits++;
    this.latencySum += latencyMs;
    return { hit, latencyMs };
  }

  get hitRate(): number { return this.total ? this.hits / this.total : 0; }
  get meanLatencyMs(): number { return this.total ? this.latencySum / this.total : 0; }
  /** Speedup vs a purely reactive (always-LLM) baseline. */
  get speedupVsReactive(): number { return this.meanLatencyMs ? this.tLlmMs / this.meanLatencyMs : 0; }
}

/** Draw an objectionId from a categorical distribution (inverse-CDF). */
export function sampleCategorical(dist: Dist, rng: RNG): string {
  const u = rng();
  let cum = 0;
  for (const [id, p] of Object.entries(dist)) { cum += p; if (u <= cum) return id; }
  return Object.keys(dist).at(-1)!;
}
