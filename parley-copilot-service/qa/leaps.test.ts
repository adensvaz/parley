// Proves the two moat leaps with numbers, not vibes:
//   §4 the rebuttal bandit converges to the best rebuttal (sublinear regret vs random)
//   §1 speculative prefetch hits ~top-k mass and cuts perceived latency ~6×
import { RebuttalBandit, mulberry32 } from "../src/leaps/bandit.js";
import { SpeculativeCache, sampleCategorical, type Dist } from "../src/leaps/speculative.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };

// ───────────────────────────────────────────────────────────────────────────
console.log("\n§4  RebuttalBandit — converges to the best rebuttal");
// ───────────────────────────────────────────────────────────────────────────
{
  const rng = mulberry32(42);
  const bandit = new RebuttalBandit(rng);
  const CTX = "not_interested|value|ar";
  const arms = ["empathy_pivot", "20_second_ask", "curiosity_hook"];
  const trueRate: Record<string, number> = { empathy_pivot: 0.10, "20_second_ask": 0.28, curiosity_hook: 0.18 };
  const BEST = "20_second_ask", optimal = 0.28;

  const T = 6000;
  let reward = 0, regret = 0, lastWindowBest = 0;
  const WIN = 1000;
  for (let t = 0; t < T; t++) {
    const arm = bandit.select(CTX, arms);
    const r: 0 | 1 = rng() < trueRate[arm] ? 1 : 0;
    bandit.update(CTX, arm, r);
    reward += r;
    regret += optimal - trueRate[arm];
    if (t >= T - WIN && arm === BEST) lastWindowBest++;
  }
  // Random policy's expected regret for comparison.
  const meanGap = optimal - (0.10 + 0.28 + 0.18) / 3;
  const randomRegret = T * meanGap;

  const exploitRate = lastWindowBest / WIN;
  const avgRewardLast = reward / T; // overall; converges toward optimal
  console.log(`     posterior best: ${JSON.stringify(bandit.best(CTX))}`);
  console.log(`     regret: bandit=${regret.toFixed(0)}  random=${randomRegret.toFixed(0)}  (lower is better)`);
  check("identifies the true best rebuttal", bandit.best(CTX)?.armId === BEST);
  check("exploits best arm >90% in last 1000 pulls", exploitRate > 0.9, `${(exploitRate * 100).toFixed(1)}%`);
  check("total regret < half of random policy", regret < randomRegret * 0.5, `${((regret / randomRegret) * 100).toFixed(0)}% of random`);
  check("avg conversion approaches optimal (>0.24)", avgRewardLast > 0.24, avgRewardLast.toFixed(3));
}

// ───────────────────────────────────────────────────────────────────────────
console.log("\n§1  SpeculativeCache — top-k prewarm cuts latency ~6×");
// ───────────────────────────────────────────────────────────────────────────
{
  const rng = mulberry32(7);
  // Zipf-skewed objection distribution; top-3 mass = 0.85.
  const dist: Dist = { not_interested: 0.45, already_agent: 0.25, send_email: 0.15, bad_time: 0.08, dnc: 0.04, other: 0.03 };
  const top3Mass = 0.45 + 0.25 + 0.15;

  const cache = new SpeculativeCache(3, 5, 700);
  const prewarmed = cache.prewarm(dist);
  const N = 8000;
  for (let i = 0; i < N; i++) cache.observe(prewarmed, sampleCategorical(dist, rng));

  console.log(`     prewarmed(k=3): ${prewarmed.join(", ")}`);
  console.log(`     hitRate=${(cache.hitRate * 100).toFixed(1)}%  meanLatency=${cache.meanLatencyMs.toFixed(0)}ms  speedup=${cache.speedupVsReactive.toFixed(1)}×`);
  check("prewarm selects the top-3 by mass", prewarmed.join() === "not_interested,already_agent,send_email");
  check("empirical hit rate ≈ top-3 mass (±3%)", Math.abs(cache.hitRate - top3Mass) < 0.03, `${(cache.hitRate * 100).toFixed(1)}% vs ${(top3Mass * 100).toFixed(0)}%`);
  check("mean perceived latency < 150ms", cache.meanLatencyMs < 150, `${cache.meanLatencyMs.toFixed(0)}ms`);
  check("≥4× faster than reactive baseline", cache.speedupVsReactive >= 4, `${cache.speedupVsReactive.toFixed(1)}×`);
}

console.log(`\n══ LEAPS: ${pass} passed, ${fail} failed ══`);
process.exit(fail ? 1 : 0);
