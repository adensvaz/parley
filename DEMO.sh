#!/usr/bin/env bash
# Parley — one-command demo launcher.
#   ./DEMO.sh          bring the whole platform up + serve the marketing site, print the demo script
#   ./DEMO.sh --check   verify everything is demo-ready, then exit
set -uo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-}"
GREEN=$'\033[32m'; RED=$'\033[31m'; BOLD=$'\033[1m'; DIM=$'\033[2m'; OFF=$'\033[0m'
ok(){ echo "  ${GREEN}✓${OFF} $1"; }
bad(){ echo "  ${RED}✗${OFF} $1"; }

echo; echo "${BOLD}▶ Parley demo bring-up${OFF}"

# 1. docker (postgres + nats live here)
if ! docker info >/dev/null 2>&1; then
  echo "  starting OrbStack…"; orb start >/dev/null 2>&1 || true; sleep 5
fi
docker info >/dev/null 2>&1 && ok "docker" || { bad "docker is down — run 'orb start' and retry"; exit 1; }

# 2. the platform (postgres, nats, 8 services)
echo "  booting services (~20s)…"
pkill -f "tsx src/index.ts" >/dev/null 2>&1; sleep 1
nohup "$ROOT/parley-infra/dev-all.sh" >/tmp/parley-demo.log 2>&1 &
for i in $(seq 1 45); do curl -sf localhost:8086/health >/dev/null 2>&1 && break; sleep 1; done

UP=0; DOWN=""
for p in 8080 8081 8082 8083 8084 8085 8086; do
  if curl -sf "localhost:$p/health" >/dev/null 2>&1; then UP=$((UP+1)); else DOWN="$DOWN $p"; fi
done
[ "$UP" -ge 7 ] && ok "services ($UP/7 healthy)" || bad "services ($UP/7 —$DOWN down)"

# 3. the seam: desktop protocol → gateway → copilot → card
SEAM=$(cd "$ROOT/parley-desktop" && npx tsx qa/seam.test.ts 2>&1 | grep -c "✅")
[ "${SEAM:-0}" -ge 3 ] && ok "live copilot loop (auth → lead → transcript → card)" || bad "copilot loop — check /tmp/parley-gateway.log"

# 4. marketing site
(cd "$ROOT/parley-web/site" && node build.mjs >/dev/null 2>&1) && ok "marketing site built" || bad "site build"
pkill -f "http.server 4321" >/dev/null 2>&1
(cd "$ROOT/parley-web/site/dist" && nohup python3 -m http.server 4321 >/dev/null 2>&1 &) ; sleep 1
curl -sf localhost:4321 >/dev/null 2>&1 && ok "site serving on :4321" || bad "site server"

if [ "$MODE" = "--check" ]; then echo; echo "${BOLD}Ready.${OFF}"; exit 0; fi

cat <<EOF

${BOLD}════════ YOUR DEMO ════════${OFF}

${BOLD}1. The story (open in browser)${OFF}
   Landing page      → ${DIM}http://localhost:4321${OFF}
   Seed deck         → parley-web/marketing/Parley-Seed-Deck.pdf
   Product deck      → parley-web/marketing/Parley-Product-Deck.pdf

${BOLD}2. The product — scripted walkthrough (bulletproof, no backend)${OFF}
   ${DIM}open parley-desktop/product.html${OFF}
   Intro slides → pick "Expired Listings" → Go live → watch objections fire → post-call

${BOLD}3. The product — LIVE on the real backend (the wow moment)${OFF}
   ${DIM}cd parley-desktop && npx vite${OFF}   then open the URL it prints
   Pick a mode → Go live → type a prospect line in the box, e.g.
     ${BOLD}"honestly i'm not interested"${OFF}      → objection card appears
     ${BOLD}"how did you get my number"${OFF}        → different rebuttal
     ${BOLD}"every agent says the same thing"${OFF}  → the empathy pivot
   This is the real gateway → copilot engine → card, round-trip.

${BOLD}4. Manager dashboard (live data)${OFF}
   ${DIM}http://localhost:8085/dashboard?orgId=<org>${OFF}
   (get an org id: curl -s -XPOST localhost:8081/verify -H 'content-type: application/json' -d '{"token":"dev:demo:org_demo"}')

${BOLD}5. If asked "is it real?"${OFF}
   ${DIM}./parley-infra/dev-all.sh --smoke${OFF}   → 7/7 cross-service proof
   ${DIM}cd parley-copilot-service && npx tsx qa/leaps.test.ts${OFF}  → the bandit + latency math

${DIM}Logs: /tmp/parley-*.log   ·   Stop: pkill -f "tsx src/index.ts"${OFF}
EOF
