# Task: Task 9: Report workbook export

Executor: tokenme    Model: tokenme proxy (BIG_MODEL)    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 9
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

Implement plan task 9 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/reportWorkbook.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/reportWorkbook.test.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardView.js

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
- Existing modules: js/dashboardStats.js (eventStats, yearStats, compareStats — read for exact shapes); js/dashboardView.js (Export buttons are disabled placeholders: grep "เพิ่มใน Task รายงาน"; wire them via dashboardState data already loaded); js/exportRows.js (buildExportRows); js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 9: Report workbook export
- **Executor:** tokenme · **Risk:** normal
- **Files allowed:** `js/reportWorkbook.js`, `js/reportWorkbook.test.js`, `admin.html`
- **Consumes:** Task 6 `eventStats` result shape, Task 8 `yearStats` / `compareStats` shapes, Task 1 `buildExportRows`.
- **Interfaces — Produces:** `eventReportSheets(stats, registrationRows, compare|null) → [{name, rows: object[]}]`
  with names in order `สรุป, ของแจก, แบรนด์, สรุปคำตอบ, รายชั่วโมง, ผู้ลงทะเบียน` (+ `เปรียบเทียบ`
  when compare given; `แบรนด์` omitted when `stats.brands` null); `yearReportSheets(yearStats, registrationRows)`
  → `สรุปปี, งาน, แบรนด์รวม, รายเดือน, ผู้ลงทะเบียน`; `reportFilename(name, dateIso) → string`
  (strip `\/:*?"<>|`, collapse spaces to `-`, append `-YYYY-MM-DD.xlsx`). Sheet names ≤ 31 chars.
  Cost cells: unknown → `'ไม่ทราบ'`, vendor → `'vendor (0)'`. `สรุป` includes coverage note text.
- Admin: buttons "Export รายงานงานนี้ (.xlsx)" (event detail) and "Export ภาพรวมปี <year>" (year view)
  call `XLSX.utils.json_to_sheet` per sheet + `XLSX.writeFile`. Year registrant rows add an `'Event Name'` column (already in `buildExportRows`).
- [ ] Tests first: sheet order/names, omitted brands sheet, compare sheet present, filename sanitising (`'Expo: 2026/Q4'` → `'Expo-2026Q4-2026-10-28.xlsx'`).
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

## Extra context
- Files allowed also includes js/dashboardView.js (the Export buttons live there) — edit only the two Export buttons and their click handling.
- Keep edits small: do not re-read admin.html in full; grep for what you need. Comments only where the why is non-obvious.

## Verify (Claude) — round 1
- FAIL: no files written after 18 min. Proxy log shows the model repeatedly hit the 16,384 output-token cap (3 consecutive calls with out=16384, same input) — it tried to emit one huge tool call and got truncated each time. Run killed.

## Fix round 1
Same task, but work in SMALL steps — every single tool call's content must stay under ~150 lines:
1. Write `js/reportWorkbook.js` with ONLY `reportFilename` + module.exports. Run `node --test js/`.
2. Edit it to add `eventReportSheets` (one Edit). Then another Edit adding `yearReportSheets`.
3. Write `js/reportWorkbook.test.js` with 4 short tests (sheet order/names, omitted brands sheet, compare sheet present, filename sanitising `'Expo: 2026/Q4'` + `'2026-10-28T10:00:00Z'` → `'Expo-2026Q4-2026-10-28.xlsx'`).
4. Add `<script src="js/reportWorkbook.js"></script>` in admin.html right after the `js/dashboardView.js` tag (one small Edit).
5. In js/dashboardView.js replace the two disabled Export buttons (grep "เพิ่มใน Task รายงาน") with enabled buttons `data-dash-action="export-event"` / `data-dash-action="export-year"`, and in the existing click handler add those two actions calling a new small function that builds sheets from already-loaded dashboardState data, then `XLSX.utils.book_new()`, `XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name)` per sheet, `XLSX.writeFile(wb, reportFilename(name, new Date().toISOString()))`. Registrant rows: `buildExportRows(registrations, event.name, event.config.formFields || [])`.
Do not re-read whole large files; use grep -n and Read with offset/limit.

## Verify (Claude) — fix round 1
- git state ok, scope ok (admin.html, js/dashboardView.js, js/reportWorkbook.js + test), diff read, `node --test js/` 136 pass.
- Claude fixes: ของแจก sheet put total cost in the per-unit column (now unitCost vs cost); Thai label wording for new/returning.
Score: tokenme deepseek-v4-flash/default 3 | rounds 2 | env/tooling | difficulty med | round 1 looped on the 16k output cap (whole file in one tool call) — brief must force small Write/Edit steps; round 2 clean apart from one column bug
