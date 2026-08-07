# Test 13.37.0 — Memory Visual System V1

## Automated checks
- `node --check app/memory-worlds-v3.js` — PASS
- `node --check core/media/memory-cards.js` — PASS
- `node --check intelligence/kernel/version.js` — PASS
- `node tests/release-version-consistency.test.cjs` — PASS
- `node tests/memory-visual-system-v13.37.0.test.cjs` — PASS

## Manual acceptance checklist
- Single-author deck/card atmosphere follows the active trip accent.
- Multi-author deck layers and identity markers use participant profile colors only when those colors exist.
- Memory Moment header is never covered by spread cards.
- Desktop spread remains random but visually compact; hover always lifts a card above neighbors.
- Mobile spread stays readable and scrollable without horizontal overflow.
- Mobile first tap focuses a card; second tap opens card detail.
- Focus view remains usable on phone and desktop and retains trip/author color hierarchy.
