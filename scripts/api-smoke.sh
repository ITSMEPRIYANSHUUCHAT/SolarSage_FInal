#!/usr/bin/env bash
# SolarSage API smoke test. Exercises the edge functions and verifies the
# Phase 3/4 hardening (auth required, size/type guards, status codes, health).
#
# Usage:
#   BASE=http://localhost:54321 ANON=<anon-key> TOKEN=<user-access-token> bash scripts/api-smoke.sh
#   (TOKEN optional; without it, auth-required calls should return 401.)
#
# Get a user TOKEN from the browser devtools console after signing in:
#   (await window.supabase?.auth.getSession())?.data.session.access_token
#   or read localStorage key "<project>-auth-token" -> access_token.

set -u
BASE="${BASE:-http://localhost:54321}"
FN="$BASE/functions/v1"
ANON="${ANON:-}"
TOKEN="${TOKEN:-}"
PASS=0; FAIL=0
hdr_anon=(-H "apikey: $ANON")
auth=(); [ -n "$TOKEN" ] && auth=(-H "Authorization: Bearer $TOKEN")

expect() { # expect <name> <actual> <wanted>
  if [ "$2" = "$3" ]; then echo "  PASS  $1 ($2)"; PASS=$((PASS+1));
  else echo "  FAIL  $1 (got $2, want $3)"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "=== health (no auth) ==="
expect "GET /health = 200" "$(code "$FN/health")" "200"
curl -s "$FN/health"; echo

echo "=== upload-pdf guards ==="
# make a tiny throwaway pdf + a non-pdf
printf '%%PDF-1.4\n1 0 obj<<>>endobj\n' > /tmp/tiny.pdf
echo "not a pdf" > /tmp/notes.txt
expect "no auth => 401" "$(code -X POST "${hdr_anon[@]}" -F "file=@/tmp/tiny.pdf" "$FN/upload-pdf")" "401"
expect "non-pdf => 400" "$(code -X POST "${hdr_anon[@]}" "${auth[@]}" -F "file=@/tmp/notes.txt" "$FN/upload-pdf")" "400"

echo "=== process-pdf ==="
expect "no auth => 401" "$(code -X POST "${hdr_anon[@]}" -H 'Content-Type: application/json' -d '{"pdfText":"x"}' "$FN/process-pdf")" "401"
expect "empty text => 400" "$(code -X POST "${hdr_anon[@]}" "${auth[@]}" -H 'Content-Type: application/json' -d '{"pdfText":""}' "$FN/process-pdf")" "400"
expect "non-bill text => 422" "$(code -X POST "${hdr_anon[@]}" "${auth[@]}" -H 'Content-Type: application/json' -d '{"pdfText":"just a resume about react and node"}' "$FN/process-pdf")" "422"

# Full happy path (needs OPENAI_API_KEY set on the function):
SAMPLE='TORRENT POWER LIMITED  Consumer No 123456  Billing period: 01-Mar-2025 to 31-Mar-2025  Units consumed 420 kWh  Solar generation 300 kWh  Energy charges Rs 2940  Bill amount Rs 3200  Due date 15-Apr-2025  Tariff Tier 1 (0-500 kWh) 7'
echo "  (happy path — only meaningful if OPENAI_API_KEY is set:)"
curl -s -X POST "${hdr_anon[@]}" "${auth[@]}" -H 'Content-Type: application/json' \
  -d "{\"pdfText\":\"$SAMPLE\",\"fileName\":\"sample.pdf\"}" "$FN/process-pdf" | head -c 600; echo

echo
echo "=== RESULT: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
