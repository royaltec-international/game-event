# Choice fields + Marketing Dashboard — Design

Date: 2026-10-28 · Status: draft for owner approval
Mockup (visual reference, gitignored): `.superpowers/brainstorm/19771-1793172729/content/dashboard-layout-v2.html`

## Why

The marketing team runs the spin-wheel at trade-show booths, often the same show every year.
Today the admin can only collect free-text answers and has no summary view — numbers come from
exporting raw rows and counting by hand. Two needs:

1. **On event day** a staff member on a phone wants a glance: how many registered, how many prizes
   went out, which prize is about to run out.
2. **After the event / across the year** a marketing manager on a desktop wants the full picture,
   wants to compare this year's show with last year's (to plan staffing and stock), and wants a
   report file to hand on.

To make the summary meaningful the registration form needs answers that can be counted — so custom
fields gain choice types (checkbox, dropdown, radio).

Scope is marketing only. Sales follow-up (lead status, deal value, CRM) is out of scope.

## Goals

- G1. Admin can add custom fields of type **checkbox** (multi), **dropdown** and **radio** (single),
  each with an editable option list and an optional "อื่นๆ (โปรดระบุ)" option.
- G2. A **Dashboard** menu in admin.html (same login) with two levels:
  year overview → click an event → event detail. Mobile opens straight on the latest event.
- G3. Event detail can be **compared** with one other event the admin picks.
- G4. **Cost per lead**, from an optional per-prize unit cost.
- G5. **Export .xlsx report** with separate sheets, from the event detail and from the year view.

## Non-goals

- No sales/CRM data, no booth footfall / conversion, no logging of blocked repeat-spin attempts.
- No automatic "same show last year" matching — the admin picks the comparison event by hand.
- No "vendor gift estimated value" field (possible later).
- No chart library; no new backend service.

## Anti-goals (would be a failure even if it works)

- A number that silently misleads: summed stock across events, cost per lead that hides missing
  prices, percentages without a stated base, bars not on a common scale.
- An event-day phone view that needs scrolling or tapping to see whether a prize is running out.
- Renaming a field label splitting one field's answers into two buckets.
- Breaking the game page or existing registrations / exports.

## Constraints (from the existing project)

- Static site (GitHub Pages) + Supabase Cloud; vanilla JS; admin.html is one big file with
  helpers in `js/*.js` covered by `node --test js/`. Pure logic goes in new `js/*.js` modules with tests.
- Schema changes as migration files in `supabase/migrations/` (next: `20261028_04_...`); DB tests
  in `supabase/tests/` run by `supabase/tests/run.sh`.
- Registrations are written only via `draw_prize(p_event_id, p_registration jsonb)`; it passes
  `custom_fields` through as a jsonb object — no RPC change needed for the new answer format.
- Admin reads registrations with paginated `range()` (1000-row pages) — the dashboard must too.
- UI text Thai; admin design tokens (`--brand #1f5f8b`, `--success`, `--text-muted`), ≥44px touch
  targets on mobile, body text ≥14px on the dashboard, WCAG AA contrast.
- Third-party scripts only from pinned CDN URLs with SRI (xlsx@0.18.5 already loaded).
- Times shown in Asia/Bangkok.

## Part A — Choice fields

### Admin (form-field editor, "ประเภท" select)

- Types for custom fields: text, email, tel, number, **checkbox, dropdown, radio**. Base fields keep
  their fixed type.
- When type is a choice type the card shows an **options editor**: one row per option (text input,
  ↑ ↓, ✕), "+ เพิ่มตัวเลือก", and a toggle **"มีตัวเลือก อื่นๆ (โปรดระบุ)"**.
- Placeholder is used as the dropdown's empty first item ("— เลือก —" default); hidden for
  checkbox/radio.
- Saving a choice field with zero options is blocked with a Thai error.
- Field config shape (in `events.config.formFields[]`):
  `{ key, label, type, required, enabled, isBase, placeholder, options: string[], allowOther: boolean }`.
  `options`/`allowOther` exist only for choice types.

### Game page (script.js form render/validate/collect)

- checkbox → group of checkboxes; radio → radio group; dropdown → `<select>`.
- Choosing "อื่นๆ" reveals a text input; it becomes required when "อื่นๆ" is chosen.
- Required: checkbox = at least one ticked; radio/dropdown = a value chosen.
- Same visual language and live validation as existing fields; 44px targets.

### Stored answer format (contract shared by game, dashboard, export)

New registrations store custom answers in `registrations.custom_fields` **keyed by field `key`**
(not label):

```json
{
  "custom_1761600000000": "โรงงาน",
  "custom_1761600000001": ["แบรนด์ A", "อื่นๆ"],
  "custom_1761600000001__other": "ขายส่ง"
}
```

