# Task: Task 5: Admin prize card cost input + load/save

Executor: tokenme    Model: tokenme proxy (BIG_MODEL)    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 5
Route: risk=normal literal=n plan=tokenme chosen=tokenme deepseek-v4-flash/default reason=kept (owner trial)

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

Implement plan task 5 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html

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

### Task 5: Admin prize card cost input + load/save
- **Executor:** tokenme · **Risk:** normal
- **Files allowed:** `admin.html`
- **Consumes:** Task 4 `parseCostInput`, `costStatus`, `prizeCostRows`, `stripPrivatePrizeFields`.
- Do: add `<script src="js/prizeCost.js">` near other `js/` tags. In the prize card (`renderPrizes()`)
  add "ราคา/ชิ้น (บาท)" text input (`inputmode="decimal"`) and checkbox "vendor สนับสนุน (ฟรี)";
  checking vendor disables + clears the price input. Invalid price (`NaN`) → field error text
  "ใส่ตัวเลข 0 ขึ้นไป" and block save. In `loadFromServer()` fetch
  `prize_costs` (`select('prize_id, unit_cost, vendor_sponsored').eq('event_id', id)`) and set
  `state.prizes[i].unitCost` / `vendorSponsored`. This fetch must **never throw** inside
  `loadFromServer`'s try (its catch resets `state.prizes` to defaults and the next save would delete
  real prizes via `syncPrizesTable`): check `{ error }`, on error leave cost fields unset and
  `toast('โหลดราคาของรางวัลไม่สำเร็จ', 'err')`. In `saveToServer()` write
  `prizes: stripPrivatePrizeFields(state.prizes)` into config, and after `syncPrizesTable` succeeds
  upsert `prizeCostRows(...)` into `prize_costs` (`onConflict: 'prize_id,event_id'`); on error toast
  "บันทึกราคาไม่สำเร็จ" (config save still counts).
- Accept: after save, `events.config.prizes[*]` has no `unitCost`/`vendorSponsored`; reload shows saved values; a `prize_costs` error does not change `state.prizes`.
- **Verify:** `node --test js/ && grep -q "stripPrivatePrizeFields(state.prizes)" admin.html && grep -q "from('prize_costs')" admin.html`

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/ && grep -q "stripPrivatePrizeFields(state.prizes)" admin.html && grep -q "from('prize_costs')" admin.html
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Verify (Claude)
- git state ok, scope ok (admin.html), diff read: strip before config write, never-throw cost load, upsert after prize sync, NaN blocks save. `node --test js/` 106 pass, greps pass.
- Claude cleanup: removed confusing/inaccurate comments and a no-op id guard / '+' prefix hack in setPrizeCost.
Score: tokenme deepseek-v4-flash/default 4 | rounds 1 | clean | difficulty med | correct logic first try; noisy inaccurate comments; ~2.6M input tokens over 47 calls (heavy re-reading of admin.html)
