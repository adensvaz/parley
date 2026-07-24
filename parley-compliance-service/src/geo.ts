// Geo lookup for compliance rails: NANP area code → US state → standard UTC offset + recording-consent
// regime. Deliberately dependency-free (no tzdata) and FAIL-SAFE: an unknown area code resolves to the
// conservative side (treat as all-party consent, flag the calling window) rather than assuming it's legal.
//
// Caveat baked in: offsets are STANDARD time; DST shifts the window edge by an hour, so the guard warns
// (never silently blocks) near the 8am/9pm boundary. Two-party list is the widely-cited set; a handful of
// states have nuance (business vs personal, electronic vs in-person) — when unsure we err toward consent.

export type ConsentRegime = "all-party" | "one-party" | "unknown";

// States requiring ALL parties' consent to record a call (the conservative, widely-cited list).
const ALL_PARTY = new Set(["CA", "CT", "DE", "FL", "IL", "MD", "MA", "MI", "MT", "NV", "NH", "OR", "PA", "WA"]);

// State → standard UTC offset (hours). Multi-zone states use their dominant zone; edge cities may differ.
const STATE_TZ: Record<string, number> = {
  CT: -5, DE: -5, DC: -5, FL: -5, GA: -5, IN: -5, ME: -5, MD: -5, MA: -5, MI: -5, NH: -5, NJ: -5, NY: -5,
  NC: -5, OH: -5, PA: -5, RI: -5, SC: -5, VT: -5, VA: -5, WV: -5,
  AL: -6, AR: -6, IL: -6, IA: -6, KS: -6, KY: -5, LA: -6, MN: -6, MS: -6, MO: -6, NE: -6, ND: -6, OK: -6,
  SD: -6, TN: -6, TX: -6, WI: -6,
  AZ: -7, CO: -7, ID: -7, MT: -7, NM: -7, UT: -7, WY: -7,
  CA: -8, NV: -8, OR: -8, WA: -8,
  AK: -9, HI: -10,
};

// Common area codes → state (real-estate-heavy markets covered well; unknown falls through to conservative).
const AC_STATE: Record<string, string> = {
  // CA
  "213": "CA", "310": "CA", "323": "CA", "408": "CA", "415": "CA", "424": "CA", "510": "CA", "530": "CA",
  "559": "CA", "619": "CA", "626": "CA", "650": "CA", "661": "CA", "707": "CA", "714": "CA", "760": "CA",
  "805": "CA", "818": "CA", "858": "CA", "909": "CA", "916": "CA", "925": "CA", "949": "CA", "951": "CA",
  // FL
  "305": "FL", "321": "FL", "352": "FL", "386": "FL", "407": "FL", "561": "FL", "727": "FL", "754": "FL",
  "772": "FL", "786": "FL", "813": "FL", "850": "FL", "863": "FL", "904": "FL", "941": "FL", "954": "FL",
  // TX
  "210": "TX", "214": "TX", "281": "TX", "409": "TX", "469": "TX", "512": "TX", "682": "TX", "713": "TX",
  "737": "TX", "817": "TX", "832": "TX", "915": "TX", "936": "TX", "956": "TX", "972": "TX",
  // NY / NJ
  "212": "NY", "315": "NY", "347": "NY", "516": "NY", "518": "NY", "585": "NY", "607": "NY", "631": "NY",
  "646": "NY", "716": "NY", "718": "NY", "845": "NY", "914": "NY", "917": "NY",
  "201": "NJ", "551": "NJ", "609": "NJ", "732": "NJ", "848": "NJ", "856": "NJ", "862": "NJ", "908": "NJ", "973": "NJ",
  // AZ (no DST — note), CO, NV, WA, OR, UT
  "480": "AZ", "520": "AZ", "602": "AZ", "623": "AZ", "928": "AZ",
  "303": "CO", "719": "CO", "720": "CO", "970": "CO",
  "702": "NV", "725": "NV", "775": "NV",
  "206": "WA", "253": "WA", "360": "WA", "425": "WA", "509": "WA", "564": "WA",
  "503": "OR", "541": "OR", "971": "OR",
  "385": "UT", "435": "UT", "801": "UT",
  // GA, NC, SC, TN, IL, MA, PA, MI, VA, DC, MD, MN, MO, OH, WI
  "404": "GA", "470": "GA", "678": "GA", "706": "GA", "770": "GA", "912": "GA",
  "252": "NC", "336": "NC", "704": "NC", "743": "NC", "828": "NC", "910": "NC", "919": "NC", "980": "NC", "984": "NC",
  "803": "SC", "843": "SC", "864": "SC",
  "423": "TN", "615": "TN", "629": "TN", "731": "TN", "865": "TN", "901": "TN", "931": "TN",
  "217": "IL", "224": "IL", "309": "IL", "312": "IL", "331": "IL", "618": "IL", "630": "IL", "708": "IL", "773": "IL", "815": "IL", "847": "IL", "872": "IL",
  "339": "MA", "351": "MA", "413": "MA", "508": "MA", "617": "MA", "774": "MA", "781": "MA", "857": "MA", "978": "MA",
  "215": "PA", "267": "PA", "412": "PA", "484": "PA", "570": "PA", "610": "PA", "717": "PA", "724": "PA", "814": "PA", "878": "PA",
  "248": "MI", "313": "MI", "517": "MI", "586": "MI", "616": "MI", "734": "MI", "810": "MI", "947": "MI", "989": "MI",
  "276": "VA", "434": "VA", "540": "VA", "571": "VA", "703": "VA", "757": "VA", "804": "VA",
  "202": "DC",
  "240": "MD", "301": "MD", "410": "MD", "443": "MD", "667": "MD",
  "218": "MN", "320": "MN", "507": "MN", "612": "MN", "651": "MN", "763": "MN", "952": "MN",
  "314": "MO", "417": "MO", "573": "MO", "636": "MO", "660": "MO", "816": "MO",
  "216": "OH", "234": "OH", "330": "OH", "419": "OH", "440": "OH", "513": "OH", "567": "OH", "614": "OH", "740": "OH", "937": "OH",
  "262": "WI", "414": "WI", "534": "WI", "608": "WI", "715": "WI", "920": "WI",
};

const clean = (ac: string) => String(ac).replace(/\D/g, "").slice(-10).slice(0, 3);
const stateOf = (areaCode: string): string | undefined => AC_STATE[clean(areaCode)];

/** Recording-consent regime for a US number by area code. Unknown → "unknown" (caller treats as all-party). */
export function consentRegime(areaCode: string): ConsentRegime {
  const st = stateOf(areaCode);
  if (!st) return "unknown";
  return ALL_PARTY.has(st) ? "all-party" : "one-party";
}

/** Standard UTC offset (hours) for the number's state, or null if unknown. */
export function utcOffsetFor(areaCode: string): number | null {
  const st = stateOf(areaCode);
  return st ? STATE_TZ[st] ?? null : null;
}

export function stateFor(areaCode: string): string | undefined { return stateOf(areaCode); }
export { ALL_PARTY, STATE_TZ };
