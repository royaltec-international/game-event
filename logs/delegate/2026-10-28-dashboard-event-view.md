# Task: Task 7: Dashboard panel — event detail + mobile view

Executor: codex    Model: gpt-5.6-sol (config default)    Reasoning: high    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-28-choice-fields-dashboard.md, task 7
Route: risk=normal literal=n plan=codex chosen=codex default/high reason=kept (large UI)

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

Implement plan task 7 exactly as specified below (the task text is the contract; the spec explains why).

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are relative to it unless absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardView.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/dashboardView.test.js

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
- Existing modules: js/dashboardStats.js (bangkokParts, contactKeys, isLowStock, prizeRows, costSummary, brandSummary, choiceSummary, hourly, eventStats — read it for the exact result shape); js/prizeCost.js; js/fieldAnswers.js (OTHER, CHOICE_TYPES, isChoiceType, resolveAnswer, otherText, formatAnswer, validateFieldConfig, validateAnswer, buildCustomFields).

## Task (verbatim from the plan)

### Task 7: Dashboard panel — event detail + mobile view
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `admin.html`, `js/dashboardView.js`, `js/dashboardView.test.js`
- **Consumes:** Task 6 `eventStats`, `contactKeys`; existing `fetchAllRegistrations(eventId)`, `toast`, `esc`.
- Do: add `<script src="js/dashboardStats.js">` and `<script src="js/dashboardView.js">` after the
  `js/fieldAnswers.js` / `js/prizeCost.js` tags. New first sidebar item `data-panel="dashboard"` (title "Dashboard", sub "สรุปผลงานและของแจก")
  and `#panel-dashboard`. `js/dashboardView.js` exports render helpers returning HTML strings
  (`kpiTile(label, value, sub)`, `barRow(label, value, max, text, opts)`, `hourlyChart(counts24, overlay24|null)`),
  tested for escaping and common-scale widths (`value/max`). Event detail per spec B2 and mockup
  `.superpowers/brainstorm/19771-1793172729/content/dashboard-layout-v2.html` section ②: breadcrumb
  "ภาพรวมปี <year> › <event>", event `<select>`, KPI grid, prizes (remaining-first, ⚠ + "เหลือ N/Q"),
  brands, choice summaries with chip toggles (hidden set in `localStorage['dash-hidden-'+eventId]`,
  wrapped in try/catch), hourly with per-day tabs + "รวมทุกวัน", cost line with amber
  "อาจต่ำกว่าจริง · <names> ยังไม่มีราคา" when coverage incomplete. Prior contacts: fetch
  `registrations.select('event_id, phone, email, created_at')` for events created before this one,
  paginated 1000 with `.order('created_at').order('id')` like `fetchAllRegistrations` → `Set` of
  `contactKeys`. The dashboard loads its own event list `events.select('id,name,slug,created_at,config')`
  and keeps its own `dash` state (event id, data); it must **not** call `selectEvent()` or touch
  `state.prizes` / `state.formFields` / the editor's current event. Mobile (≤ 640px) per spec B6: alert banner, 2 KPIs, prize list,
  small hourly, "ดูเพิ่ม" toggle for the rest; default event = event of the most recent registration
  (`order created_at desc limit 1`), fallback newest event. Auto-refresh every 30 s while the
  dashboard panel is active and `document.visibilityState === 'visible'`; "↻ รีเฟรช" button; status
  "อัปเดต HH:MM" / "ขาดการเชื่อมต่อ" (keep last numbers on error). Loading uses existing `showLoading`.
- **Verify:** `node --test js/ && grep -q 'data-panel="dashboard"' admin.html`

## Acceptance criteria

- Everything under the task's Accept / steps holds.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/ && grep -q 'data-panel="dashboard"' admin.html
```
(If the command includes `bash supabase/tests/run.sh`, skip that part — it needs Docker; Claude runs it.)

## Out of scope

- Files not listed above; refactors of unrelated code; any change to draw_prize, spin maths, schema.sql.

## Extra context
- Visual reference (open and follow layout/copy): /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/.superpowers/brainstorm/19771-1793172729/content/dashboard-layout-v2.html (sections ② and ③; ①/②b are Task 8 — leave a placeholder container for the year view and do not build compare).
- admin.html navigation: sidebar buttons `.nav-item[data-panel]`, panels `#panel-<name>`, wired in `setupNav()`; titles set in `#panel-title` / `#panel-sub`. Add Dashboard as the FIRST item but keep the existing default panel behaviour unchanged except that Dashboard becomes active on load.
- prizes query must select `id, label, quantity, used, remaining`; prize_costs `prize_id, unit_cost, vendor_sponsored`.
- Keep dashboard JS in js/dashboardView.js where practical (render helpers + a `DashboardView`-style init) so admin.html grows little.

## Verify (Claude)
- git state ok, scope ok, data-fetch code read (ordered pagination, own dashboard state, no selectEvent/state.* writes, escaping via dashboardViewEsc), `node --test js/` 125 pass, grep ok. Visual QA deferred to Task 10.
- Claude tweak: cache prior-event contact keys per event (was re-fetched on every 30 s refresh).
Score: codex gpt-5.6-sol/high 5 | rounds 1 | clean | difficulty high | large UI task landed in one run with Extra-context block (mockup path, nav wiring, exact selects)
