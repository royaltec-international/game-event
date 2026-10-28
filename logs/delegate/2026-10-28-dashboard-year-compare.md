# Task: Task 8: Year overview + compare mode

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: high    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 8
Route: risk=normal literal=n plan=codex chosen=codex default/high reason=kept (large UI + logic)

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

Implement plan task 8 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardStats.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardStats.test.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardView.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardView.test.js
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
- Existing modules: js/dashboardView.js (DashboardView module, render helpers kpiTile/barRow/hourlyChart, #dashboard-year-view placeholder already in admin.html); js/dashboardStats.js (eventStats etc. — read for shapes); js/prizeCost.js; js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 8: Year overview + compare mode
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `js/dashboardStats.js`, `js/dashboardStats.test.js`, `js/dashboardView.js`, `js/dashboardView.test.js`, `admin.html`
- **Interfaces — Produces** (`js/dashboardStats.js`):
  - `eventsInYear(events, year) → events` by `bangkokParts(created_at).year`, sorted by first-registration date
  - `yearStats({events, registrationsByEvent, prizesByEvent, costsByEvent}) → {leads, uniqueContacts, contactable, eventCount, cost:{total, perLead|null, complete:boolean}, table:[{eventId,name,firstDate,leads,contactable,given,perLead,costComplete}], brandsTop5, monthly:number[12]}` — monthly by registration date within the year's events
  - `compareStats(a: eventStats, b: eventStats) → {kpis:[{key,a,b,deltaPct|null}], brands:[{name,a,b}], prizesByLabel:[{label,a,b}], choices:[{label, rows:[{option,a,b}]}], hourly:{a:number[24], b:number[24]}}` — prizes/choices matched by trimmed label, duplicate labels summed; deltaPct null when b is 0 or null; also `costComplete:{a:boolean,b:boolean}` so the UI can show ⚠
- UI: year view is the default desktop landing (spec B1, mockup ①): year `<select>`, KPIs, event table (row click → event detail), brands Top 5, monthly 12 bars. Compare (spec B3, mockup ②b), desktop only (hidden ≤ 640px): "⇄ เปรียบเทียบกับ…" opens an event `<select>`; KPIs show `ปีก่อน`-style sub text "<other name>: N ▲/▼ x%"; paired brand bars; hourly overlay (dashed line, `hourlyChart(a, b)`); "✕ เลิกเทียบ".
- [ ] Tests first for `eventsInYear`, `yearStats` (unique contacts across two events sharing a phone = 1; incomplete cost flag), `compareStats` (delta, b=0 → null, label matching).
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
- Visual reference: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/.superpowers/brainstorm/19771-1793172729/content/dashboard-layout-v2.html sections ① (year) and ②b (compare).
- Task 7 already built the event detail in js/dashboardView.js with its own `dashboardState` (events list incl. created_at/config, eventId, cached prior contact keys). Extend that module: add a year view (default landing on desktop > 640px; on ≤ 640px keep landing on the event detail as today), breadcrumb "ภาพรวมปี <year>" link back to the year view, event-table row click → event detail.
- Year view data: for the selected year's events fetch registrations (reuse fetchAllRegistrations per event), prizes (`id, label, quantity, used, remaining`) and prize_costs; compute with yearStats. Cache per year; refresh button re-fetches.
- Compare: load the other event's data with the same fetch used for the detail (eventStats), then compareStats(current, other). Desktop only.
- Leave Export buttons as disabled placeholders (Task 9).

## Verify (Claude)
- codex exited 1 with `usage_limit_exceeded` while writing its final report (code edits had stopped ~4 min earlier); no codex-last.md. Treated the diff on its merits.
- git state ok, scope ok, yearStats/eventsInYear read (union-find unique contacts, cost completeness), year view + compare UI present (picker, cancel, paired overlay, breadcrumb, row click, Export placeholders), `node --check` ok, `node --test js/` 131 pass. Visual QA in Task 10.
Score: codex gpt-5.6-sol/high 4 | rounds 1 | env/tooling | difficulty high | work complete but run ended on ChatGPT Plus usage limit — budget codex quota before big tasks
