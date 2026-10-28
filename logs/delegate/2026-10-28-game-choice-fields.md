# Task: Task 2: Game page renders, validates and collects choice fields

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 2
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

Implement plan task 2 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/script.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/style.css

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

### Task 2: Game page renders, validates and collects choice fields
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `script.js`, `style.css`
- **Consumes:** Task 1 `isChoiceType`, `validateAnswer`, `buildCustomFields`, `OTHER`.
- Do: in `renderForm()` render by type — checkbox: group of `<label class="choice-item"><input type="checkbox" name="<key>" value="<opt>">…`; radio: same with `type="radio"`; dropdown: `<select id="field-<key>" class="form-input">` with first option `placeholder || '— เลือก —'` value `''`. If `allowOther`, append option `OTHER` and a hidden `<input id="field-<key>-other" class="form-input" placeholder="โปรดระบุ">` shown only while OTHER is chosen. Choice groups get `full-width`. All values `htmlEsc`'d. Validation (submit + live) uses `validateAnswer` and existing `showFieldError(key, …)`. `getFormData()` builds `customFields` with `buildCustomFields` (keyed by key; checkbox → array) and keeps `data.customFields = JSON.stringify(...)` so `buildRegistrationPayload` is unchanged. Text-type custom fields still collected (as strings, keyed by key).
- CSS: `.choice-group`, `.choice-item` mirror `.brands-grid`/`.brand-item` look; targets ≥ 44px.
- Accept: existing text fields behave as before; `node --test js/` passes; Claude checks the form in Task 10.
- **Verify:** `node --test js/ && node -e "require('fs').readFileSync('script.js','utf8').includes('buildCustomFields')||process.exit(1)"`

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/ && node -e "require('fs').readFileSync('script.js','utf8').includes('buildCustomFields')||process.exit(1)"
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Verify (Claude)
- Round 0 wasted by Claude: brief builder crashed (f-string braces) and codex got an empty prompt; no edits made. Re-ran with real brief.
- git state ok, scope ok (script.js, style.css), diff read, `node --test js/` 101 pass, `node --check script.js` ok.
Score: codex gpt-5.6-sol/medium 5 | rounds 1 | clean | difficulty med | clean DOM wiring reusing fieldAnswers globals; visual check deferred to Task 10
