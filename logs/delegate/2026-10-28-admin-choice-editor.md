# Task: Task 3: Admin field editor for choice types

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 3
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

Implement plan task 3 exactly as specified below (the task text is the contract; the spec explains why).

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
- Existing modules: js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 3: Admin field editor for choice types
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `admin.html`
- **Consumes:** Task 1 `isChoiceType`, `validateFieldConfig`, `OTHER`.
- Do in `renderFormFields()`: type options `text,email,tel,number,checkbox,dropdown,radio` with Thai
  labels (`ข้อความ, อีเมล, เบอร์โทร, ตัวเลข, เลือกได้หลายข้อ (checkbox), รายการเลือก (dropdown), เลือกข้อเดียว (radio)`), base fields stay disabled.
  For choice types render an options editor (`opt input`, ↑ ↓ ✕ buttons, "+ เพิ่มตัวเลือก") and a
  toggle "มีตัวเลือก อื่นๆ (โปรดระบุ)" (`allowOther`); hide Placeholder for checkbox/radio. New
  handlers `setFFOption(i, j, val)`, `moveFFOption(i, j, dir)`, `removeFFOption(i, j)`,
  `addFFOption(i)`; switching type to a choice type initialises `options: ['ตัวเลือก 1']`,
  `allowOther: false`. `setFF(i,'type',…)` currently does not re-render — on a type change initialise options as above and call `renderFormFields()`. In `saveToServer()` before writing: run `validateFieldConfig` on each enabled
  custom field; first error → `toast('<label>: <msg>', 'err')` and abort the save (button re-enabled).
  Show a one-line hint under the type select when an existing field with registrations changes type:
  "คำตอบเก่ายังอยู่ แต่ dashboard จะนับตามตัวเลือกใหม่".
- Accept: editor works on 390px width (no horizontal scroll), 44px buttons; `node --test js/` passes.
- **Verify:** `node --test js/ && grep -q "addFFOption" admin.html`

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/ && grep -q "addFFOption" admin.html
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Verify (Claude)
- git state ok, scope ok (admin.html), diff read; state.registrations and sync 'error' class exist; `node --test js/` 101 pass.
Score: codex gpt-5.6-sol/medium 5 | rounds 1 | clean | difficulty med | handled re-render on type change + mobile grid; review fix list in plan was enough
