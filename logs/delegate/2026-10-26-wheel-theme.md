# Task: Wheel palette + layout helpers

Executor: codex    Model: default    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-26-wheel-redesign.md, task 1

Route: risk=normal literal=n plan=codex chosen=codex default/medium reason=kept

## Executor rules (override any AGENTS.md / CLAUDE.md instructions)

- Do ONLY this task. Do not run handoff, write to `~/.claude/kb`, load qwenchance/scrutinize, or
  write task logs.
- Edit files only. Do NOT commit, push, create branches, or run `git` commands that change state.
- Touch only the files under "Files allowed". If the task seems to need another file, stop and say so
  in your final message instead of editing it.
- No network access. If something needs installing, stop and say so.
- Finish with a short report: files changed, what you did, the verify command output, anything you
  were unsure about.

## Goal

Add a pure helper module that generates the spin wheel's slice colours (RTI blues only, neighbours
always contrast), picks a readable ink colour per slice, and picks the label layout by prize count.
It will be used by the browser (classic script) and tested with `node --test`.

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelTheme.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelTheme.test.js

## Context (read, do not edit)

- .../game-event/js/followButtonLabel.js and js/followButtonLabel.test.js — module style to copy:
  classic browser script (top-level `const`/`function`, no import/export), ending with
  `if (typeof module !== 'undefined' && module.exports) { module.exports = { ... }; }`;
  tests use `node:test` + `node:assert/strict` and `require('./x.js')`.
- .../game-event/js/wheelLabel.js — another existing helper, same style.

## Steps

1. Create `js/wheelTheme.js` exporting:
   - `RTI_WHEEL_SHADES` — exactly this literal array (dark → light; every entry has ≥ 4.5:1 contrast
     against `#ffffff` or `#13212b`; do NOT compute it by interpolation):
     `['#0f2a3d','#153952','#1b4968','#20587d','#266893','#2c77a8','#5391b9','#71a4c5','#8fb7d2','#adcadf','#cadeeb','#e8f1f8']`
   - `MAX_PRIZES = 16`.
   - `wheelPalette(n)` → array of n hex strings. Step A, pick: for n ≤ 12,
     `picked[i] = RTI_WHEEL_SHADES[Math.round(i * 11 / (Math.max(n, 2) - 1))]` for i = 0..n-1;
     for n > 12, `picked[i] = RTI_WHEEL_SHADES[i % 12]`. Step B, interleave dark/light with
     `h = Math.ceil(n / 2)`: result = `picked[0], picked[h], picked[1], picked[h+1], …` (i.e. for
     k = 0..n-1: even k → `picked[k/2]`, odd k → `picked[h + (k-1)/2]`). n ≤ 0 or non-integer-ish →
     return `[]` for n ≤ 0; floor fractional n.
   - `contrastRatio(a, b)` — WCAG 2.x relative-luminance contrast of two `#rrggbb` hex colours
     (sRGB linearisation threshold 0.03928), returns ≥ 1.
   - `inkFor(bgHex)` → `'#ffffff'` or `'#13212b'`, whichever has the higher contrast with bgHex
     (ties → `'#ffffff'`).
   - `wheelLayout(n)` → `'stack'` for n ≤ 8, `'radial-icon'` for 9–12, `'radial-text'` for ≥ 13.
2. Create `js/wheelTheme.test.js` covering n = 1, 2, 6, 9, 12, 13, 16:
   - `wheelPalette(n).length === n`; every entry is from `RTI_WHEEL_SHADES`;
   - n ≤ 12 → all entries distinct;
   - adjacent entries differ, including last → first when n ≥ 3;
   - for every entry, `contrastRatio(entry, inkFor(entry)) >= 4.5`;
   - `wheelLayout` at 8/9 and 12/13 boundaries plus 1 and 16;
   - `contrastRatio('#ffffff', '#000000')` ≈ 21 and symmetric in its arguments.

## Acceptance criteria

- Both files exist, follow the module style above, no dependencies.
- All tests in js/ pass (existing ones untouched).

## Verify command

```bash
node --test js/
```

## Out of scope

- Any other file (script.js, admin.html, css, html). Do not wire the module into pages.
- Do not change RTI_WHEEL_SHADES values.

## Verify (Claude)
PASS round 0. Git state untouched, scope = 2 allowed files, diff matches spec, `node --test js/` 71/71.
Score: codex default/medium 5 | rounds 0 | clean | difficulty low | plan ramp formula failed WCAG at shade 6 — caught by Claude before brief, literal hex list fixed it; medium enough
