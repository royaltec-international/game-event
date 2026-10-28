# Choice fields + Marketing Dashboard Implementation Plan (2026-10-28)

> **For agentic workers:** run through `/kongming` (owner's choice). One task per executor run. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choice-type registration fields (checkbox/dropdown/radio + "อื่นๆ"), a marketing Dashboard
in admin.html (event detail, mobile event-day view, year overview, compare), per-prize cost →
cost per lead, and an .xlsx report export.

**Architecture:** Static site + Supabase. All counting/maths lives in pure, node-tested classic-script
modules (`js/fieldAnswers.js`, `js/prizeCost.js`, `js/dashboardStats.js`, `js/reportWorkbook.js`);
admin.html / script.js / `js/dashboardView.js` only fetch and render. One migration adds an
admin-only `prize_costs` table.

**Tech Stack:** vanilla JS (classic scripts that also `module.exports`), Supabase JS 2.117.3,
SheetJS xlsx@0.18.5 (already loaded), Postgres 16 tests in Docker, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-28-choice-fields-dashboard-design.md` (executors read it).

## Part 1 — Summary (for a human)

The owner wants the marketing team to stop counting exported rows by hand. Two moments matter: on
event day a staff member on a phone needs to see registrations, prizes given and what is about to
run out; after the event a manager on a desktop wants the full picture, a comparison with the same
show last year, cost per lead, and an Excel report. To make answers countable, custom registration
fields gain checkbox, dropdown and radio types with an optional "อื่นๆ (โปรดระบุ)".

Key decisions (all in the spec, which was reviewed by a UX pass and a builder check): the dashboard
is a new panel in the existing admin page with two levels — year overview, click an event for the
detail — instead of a "single/year" toggle the owner found confusing. Comparison is opt-in via a
"เปรียบเทียบกับ…" button and the admin picks the other event. Custom answers switch from being keyed
by field label to field key so renaming a field no longer splits its data; legacy label-keyed rows
are still read. Prize costs live in a new admin-only table because `prizes` and `events.config` are
readable by the anonymous game page — this also means the admin must strip cost fields before
writing `events.config` (it currently stores `state.prizes` there verbatim). "ได้ของ" and cost use
`prizes.used`; cost counts only prizes given out; missing prices are flagged, never silently zero;
vendor-sponsored prizes count as known zero cost.

Architecture in plain words: every number on the dashboard comes from a pure function with unit
tests; the UI code is thin. The dashboard loads an event's registrations with the existing
1000-row paginated fetch, plus only contact columns of all registrations for "new vs returning".
Charts are CSS bars and inline SVG — no chart library. Times are Asia/Bangkok (UTC+7, no DST).

Out of scope: sales/CRM data, booth footfall, logging blocked repeat spins, automatic matching of
"same show last year", vendor gift value, compare on mobile, any change to `draw_prize`.

Execution: codex does most implementation; **tokenme** (`claude-tokenme`, DeepSeek/Qwen/Gemma via a
local proxy — trial run requested by the owner) gets two well-bounded tasks (5 and 9); Claude does
the final visual QA. Milestones ship in order M1 (tasks 1–3) → M2 (4–5) → M3 (6–7) → M4 (8) →
M5 (9) → QA (10).

## Global Constraints

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

## Review Focus

1. Legacy registrations (custom_fields keyed by label, string values) must still appear in the
   registrations export and dashboard → test in Task 1 (`resolveAnswer` label fallback) and Task 6.
2. Event with PDPA off (all rows `'N/A'`) → "ไม่ได้เปิด PDPA", excluded from contactable cost → Task 6 test.
3. Event with zero registrations / zero prizes → no NaN/Infinity anywhere (cost per lead `null`) → Task 6 test.
4. Registration timestamps near midnight UTC land on the right Bangkok date/hour → Task 6 test (`'2026-10-24T17:30:00Z'` → date `2026-10-25`, hour 0).
5. Cost fields never reach `events.config` → Task 4 test (`stripPrivatePrizeFields`) + Task 5 step.

---

## Part 2 — Tasks

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

### Task 2: Game page renders, validates and collects choice fields
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `script.js`, `style.css`
- **Consumes:** Task 1 `isChoiceType`, `validateAnswer`, `buildCustomFields`, `OTHER`.
- Do: in `renderForm()` render by type — checkbox: group of `<label class="choice-item"><input type="checkbox" name="<key>" value="<opt>">…`; radio: same with `type="radio"`; dropdown: `<select id="field-<key>" class="form-input">` with first option `placeholder || '— เลือก —'` value `''`. If `allowOther`, append option `OTHER` and a hidden `<input id="field-<key>-other" class="form-input" placeholder="โปรดระบุ">` shown only while OTHER is chosen. Choice groups get `full-width`. All values `htmlEsc`'d. Validation (submit + live) uses `validateAnswer` and existing `showFieldError(key, …)`. `getFormData()` builds `customFields` with `buildCustomFields` (keyed by key; checkbox → array) and keeps `data.customFields = JSON.stringify(...)` so `buildRegistrationPayload` is unchanged. Text-type custom fields still collected (as strings, keyed by key).
- CSS: `.choice-group`, `.choice-item` mirror `.brands-grid`/`.brand-item` look; targets ≥ 44px.
- Accept: existing text fields behave as before; `node --test js/` passes; Claude checks the form in Task 10.
- **Verify:** `node --test js/ && node -e "require('fs').readFileSync('script.js','utf8').includes('buildCustomFields')||process.exit(1)"`

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

### Task 10: Visual + flow QA
- **Executor:** claude (pinned) · **Risk:** normal
- **Files allowed:** none (fixes go back to the owning task as a fix round)
- Do: headless Chrome (KB `claude-code-tooling.md`: CDP + Fetch stub for Supabase) screenshots at
  390 and 1280 px: game form with all three choice types + other; admin field editor; dashboard
  year view, event detail, compare, mobile with a low-stock prize; export both workbooks and open
  sheet names with node + xlsx. Owner reviews screenshots before push.
- **Verify:** `node --test js/ && bash supabase/tests/run.sh`

## Executor notes for kongming

- `tokenme` is not in kongming's table yet (owner trial). Run it exactly like the `9arm` command,
  replacing `claude-9arm` with `claude-tokenme` (log `LOGDIR/<stem>.tokenme.log`), same allow/deny
  lists. Same caveats as 9arm: Bash not sandboxed; repo holds only the public Supabase publishable
  key. Fallback if it fails twice → `codex`. Record results in kongming `FEEDBACK.md`.
- Task 4 is `critical` (RLS) → Claude reviews the migration line by line before merge.
- Shared-state tasks: 3, 5, 7, 8, 9 all edit `admin.html` — run strictly in order, never in parallel.
- Migration 04 must be applied in Supabase by the owner (SQL Editor) before Task 5 is used live.
