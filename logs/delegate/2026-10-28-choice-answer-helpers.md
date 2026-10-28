# Task: Task 1: Answer contract helpers + existing export fix

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 1
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

Implement plan task 1 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/fieldAnswers.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/fieldAnswers.test.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/exportRows.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/exportRows.test.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/index.html

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

## Task (verbatim from the plan)

### Task 1: Answer contract helpers + existing export fix
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `js/fieldAnswers.js`, `js/fieldAnswers.test.js`, `js/exportRows.js`,
  `js/exportRows.test.js`, `admin.html` (only the `buildExportRows` call at ~line 1330 and a
  `<script src="js/fieldAnswers.js">` tag placed before the `js/exportRows.js` tag), `index.html`
  (`<script src="js/fieldAnswers.js">` before `script.js`)
- **Interfaces — Produces** (`js/fieldAnswers.js`):
  - `OTHER = 'อื่นๆ'`, `CHOICE_TYPES = ['checkbox','dropdown','radio']`
  - `isChoiceType(type: string) → boolean`
  - `resolveAnswer(customFields: object|null, field: {key,label}) → string|string[]|undefined` — `cf[key] ?? cf[label]`
  - `otherText(customFields, field) → string` — `cf[key+'__other'] || ''`
  - `formatAnswer(customFields, field) → string` — arrays joined `', '`; `OTHER` replaced by `อื่นๆ: <text>` when text non-empty; undefined → `''`
  - `validateFieldConfig(field) → string|null` — choice type with 0 non-blank options → `'กรุณาเพิ่มตัวเลือกอย่างน้อย 1 ข้อ'`; `allowOther` and an option equal (trimmed) to `OTHER` → `'ตัวเลือก "อื่นๆ" ใช้ไม่ได้ เมื่อเปิดตัวเลือกอื่นๆ (โปรดระบุ)'`; duplicate options → `'ตัวเลือกซ้ำกัน'`; else null
  - `validateAnswer(field, value: string|string[], other: string) → string|null` — required checkbox with `[]` → `'กรุณาเลือกอย่างน้อย 1 ข้อ'`; required radio/dropdown with `''` → `'กรุณาเลือก'`; value includes/equals `OTHER` and other trimmed empty → `'กรุณาระบุ'`; else null
  - `buildCustomFields(fields, read: (field) => {value, other}) → object` — non-base enabled fields only (base keys `firstName,lastName,email,phone,company,position`); key by `field.key`; adds `<key>__other` only when OTHER chosen and text non-empty
  - `buildExportRows(registrations, eventName, formFields = [])` (in `js/exportRows.js`) — after the existing base columns, one column per non-base field in `formFields` order titled by current `label`, value `formatAnswer`; then any remaining `custom_fields` keys not consumed by a field (and not ending `__other`) spread as before (legacy behaviour; array values joined `', '`). `exportRows.js` gets `formatAnswer` via `const { formatAnswer } = typeof require === 'function' ? require('./fieldAnswers.js') : globalThis;` style guard (browser: global from the earlier script tag).
- [ ] Step 1: write `js/fieldAnswers.test.js` covering every function above, including: key lookup wins over label; label fallback for `{ 'แผนก': 'IT' }` with field `{key:'custom_1', label:'แผนก'}`; `formatAnswer` of `['A','อื่นๆ']` + other `'X'` → `'A, อื่นๆ: X'`; each `validateFieldConfig` message; `buildCustomFields` ignores base and disabled fields.
- [ ] Step 2: extend `js/exportRows.test.js`: new-format row with formFields gives column `'ประเภทธุรกิจ'` = `'โรงงาน'`; legacy test `'แผนก'` still passes with no formFields; no `custom_x__other` column ever.
- [ ] Step 3: run `node --test js/` → new tests FAIL.
- [ ] Step 4: implement; update admin call to `buildExportRows(rowsToExport, eventName, state.formFields)`; add script tags.
- [ ] Step 5: `node --test js/` → all PASS.
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

## Verify (Claude)
- git state ok, scope ok, `node --test js/` 101 pass.
- Claude fix: exportRows.js destructured `const { formatAnswer } = ... globalThis` at top level — in browsers a global `const` named like an earlier script's global function declaration is a SyntaxError (vm test didn't catch it). Renamed to `exportAnswers.formatAnswer`.
Score: codex gpt-5.6-sol/medium 4 | rounds 1 | test-gap | difficulty low | solid helpers+tests; one browser global-scope collision fixed by Claude — brief should warn "classic scripts share global scope, never redeclare another module's names"
