# Dependency Security Audit

> Date: 2026-06-15 · Tool: `npm audit` · Architecture note: the deployed artifact is a **static `dist/` bundle**. Build-time tooling (Vite, esbuild, Rollup, PostCSS, ESLint, lovable-tagger) **does not run on the public server**, so its CVEs are developer/CI-surface only, not production-runtime.

## Before → After (this pass)

| Severity | Before | After | Δ |
|----------|--------|-------|---|
| Critical | 1 | **0** | −1 |
| High | 11 | 8 | −3 |
| Moderate | 9 | 8 | −1 |
| Low | 2 | 2 | — |
| **Total** | **23** | **18** | **−5** |

**All 18 remaining are dev/build-only** (verified by cross-referencing each advisory's package against `package.json#dependencies`). **0 runtime-reachable vulnerabilities ship in the production bundle.**

## Runtime fixes applied (these reached the browser) ✅

| Package | Was | Now | Advisory | Action |
|---------|-----|-----|----------|--------|
| **jspdf** | 3.0.1 | **4.2.1** | Critical (GHSA via jspdf ≤4.2.0) | upgraded; PDF report still builds (jsPDF core API unchanged — verified `tsc` + `vite build` green) |
| **dompurify** (via jspdf) | 3.2.6 | **3.4.10** | Moderate XSS (≤3.3.3) | pulled in transitively by jspdf 4.2.1 |
| **react-router-dom** | 6.27.0 | **6.30.4** | High (≤6.30.2) | patched within v6 (no breaking v7 major) |
| **react-router** (transitive) | 6.x | **6.30.4** | High (≤6.30.3) | resolved with the above |

**Validation:** `npx tsc -p tsconfig.app.json --noEmit` → exit 0; `npm run build` → exit 0 (2989 modules); `node scripts/dev-checks.ts` → 15/15.
**Risk reduction:** removed the only critical and all browser-shipped XSS/routing CVEs from the deployed code.

## Remaining advisories — dev/build-only (not shipped) ⚠️ accepted-with-note

| Severity | Packages | Why it does NOT affect the public server |
|----------|----------|------------------------------------------|
| High | esbuild, rollup, glob, minimatch, picomatch, flatted, lodash, lovable-tagger | Used only by Vite/ESLint at **build/dev time**. The production server serves pre-built static files; none of these execute there. e.g. the esbuild advisory is a **dev-server** SSRF (only when running `vite dev`). |
| Moderate | vite, postcss, ajv, brace-expansion, js-yaml, nanoid, ws, yaml | Build toolchain / dev server only. |
| Low | eslint, @eslint/plugin-kit | Linting only. |

### Why we did not force-upgrade the build chain
`npm audit fix --force` would pull **Vite 6** (major) which is incompatible with the pinned `lovable-tagger` dev plugin, risking a broken build for a class of issues that have **no production exposure**. The correct, lower-risk path:
- Treat these as **CI/developer-workstation** hygiene, not production blockers.
- Mitigate at the source: never expose the Vite dev server to untrusted networks; run builds in isolated CI.
- Schedule a controlled Vite 5→6 (or drop `lovable-tagger`, which is dev-only) upgrade as planned maintenance.

## Ongoing controls (implemented)
- **CI gate**: [.github/workflows/ci.yml](../../.github/workflows/ci.yml) runs `npm audit --audit-level=high` (report-only today; flip to blocking once the dev-chain upgrade lands).
- **Lockfile**: standardized on a single `package-lock.json` (removed `bun.lockb`) for reproducible installs.
- Recommend enabling **Dependabot**/Renovate for automated PRs.

## Commands to reproduce
```bash
npm audit                              # human summary
npm audit --json | jq '.metadata.vulnerabilities'   # totals
# runtime-only view (cross-check names against package.json dependencies)
```

## Verdict
**Production bundle: clean (0 runtime CVEs).** The remaining items are build-time only and do not block public deployment; address them as routine maintenance.
