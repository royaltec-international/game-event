# Task: Task 4: `prize_costs` table + cost helpers

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: high    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 4
Route: risk=critical literal=n plan=codex chosen=codex default/high reason=kept

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

Implement plan task 4 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/supabase/migrations/20261028_04_prize_costs.sql
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/supabase/tests/prize_costs.test.sql
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeCost.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeCost.test.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/one_spin_per_person.test.sql

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
- Existing modules: js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 4: `prize_costs` table + cost helpers
- **Executor:** codex · **Risk:** critical (RLS)
- **Files allowed:** `supabase/migrations/20261028_04_prize_costs.sql`, `supabase/tests/prize_costs.test.sql`, `js/prizeCost.js`, `js/prizeCost.test.js`
- Migration: `create table prize_costs (prize_id text not null, event_id uuid not null, unit_cost numeric(10,2) check (unit_cost >= 0), vendor_sponsored boolean not null default false, updated_at timestamptz default now(), primary key (prize_id, event_id), foreign key (prize_id, event_id) references prizes(id, event_id) on delete cascade);` enable RLS; one policy `"auth full prize_costs"` for all to authenticated using (true) with check (true); **no anon policy**; `revoke all on prize_costs from anon;`.
- SQL test (style of `one_spin_per_person.test.sql`, use event id `...0005`): RLS enabled; no policy whose roles include `anon`; deleting the prize cascades the cost row; negative cost rejected.
- **Interfaces — Produces** (`js/prizeCost.js`):
  - `costStatus(c: {unit_cost, vendor_sponsored}|undefined) → 'vendor'|'known'|'unknown'`
  - `unitCostOf(c) → number|null` (vendor → 0)
  - `parseCostInput(str) → number|null` — `''`/blank → null; non-numeric or < 0 → `NaN`; accepts `'1,250.50'` → 1250.5
  - `prizeCostRows(eventId, prizes) → [{prize_id, event_id, unit_cost, vendor_sponsored}]` from `prizes[i].unitCost` / `vendorSponsored` (vendor → `unit_cost: null`)
  - `stripPrivatePrizeFields(prizes) → prizes` — shallow copies without `unitCost`, `vendorSponsored`
- [ ] tests first for every function (incl. strip leaves other keys untouched and does not mutate input) → FAIL → implement → PASS.
- **Verify:** `node --test js/ && bash supabase/tests/run.sh` (Claude runs run.sh; needs Docker)

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/ && bash supabase/tests/run.sh
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Verify (Claude)
- git state ok, scope ok, migration reviewed line by line (RLS on, authenticated-only policy, revoke anon, FK cascade, check >= 0).
- `node --test js/` 106 pass; `bash supabase/tests/run.sh` ALL SQL TESTS PASSED.
- Claude tweak: unitCostOf returns Number(unit_cost) (PostgREST numeric safety).
Score: codex gpt-5.6-sol/high 5 | rounds 1 | clean | difficulty med | RLS migration + catalog-based test correct first time
