// Self-optimizing rebuttal policy — a contextual multi-armed bandit (Thompson sampling).
// Context = (objection, stage, market, lang, rep-style); each arm = a rebuttal variant with a
// Beta posterior on P(appointment | rebuttal, context). We sample the posteriors and play the max,
// so the system provably converges to the best rebuttal PER SEGMENT (regret O(√(KT log T))) and
// keeps adapting as markets shift. Scripts can't compete with a policy that keeps learning.

export type RNG = () => number;

// Deterministic RNG for reproducible tests.
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rng: RNG): number {
  const u1 = Math.max(rng(), 1e-12), u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Marsaglia–Tsang gamma sampler (shape k ≥ 1; our α,β start at 1 and only grow).
function sampleGamma(k: number, rng: RNG): number {
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do { x = sampleNormal(rng); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(a: number, b: number, rng: RNG): number {
  const x = sampleGamma(a, rng), y = sampleGamma(b, rng);
  return x / (x + y);
}

interface Posterior { alpha: number; beta: number }

export class RebuttalBandit {
  // contextKey -> armId -> Beta posterior
  private ctx = new Map<string, Map<string, Posterior>>();
  constructor(private rng: RNG = Math.random) {}

  private arms(context: string): Map<string, Posterior> {
    let m = this.ctx.get(context);
    if (!m) { m = new Map(); this.ctx.set(context, m); }
    return m;
  }

  /** Ensure each candidate rebuttal exists with a uniform Beta(1,1) prior. */
  register(context: string, armIds: string[]): void {
    const m = this.arms(context);
    for (const id of armIds) if (!m.has(id)) m.set(id, { alpha: 1, beta: 1 });
  }

  /** Thompson sampling: draw θ ~ Beta(α,β) per arm, play the max sample. */
  select(context: string, armIds: string[]): string {
    this.register(context, armIds);
    const m = this.arms(context);
    let best = armIds[0], bestTheta = -1;
    for (const id of armIds) {
      const p = m.get(id)!;
      const theta = sampleBeta(p.alpha, p.beta, this.rng);
      if (theta > bestTheta) { bestTheta = theta; best = id; }
    }
    return best;
  }

  /** Observe the delayed binary reward (1 = appointment set). */
  update(context: string, armId: string, reward: 0 | 1): void {
    const p = this.arms(context).get(armId);
    if (!p) return;
    p.alpha += reward;
    p.beta += 1 - reward;
  }

  /** Posterior for ONE arm — the measured conversion rate and how often it's been played.
   *  Beta(1,1) prior means pulls = α+β-2, and mean = α/(α+β). */
  armStats(context: string, armId: string): { mean: number; pulls: number } | null {
    const p = this.ctx.get(context)?.get(armId);
    if (!p) return null;
    return { mean: p.alpha / (p.alpha + p.beta), pulls: p.alpha + p.beta - 2 };
  }

  /** Current best arm by posterior mean (for reporting / exploitation-only serving). */
  best(context: string): { armId: string; mean: number; pulls: number } | null {
    const m = this.ctx.get(context);
    if (!m) return null;
    let best = "", mean = -1, pulls = 0;
    for (const [id, p] of m) {
      const mu = p.alpha / (p.alpha + p.beta);
      if (mu > mean) { mean = mu; best = id; pulls = p.alpha + p.beta - 2; }
    }
    return { armId: best, mean, pulls };
  }
}
