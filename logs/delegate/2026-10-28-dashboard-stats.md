# Task: Task 6: Event statistics module

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: high    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 6
Route: risk=normal literal=n plan=codex chosen=codex default/high reason=kept (non-trivial logic -> high)

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

Implement plan task 6 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardStats.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardStats.test.js

## Context (read, do not edit)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/specs/2026-10-28-choice-fields-dashboard-design.md — the design this plan implements (read the sections the task cites)
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md — "Global Constraints" and earlier tasks' Interfaces blocks
- Existing helpers already in the repo from earlier tasks are under js/ — reuse their exact names.

## Global constraints (apply to this task)

- Repo: `/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event`.
- UI text Thai; code/comments/commits English; match surrounding style.
- Browser modules are classic scripts ending with
  `if (typeof module !== 'undefined' && module.exports) { module.exports = {...}; }` (see `js/remainingPrizes.js`).
- No new third-party scripts; no chart library. Executors have no network need.
- Do not change `draw_prize`, `handleSpin`/spin maths, or `supabase/schema.sql`.
- Dashboard: body text ≥ 14px, update-time text ≥ 13px, touch targets ≥ 44px on mobile, admin tokens
  (`--brand #1f5f8b`, `--success`, `--text-muted`), WCAG AA; low stock also shown by text/⚠, not colour only.
- Asia/Bangkok = UTC+7 fixed. Low stock: `quantity > 0 && (remaining <= quantity * 0.1 || remaining <= 5)`.
- Other marker: `OTHER = 'อื่นๆ'`; other text key `<field.key>__other`.
- Never put `unitCost` / `vendorSponsored` into `events.config`.
- Tests: `node --test js/` (all), `bash supabase/tests/run.sh` (Docker, run by Claude).
- Browser JS files are classic scripts sharing ONE global scope: never declare a top-level `const`/`let`/`function` whose name another loaded script already declares (e.g. don't `const { formatAnswer } = globalThis`). In node-loaded modules use a namespaced import: `const fa = typeof require === 'function' ? require('./fieldAnswers.js') : globalThis;` then `fa.formatAnswer(...)`.
- Existing modules: js/prizeCost.js (costStatus, unitCostOf, parseCostInput, prizeCostRows, stripPrivatePrizeFields); js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 6: Event statistics module
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `js/dashboardStats.js`, `js/dashboardStats.test.js`
- **Consumes:** Task 1 `resolveAnswer`, `isChoiceType`, `OTHER`; Task 4 `costStatus`, `unitCostOf`
  (load via `require` in node; in browser they are globals — guard with `typeof require`).
- **Interfaces — Produces:**
  - `bangkokParts(iso) → {date:'YYYY-MM-DD', hour:0-23, month:1-12, year}`
  - `contactKeys(r) → string[]` — `'p:'+digits(phone)` if ≥ 9 digits, `'e:'+lower(trim(email))` if contains `@`
  - `isLowStock(p) → boolean` (Global Constraints rule)
  - `prizeRows(prizes, costsById) → [{id,label,quantity,used,remaining,low,costStatus,unitCost,cost}]` sorted by remaining asc, then label
  - `costSummary(prizeRows, leads, contactable|null) → {total, perLead|null, perContactable|null, coverage:{known,given}, missing:string[]}` — only rows with `used > 0` count toward coverage
  - `brandSummary(registrations, brandItems) → {rows:[{name,count,pct}], anyPct, avgPerPerson, base}` — split on `', '`, match trimmed to `brandItems`; strings not in `brandItems` go into one `OTHER` row (anyone can call `draw_prize`, so free text must not create bars); pct = count/base·100; base = registrations.length
  - `choiceSummary(registrations, field) → {type, rows:[{option,count,pct}], answered, unanswered, multi:boolean}` — answers not in `field.options` count as `OTHER`; pct base = answered
  - `hourly(registrations) → {days:[date], byDay:{[date]: number[24]}, total:number[24], peak:{hour,count}|null}`
  - `eventStats({event, registrations, prizes, costs, priorContactKeys:Set}) → {leads, contactable|null, pdpaOff:boolean, newCount|null, returningCount|null, given, soldOut, lowCount, prizes, cost, brands|null, choices:[...], hourly}` — `contactable` = rows with `pdpa_consent` in `('YES','true')`; `pdpaOff` when every row is `'N/A'` (or no rows and `config.pdpa.enabled` false) → contactable null; `given` = Σ `prizes.used`; `soldOut` = rows with `prize_id === ''`; new/returning null when phone and email fields are both disabled in `event.config.formFields`; choices only for enabled choice fields.
- [ ] Tests first: the five Review Focus cases relevant here (legacy label answers, PDPA off, empty event → no NaN, Bangkok midnight, low stock at quantity 10 remaining 1 / quantity 100 remaining 6 vs 11), plus brands `'A, hacked'` with items `['A','B']` → rows A=1, B=0, อื่นๆ=1, plus cost with one unknown prize → `missing` lists its label and `coverage` 1/2, vendor prize counts as known 0.
- **Verify:** `node --test js/`

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Data facts (from the real code)
- registrations row: {id, event_id, first_name, last_name, email, phone, company, position, prize_label, prize_id ('' when sold out), brands ('A, B' joined with ', '), pdpa_consent ('YES'|'NO'|'N/A'; legacy 'true'/'false'), custom_fields (object|null), created_at ISO UTC}
- prizes row: {id, event_id, label, quantity, used, remaining}
- prize_costs row: {prize_id, unit_cost (number|string|null), vendor_sponsored}
- event: {id, name, created_at, config:{formFields[], brandsCheckbox:{enabled, items[]}, pdpa:{enabled}}}; formFields with no config → base fields phone/email enabled.

## Verify (Claude)
- git state ok, scope ok, module read in full; `node --test js/` 120 pass.
- Claude tweaks: prizeRows falls back to quantity-used when `remaining` not selected (else every prize looked low-stock); cost coverage counts prize lines not units (matches "ครบ 4/5 รายการ" UI copy).
Score: codex gpt-5.6-sol/high 4 | rounds 1 | spec-misread | difficulty high | solid, well-tested; coverage unit ambiguity was the plan's fault (plan said "1/2" without saying lines vs units)