- text/email/tel/number/radio/dropdown → string; checkbox → string array.
- The literal `"อื่นๆ"` marks the other option; the typed text goes in `<key>__other`.
- **Legacy rows** are keyed by label with string values. Every reader resolves a field's answer as
  `cf[field.key] ?? cf[field.label]`. One shared helper (`js/fieldAnswers.js`) does this, used by
  dashboard, the new report export **and the existing registrations-page export / table**
  (`js/exportRows.js` and the registrations list in admin.html) — otherwise their custom-field
  columns would show raw `custom_<timestamp>` keys after the switch.
- When `allowOther` is on, the admin cannot add an ordinary option whose text is `อื่นๆ` (Thai
  error) so the marker stays unambiguous.

## Part B — Dashboard

New sidebar item **"Dashboard"** (first item). Pure aggregation lives in `js/dashboardStats.js`
(tested); admin.html only fetches and renders. Bars are CSS/inline SVG; every bar group in one chart
uses one common scale.

### B1. Year overview (default on desktop)

Year selector (events grouped by `events.created_at` year, Asia/Bangkok — owner confirmed). All
year numbers come from the events in that group; the monthly chart buckets those events'
registrations by registration date (so a December-created event's January rows show in January of
the chart but still count toward the event's year).
- KPIs: ลงทะเบียนรวม · ผู้ติดต่อไม่ซ้ำทั้งปี (deduped by phone digits / lower-trim email) ·
  ติดต่อต่อได้ (PDPA = true) · จำนวนงาน · ต้นทุนต่อ lead ทั้งปี (with coverage flag, see B4).
- Event table: name, first-registration date, registrations, contactable, prizes given, cost per lead
  (⚠ when incomplete). Row click → event detail. Sorted by date; inline bar for registrations.
- Brands interested across all events — Top 5, people counts, "จาก N คน".
- Registrations per month (12 bars, empty months shown as empty).
- Not shown here: per-prize stock, custom-field summaries, hourly chart (different per event).
- Button **"Export ภาพรวมปี <year>"**.

### B2. Event detail

Breadcrumb `ภาพรวมปี 2026 › <event>`; event dropdown (events only, no "ทั้งปี" item).
- KPIs: ลงทะเบียน · ติดต่อต่อได้ (PDPA) · คนใหม่ / เคยมางานเราแล้ว · ได้ของ (ชิ้น) ·
  ลงทะเบียนแต่ของหมด (prize_id = '') · รายการใกล้หมด · ต้นทุนต่อ lead · ต้นทุนต่อ lead ที่ติดต่อได้.
- **Prizes**: one row per prize sorted by remaining ascending; label "เหลือ N/Q"; low stock =
  remaining ≤ max(1, floor(20% of quantity)) (owner change 2026-10-28: 3-piece stock warned before any was given) → amber bar + "⚠" + text (not colour alone).
- **Brands** (if the event has brands enabled): people per brand sorted desc, "N คน (x%)", base =
  registrants, note "เลือกได้หลายข้อ รวมเกิน 100%". Brands string split on ", " and matched to the
  event's brand list.
- % สนใจแบรนด์อย่างน้อย 1 and average brands per person.
- **Choice-field summaries**: every enabled choice field shown by default, each hideable (chip
  toggle, remembered in localStorage per event). Radio/dropdown: % of people who answered + "ไม่ตอบ N".
  Checkbox: same base + multi-answer note. "อื่นๆ" counted as one bucket; the typed text is not shown
  on the dashboard (export only). Answers matching no current option are grouped under "อื่นๆ".
  Base fields (name, phone, email, company, position) are never summarised.
- "ติดต่อต่อได้" counts `pdpa_consent = 'YES'` (what `js/drawPayload.js` stores; legacy `'true'` also counts). Events whose rows are all `'N/A'` (PDPA section off)
  show "ไม่ได้เปิด PDPA" instead of a number and are excluded from contactable totals/costs.
- **Hourly registrations**: per-day tabs (one per date that has registrations) + "รวมทุกวัน";
  hours with zero shown as empty bars; peak hour labelled.
- Button **"Export รายงานงานนี้ (.xlsx)"**.

### B3. Compare mode (desktop only)

Button **"⇄ เปรียบเทียบกับ…"** → pick another event. Without it nothing is compared.
- KPIs show the other event's value + ▲/▼ % change.
- Brands: paired bars (this / other); brand present in only one event shows "—".
- Hourly: other event as a dashed line over this event's bars, aligned by hour of day (per selected
  day index; "รวมทุกวัน" compares totals per hour).
- Prizes: total given compared; per-prize only for identical labels (trimmed; duplicate labels in
  one event are summed).
- Choice fields: compared only for identical labels.
- "✕ เลิกเทียบ" returns to normal. Export while comparing adds a "เปรียบเทียบ" sheet.

### B4. Cost per lead

