// Proves the TCPA rails: recording-consent regime by state, the 8am–9pm calling window (fail-safe on
// unknown timezone), and the combined pre-dial gate. Run: npx tsx qa/guard.test.ts
import { consentRegime, utcOffsetFor } from "../src/geo.js";
import { callingWindow, precallCheck } from "../src/guard.js";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, extra = "") => { c ? pass++ : fail++; console.log(`  ${c ? "✅" : "❌"} ${n}${extra ? ` — ${extra}` : ""}`); };

// Deterministic UTC epochs (hour-of-day is all the window math uses).
const at = (utcHour: number) => utcHour * 3600000;

console.log("\n§ recording-consent regime");
{
  check("CA (415) → all-party consent", consentRegime("415") === "all-party");
  check("FL (305) → all-party consent", consentRegime("305") === "all-party");
  check("TX (512) → one-party consent", consentRegime("512") === "one-party");
  check("NY (212) → one-party consent", consentRegime("212") === "one-party");
  check("unknown area code → 'unknown' (treated as all-party)", consentRegime("999") === "unknown");
  check("offsets resolve: CA=-8, NY=-5, TX=-6", utcOffsetFor("415") === -8 && utcOffsetFor("212") === -5 && utcOffsetFor("512") === -6);
}

console.log("\n§ calling window (8am–9pm local)");
{
  check("CA at 10am local → OK", callingWindow("415", at(18)).ok === true, `hr=${callingWindow("415", at(18)).localHour}`);
  check("CA at 10pm local → blocked", callingWindow("415", at(6)).ok === false, `hr=${callingWindow("415", at(6)).localHour}`);
  check("NY at 1pm local → OK", callingWindow("212", at(18)).ok === true, `hr=${callingWindow("212", at(18)).localHour}`);
  check("edge (8am) warns about DST", (() => { const w = callingWindow("415", at(16)); return w.ok === true && /daylight/i.test(w.reason ?? ""); })());
  check("unknown timezone → ok=null (fail-safe warn)", callingWindow("999", at(18)).ok === null);
}

console.log("\n§ pre-dial gate (DNC + consent + window)");
{
  const caOk = precallCheck({ areaCode: "415", nowUtcMs: at(18), dnc: false });
  check("CA, in window, not DNC → allow + needs consent", caOk.allow === true && caOk.needsConsent === true);
  check("CA gate surfaces a consent warning", caOk.warnings.some((w) => /all-party|consent/i.test(w)), caOk.warnings.join(" | "));

  const txOk = precallCheck({ areaCode: "512", nowUtcMs: at(18), dnc: false });
  check("TX one-party → no consent required", txOk.allow === true && txOk.needsConsent === false);

  const dncBlock = precallCheck({ areaCode: "512", nowUtcMs: at(18), dnc: true });
  check("on DNC → hard block", dncBlock.allow === false && dncBlock.warnings[0].includes("Do-Not-Call"));

  const outWindow = precallCheck({ areaCode: "415", nowUtcMs: at(6), dnc: false });
  check("out of calling window → hard block", outWindow.allow === false);

  const unknown = precallCheck({ areaCode: "999", nowUtcMs: at(18), dnc: false });
  check("unknown region → allowed but warns (tz + consent)", unknown.allow === true && unknown.warnings.length >= 2, unknown.warnings.join(" | "));
}

console.log(`\n${fail ? "❌" : "✅"} guard: ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