- New table **`prize_costs`** `(event_id uuid, prize_id text, unit_cost numeric(10,2) null,
  vendor_sponsored boolean not null default false, updated_at timestamptz, primary key (prize_id, event_id),
  foreign key → prizes on delete cascade)` with RLS **authenticated only** (migration
  `20261028_04_prize_costs.sql`). Not columns on `prizes`: `prizes` is anon-readable
  (`schema.sql` "anon read prizes") and the game page would expose internal costs.
  Admin prize card: "ราคา/ชิ้น (บาท)" input + checkbox "vendor สนับสนุน (ฟรี)" (checking it disables
  the price input); saved alongside the existing prizes upsert.
- Per prize: vendor_sponsored → cost 0 (known); unit_cost set → known; else **unknown**.
- Event cost = Σ known (`prizes.used` × unit_cost). Only prizes given out count, not stock.
  `prizes.used` is the source of truth for "ได้ของ" and cost (it is what physically left the booth,
  and survives registration deletes); "ลงทะเบียนแต่ของหมด" counts registrations with `prize_id = ''`.
- Cost per lead = event cost ÷ registrations; per contactable lead = ÷ PDPA-consented registrations.
- Coverage = given-out prizes with known cost / given-out prizes. If < 100%: amber "อาจต่ำกว่าจริง ·
  <prize names> ยังไม่มีราคา". Incomplete events get ⚠ in the year table and compare view.
- Year cost per lead = Σ cost ÷ Σ registrations over all events, with the same coverage flag.

### B5. New vs returning

A registration is **returning** if its normalised phone digits or lower-trim email matches a
registration in any event created earlier. Events where both phone and email are disabled show
"นับไม่ได้ (ไม่มีเบอร์/อีเมล)".

Data loading: fetch only `event_id, phone, email, created_at` for all registrations (paginated
1000-row pages) to compute returning / unique contacts client-side; fine for the expected volume
(thousands). If it ever exceeds ~20k rows, move to an RPC — out of scope now.

### B6. Mobile (event day)

- Opens on the event with the most recent registration (fallback: newest event).
- Order: low-stock alert banner (only if any) → 2 KPIs (ลงทะเบียน, ได้ของ) → prize list (remaining
  ascending) → small hourly chart → "ดูเพิ่ม" expands brands / fields / export.
- Auto-refresh every 30 s while the tab is visible; manual "↻ รีเฟรช"; status dot + "อัปเดต HH:MM"
  (≥13px); on fetch failure keep last numbers and show "ขาดการเชื่อมต่อ".
- No compare on mobile (builder's call: unlikely on event day).

## Delivery order (milestones)

M1 choice fields (admin + game + answer format + fieldAnswers + existing export fix) →
M2 prize cost (migration + admin prize card) → M3 event detail + mobile → M4 year overview +
compare → M5 xlsx report. Each milestone is shippable on its own.

## Part C — Export (.xlsx via existing SheetJS)

Event report sheets: **สรุป** (all KPIs + coverage note) · **ของแจก** (label, quantity, used,
remaining, unit cost / vendor / unknown, cost) · **แบรนด์** · **สรุปคำตอบ** (field, option, count,
% and base) · **รายชั่วโมง** (date, hour, count) · **ผู้ลงทะเบียน** (existing raw columns + one column
per custom field by current label; checkbox joined with ", "; "อื่นๆ" rendered as `อื่นๆ: <text>`) ·
**เปรียบเทียบ** (only in compare mode).

Year report sheets: **สรุปปี** · **งาน** (event table) · **แบรนด์รวม** · **รายเดือน** ·
**ผู้ลงทะเบียน** (all events, with an event-name column).

Filename: sanitised event name / `ภาพรวมปี-<year>` + date (reuse `js/qrFilename.js` sanitiser idea).
The existing per-event export on the registrations page stays as is.

## Decided by the owner

- Dashboard lives in admin.html under the same login.
- Year overview → click into event detail (no single/year toggle).
- Comparison event picked manually via a button; nothing compared unless pressed.
- Hourly data with per-day view and year-over-year comparison.
- KPIs as listed, including cost per lead with optional per-prize price and vendor-sponsored flag.
- "อื่นๆ (โปรดระบุ)" available; dashboard shows only "อื่นๆ".
- Year grouping by event creation date; xlsx with separate sheets incl. registrants.

## Builder's calls (flag to owner if wrong)

- Custom answers keyed by field key from now on (existing fields already have stable `custom_<ts>`
  keys), legacy label-keyed rows still read; legacy rows whose field was renamed before this ships
  are not recovered (accepted).
- Prize costs in a separate admin-only table so the public game page never sees them.
- `prizes.used` drives given-out counts and cost; events grouped by creation year.
- Returning-visitor detection loads contact columns of all registrations client-side.
- Low-stock threshold ≤20%, min 1; mobile has no compare; field visibility saved in localStorage.
- Answers not matching a current option count as "อื่นๆ".
- No chart library — CSS bars + inline SVG.

## Left to the builder

Exact component markup/CSS, chart sizing, empty/loading states (reuse existing loading card and
toast patterns), module boundaries beyond `fieldAnswers.js` / `dashboardStats.js`.
