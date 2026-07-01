# Supabase Migration + Admin Export/Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Google Sheets/Apps Script data store with Supabase (Postgres), and add registration export-to-Excel, row/bulk delete, an event selector with realtime registrations, and multi-event URL support to `admin.html`.

**Architecture:** Static site (no build step, no bundler) calls Supabase directly from the browser via `@supabase/supabase-js` (CDN). Security is enforced with Postgres Row Level Security, not a server. Pure data-shaping logic (URL parsing, remaining-stock math, date filtering, export row shaping, session check, retry queue) is factored into small dual-environment (`window` global + `module.exports`) files under `js/` so it can be unit-tested with Node's built-in test runner (`node --test`) — no new dependency, no package.json needed.

**Tech Stack:** Vanilla JS (ES2020, no framework), Supabase (Postgres + Auth + Realtime), `@supabase/supabase-js@2` (CDN), SheetJS `xlsx` (CDN) for Excel export, Node 18+ built-in `node:test`/`node:assert` for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-01-supabase-migration-design.md` — read this first for full schema/RLS/RPC rationale. This plan implements it task by task.

## Global Constraints

- No emoji anywhere in new UI or code — use text labels or SVG/icon-font icons instead. (Existing emoji in untouched code, e.g. `wheelConfig.js` prize icons, are out of scope — do not touch them in this plan.)
- All new user-facing UI text is Thai (ภาษาไทย); code/comments/commit messages are English.
- No bundler, no `package.json`, no `type="module"` — every new browser file is a plain global script (`<script src="...">`), matching the existing `wheelConfig.js`/`script.js` style. Node-testable modules use the dual `if (typeof module !== 'undefined') module.exports = ...` guard so the same file works unchanged in the browser and under `node --test`.
- `Code.gs` and the existing Google Sheet are left untouched — not deleted, not modified, not migrated from.
- Multi-event resolution is URL-based: `index.html?event=<slug>` resolves a specific event; no `?event=` falls back to the row where `events.is_active = true`.
- The only way to mutate `prizes.used` is the `decrement_prize` Postgres RPC — never a direct `UPDATE` from the client.
- `registrations` is never `SELECT`-able by the `anon` role — only `authenticated` (logged-in admin) can read, update, or delete it.
- Commit messages: `git commit` steps assume a git repo exists. This directory currently has **no `.git`** — before running Task 1's commit step, run `git init` (ask the user first; it's additive and safe, but confirm since it wasn't explicitly requested).
- `admin.html` line numbers cited in later tasks (9, 10, 11) were measured against the file *before* Tasks 7–8 edit it. Earlier tasks insert code above those line ranges, so by the time you reach Task 9+ the actual line numbers will have shifted down. Locate the edit point by matching the literal code shown in each step (e.g. the `data-panel="form"` button, the `titles` object body) rather than trusting the exact line number.

---

## Task 1: Supabase Schema — Tables, RLS, RPC

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: tables `events(id, name, slug, config, is_active, created_at, updated_at)`, `prizes(id, event_id, label, quantity, used, remaining, updated_at)`, `registrations(id, event_id, first_name, last_name, email, phone, company, position, prize_label, prize_id, brands, pdpa_consent, custom_fields, created_at)`; RPC `decrement_prize(p_event_id uuid, p_prize_id text) returns int`. All later tasks query these exact table/column names.

- [ ] **Step 1: Write the full schema file**

Create `supabase/schema.sql`:

```sql
-- ============================================================
--  supabase/schema.sql — run once in Supabase SQL Editor
-- ============================================================

create table events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  config        jsonb not null,
  is_active     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index on events (slug);

create table prizes (
  id            text not null,
  event_id      uuid not null references events(id) on delete cascade,
  label         text not null,
  quantity      int not null,
  used          int not null default 0,
  remaining     int generated always as (quantity - used) stored,
  updated_at    timestamptz default now(),
  primary key (id, event_id)
);

create table registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  first_name    text,
  last_name     text,
  email         text,
  phone         text,
  company       text,
  position      text,
  prize_label   text,
  prize_id      text,
  brands        text,
  pdpa_consent  text,
  custom_fields jsonb,
  created_at    timestamptz default now()
);
create index on registrations (event_id);

create or replace function decrement_prize(p_event_id uuid, p_prize_id text)
returns int language plpgsql security definer as $$
declare v_remaining int;
begin
  update prizes set used = used + 1, updated_at = now()
  where id = p_prize_id and event_id = p_event_id and used < quantity
  returning quantity - used into v_remaining;
  return v_remaining;
end; $$;

alter table events        enable row level security;
alter table prizes        enable row level security;
alter table registrations enable row level security;

create policy "anon read events" on events for select to anon using (true);
create policy "auth full events" on events for all    to authenticated using (true) with check (true);

create policy "anon read prizes" on prizes for select to anon using (true);
create policy "auth full prizes" on prizes for all    to authenticated using (true) with check (true);

create policy "anon insert registrations" on registrations for insert to anon with check (true);
create policy "auth full registrations"   on registrations for all    to authenticated using (true) with check (true);
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Open the Supabase project's SQL Editor, paste the entire contents of `supabase/schema.sql`, click Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify tables and RLS**

In the SQL Editor, run:

```sql
select table_name, row_security from information_schema.tables
join pg_tables on pg_tables.tablename = information_schema.tables.table_name
where table_schema = 'public' and table_name in ('events','prizes','registrations');
```

Expected: 3 rows, `row_security` (rowsecurity) is `true` for all three.

- [ ] **Step 4: Verify RPC exists**

Run: `select proname from pg_proc where proname = 'decrement_prize';`
Expected: 1 row, `decrement_prize`.

- [ ] **Step 5: Commit**

```bash
git init
git add supabase/schema.sql
git commit -m "feat: add Supabase schema, RLS policies, decrement_prize RPC"
```

---

## Task 2: Supabase Client Wiring

**Files:**
- Create: `supabaseClient.js`
- Modify: `index.html` (add script tags before `wheelConfig.js`)
- Modify: `admin.html:595` (add script tags before existing `<script src="wheelConfig.js"></script>`)

**Interfaces:**
- Produces: global `supabase` (the `@supabase/supabase-js` client instance). Every later task that talks to Supabase uses this global — e.g. `supabase.from('events')...`, `supabase.rpc('decrement_prize', ...)`, `supabase.auth.getSession()`.

- [ ] **Step 1: Create the client file**

Create `supabaseClient.js`:

```js
// ============================================================
//  supabaseClient.js — single Supabase client, shared by all pages
// ============================================================

const SUPABASE_URL = "REPLACE_WITH_YOUR_PROJECT_URL";       // Settings → API → Project URL
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_ANON_KEY";     // Settings → API → anon public key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 2: Replace the placeholders**

Open the Supabase Dashboard → Settings → API. Copy "Project URL" into `SUPABASE_URL` and "anon public" key into `SUPABASE_ANON_KEY` in `supabaseClient.js`.

- [ ] **Step 3: Add CDN + client script tags to `index.html`**

Find the line in `index.html` that loads `wheelConfig.js` and add these two lines immediately before it:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js"></script>
```

- [ ] **Step 4: Add the same tags to `admin.html:595`**

In `admin.html`, replace line 595:

```html
<script src="wheelConfig.js"></script>
```

with:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js"></script>
<script src="wheelConfig.js"></script>
```

- [ ] **Step 5: Manual verification**

Open `admin.html` in a browser, open DevTools console, type `supabase` and press Enter.
Expected: logs a `SupabaseClient` object, no "supabase is not defined" error.

- [ ] **Step 6: Commit**

```bash
git add supabaseClient.js index.html admin.html
git commit -m "feat: wire up Supabase client via CDN"
```

---

## Task 3: URL & Link Helpers (pure, unit-tested)

**Files:**
- Create: `js/eventSlug.js`
- Create: `js/eventSlug.test.js`
- Create: `js/eventLink.js`
- Create: `js/eventLink.test.js`

**Interfaces:**
- Produces: `resolveEventSlug(search: string): string | null` — Task 5 uses this to read `?event=` from `location.search`.
- Produces: `buildEventUrl(origin: string, slug: string): string` — Task 8 (admin event selector "copy link" button) uses this.

- [ ] **Step 1: Write failing test for `resolveEventSlug`**

Create `js/eventSlug.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEventSlug } = require('./eventSlug.js');

test('returns slug when ?event= is present', () => {
  assert.equal(resolveEventSlug('?event=belden-roadshow-2026'), 'belden-roadshow-2026');
});

test('returns null when there is no event param', () => {
  assert.equal(resolveEventSlug('?foo=bar'), null);
});

test('returns null when event param is an empty string', () => {
  assert.equal(resolveEventSlug('?event='), null);
});

test('trims whitespace around the slug', () => {
  assert.equal(resolveEventSlug('?event=%20belden-roadshow-2026%20'), 'belden-roadshow-2026');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/eventSlug.test.js`
Expected: FAIL — `Cannot find module './eventSlug.js'`

- [ ] **Step 3: Implement `eventSlug.js`**

Create `js/eventSlug.js`:

```js
function resolveEventSlug(search) {
  const params = new URLSearchParams(search);
  const slug = params.get('event');
  return slug && slug.trim() !== '' ? slug.trim() : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveEventSlug };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/eventSlug.test.js`
Expected: PASS, 4 tests passed.

- [ ] **Step 5: Write failing test for `buildEventUrl`**

Create `js/eventLink.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventUrl } = require('./eventLink.js');

test('builds a URL with the event slug as a query param', () => {
  assert.equal(
    buildEventUrl('https://example.github.io', 'belden-roadshow-2026'),
    'https://example.github.io/index.html?event=belden-roadshow-2026'
  );
});

test('strips a trailing slash from origin before appending', () => {
  assert.equal(
    buildEventUrl('https://example.github.io/', 'belden-roadshow-2026'),
    'https://example.github.io/index.html?event=belden-roadshow-2026'
  );
});

test('URL-encodes special characters in the slug', () => {
  assert.equal(
    buildEventUrl('https://example.github.io', 'panduit fair 2026'),
    'https://example.github.io/index.html?event=panduit%20fair%202026'
  );
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test js/eventLink.test.js`
Expected: FAIL — `Cannot find module './eventLink.js'`

- [ ] **Step 7: Implement `eventLink.js`**

Create `js/eventLink.js`:

```js
function buildEventUrl(origin, slug) {
  return origin.replace(/\/$/, '') + '/index.html?event=' + encodeURIComponent(slug);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildEventUrl };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test js/eventLink.test.js`
Expected: PASS, 3 tests passed.

- [ ] **Step 9: Commit**

```bash
git add js/eventSlug.js js/eventSlug.test.js js/eventLink.js js/eventLink.test.js
git commit -m "feat: add event slug resolver and event link builder helpers"
```

---

## Task 4: Data Shaping Helpers (pure, unit-tested)

**Files:**
- Create: `js/remainingPrizes.js`
- Create: `js/remainingPrizes.test.js`
- Create: `js/dateRangeFilter.js`
- Create: `js/dateRangeFilter.test.js`
- Create: `js/exportRows.js`
- Create: `js/exportRows.test.js`
- Create: `js/sessionGuard.js`
- Create: `js/sessionGuard.test.js`
- Create: `js/retryQueue.js`
- Create: `js/retryQueue.test.js`

**Interfaces:**
- Produces: `computeRemainingMap(prizeRows: {id, quantity, used}[]): {[id]: number}` — Task 5 uses this to build `state.prizesRemaining`.
- Produces: `filterByDateRange(rows: {created_at}[], startISO: string|null, endISO: string|null): array` — Task 10 uses this for the registrations date filter.
- Produces: `buildExportRows(registrations: array, eventName: string): array<object>` — Task 11 feeds this straight into SheetJS.
- Produces: `hasValidSession(session): boolean` — Task 7's login gate uses this.
- Produces: `queueFailedRegistration(storage, payload)`, `readRetryQueue(storage): array`, `clearRetryQueue(storage)`, `RETRY_QUEUE_KEY` — Task 6 uses these with `window.localStorage` as `storage`.

- [ ] **Step 1: Write failing test for `computeRemainingMap`**

Create `js/remainingPrizes.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeRemainingMap } = require('./remainingPrizes.js');

test('computes remaining as quantity minus used', () => {
  const result = computeRemainingMap([{ id: 'notepad', quantity: 55, used: 10 }]);
  assert.deepEqual(result, { notepad: 45 });
});

test('defaults used to 0 when missing', () => {
  const result = computeRemainingMap([{ id: 'fan', quantity: 2 }]);
  assert.deepEqual(result, { fan: 2 });
});

test('clamps remaining at 0, never negative', () => {
  const result = computeRemainingMap([{ id: 'special', quantity: 1, used: 5 }]);
  assert.deepEqual(result, { special: 0 });
});

test('handles multiple rows', () => {
  const result = computeRemainingMap([
    { id: 'a', quantity: 10, used: 3 },
    { id: 'b', quantity: 5, used: 5 },
  ]);
  assert.deepEqual(result, { a: 7, b: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/remainingPrizes.test.js`
Expected: FAIL — `Cannot find module './remainingPrizes.js'`

- [ ] **Step 3: Implement `remainingPrizes.js`**

Create `js/remainingPrizes.js`:

```js
function computeRemainingMap(prizeRows) {
  const map = {};
  prizeRows.forEach(row => {
    const remaining = row.quantity - (row.used || 0);
    map[row.id] = Math.max(0, remaining);
  });
  return map;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeRemainingMap };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/remainingPrizes.test.js`
Expected: PASS, 4 tests passed.

- [ ] **Step 5: Write failing test for `filterByDateRange`**

Create `js/dateRangeFilter.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { filterByDateRange } = require('./dateRangeFilter.js');

const rows = [
  { id: 1, created_at: '2026-01-01T10:00:00Z' },
  { id: 2, created_at: '2026-01-15T10:00:00Z' },
  { id: 3, created_at: '2026-02-01T10:00:00Z' },
];

test('returns all rows when no bounds given', () => {
  assert.deepEqual(filterByDateRange(rows, null, null).map(r => r.id), [1, 2, 3]);
});

test('filters by start bound only', () => {
  assert.deepEqual(filterByDateRange(rows, '2026-01-10T00:00:00Z', null).map(r => r.id), [2, 3]);
});

test('filters by end bound only', () => {
  assert.deepEqual(filterByDateRange(rows, null, '2026-01-10T00:00:00Z').map(r => r.id), [1]);
});

test('filters by both bounds, inclusive', () => {
  assert.deepEqual(
    filterByDateRange(rows, '2026-01-01T10:00:00Z', '2026-01-15T10:00:00Z').map(r => r.id),
    [1, 2]
  );
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `node --test js/dateRangeFilter.test.js`
Expected: FAIL — `Cannot find module './dateRangeFilter.js'`

- [ ] **Step 7: Implement `dateRangeFilter.js`**

Create `js/dateRangeFilter.js`:

```js
function filterByDateRange(rows, startISO, endISO) {
  const start = startISO ? new Date(startISO).getTime() : -Infinity;
  const end   = endISO   ? new Date(endISO).getTime()   : Infinity;
  return rows.filter(r => {
    const t = new Date(r.created_at).getTime();
    return t >= start && t <= end;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterByDateRange };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test js/dateRangeFilter.test.js`
Expected: PASS, 4 tests passed.

- [ ] **Step 9: Write failing test for `buildExportRows`**

Create `js/exportRows.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildExportRows } = require('./exportRows.js');

test('maps a registration row to Thai-labeled export columns', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z',
    first_name: 'สมชาย', last_name: 'ใจดี', email: 'a@b.com', phone: '0812345678',
    company: 'Acme', position: 'Engineer', prize_label: 'โน๊ตก้อน',
    brands: 'Belden, Eaton', pdpa_consent: 'YES', custom_fields: null,
  }], 'Belden Roadshow 2026');

  assert.deepEqual(rows[0], {
    'Timestamp': '2026-01-01T10:00:00Z',
    'Event Name': 'Belden Roadshow 2026',
    'ชื่อ': 'สมชาย',
    'นามสกุล': 'ใจดี',
    'อีเมล': 'a@b.com',
    'เบอร์โทร': '0812345678',
    'บริษัท': 'Acme',
    'ตำแหน่ง': 'Engineer',
    'ของรางวัล': 'โน๊ตก้อน',
    'แบรนด์ที่สนใจ': 'Belden, Eaton',
    'PDPA Consent': 'YES',
  });
});

test('spreads custom_fields as extra columns keyed by their label', () => {
  const rows = buildExportRows([{
    created_at: '2026-01-01T10:00:00Z', first_name: '', last_name: '', email: '', phone: '',
    company: '', position: '', prize_label: '', brands: '', pdpa_consent: 'N/A',
    custom_fields: { 'แผนก': 'IT' },
  }], 'Test Event');

  assert.equal(rows[0]['แผนก'], 'IT');
});

test('handles missing/null fields as empty strings', () => {
  const rows = buildExportRows([{ created_at: '2026-01-01T10:00:00Z', custom_fields: null }], 'Test Event');
  assert.equal(rows[0]['ชื่อ'], '');
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `node --test js/exportRows.test.js`
Expected: FAIL — `Cannot find module './exportRows.js'`

- [ ] **Step 11: Implement `exportRows.js`**

Create `js/exportRows.js`:

```js
function buildExportRows(registrations, eventName) {
  return registrations.map(r => {
    const base = {
      'Timestamp': r.created_at,
      'Event Name': eventName,
      'ชื่อ': r.first_name || '',
      'นามสกุล': r.last_name || '',
      'อีเมล': r.email || '',
      'เบอร์โทร': r.phone || '',
      'บริษัท': r.company || '',
      'ตำแหน่ง': r.position || '',
      'ของรางวัล': r.prize_label || '',
      'แบรนด์ที่สนใจ': r.brands || '',
      'PDPA Consent': r.pdpa_consent || '',
    };
    if (r.custom_fields && typeof r.custom_fields === 'object') {
      Object.entries(r.custom_fields).forEach(([label, value]) => {
        base[label] = value;
      });
    }
    return base;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildExportRows };
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `node --test js/exportRows.test.js`
Expected: PASS, 3 tests passed.

- [ ] **Step 13: Write failing test for `hasValidSession`**

Create `js/sessionGuard.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { hasValidSession } = require('./sessionGuard.js');

test('returns false for null session', () => {
  assert.equal(hasValidSession(null), false);
});

test('returns false when session has no user', () => {
  assert.equal(hasValidSession({}), false);
});

test('returns true when session has a user with an id', () => {
  assert.equal(hasValidSession({ user: { id: 'abc-123' } }), true);
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `node --test js/sessionGuard.test.js`
Expected: FAIL — `Cannot find module './sessionGuard.js'`

- [ ] **Step 15: Implement `sessionGuard.js`**

Create `js/sessionGuard.js`:

```js
function hasValidSession(session) {
  return !!(session && session.user && session.user.id);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { hasValidSession };
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `node --test js/sessionGuard.test.js`
Expected: PASS, 3 tests passed.

- [ ] **Step 17: Write failing test for the retry queue**

Create `js/retryQueue.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { queueFailedRegistration, readRetryQueue, clearRetryQueue, RETRY_QUEUE_KEY } = require('./retryQueue.js');

function makeFakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('reading an empty queue returns []', () => {
  const storage = makeFakeStorage();
  assert.deepEqual(readRetryQueue(storage), []);
});

test('queueing a payload makes it show up in readRetryQueue', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'Test' });
  assert.deepEqual(readRetryQueue(storage), [{ firstName: 'Test' }]);
});

test('queueing appends, does not overwrite', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'A' });
  queueFailedRegistration(storage, { firstName: 'B' });
  assert.deepEqual(readRetryQueue(storage), [{ firstName: 'A' }, { firstName: 'B' }]);
});

test('clearRetryQueue empties the queue', () => {
  const storage = makeFakeStorage();
  queueFailedRegistration(storage, { firstName: 'A' });
  clearRetryQueue(storage);
  assert.deepEqual(readRetryQueue(storage), []);
});

test('RETRY_QUEUE_KEY is a stable, non-empty string', () => {
  assert.equal(typeof RETRY_QUEUE_KEY, 'string');
  assert.ok(RETRY_QUEUE_KEY.length > 0);
});
```

- [ ] **Step 18: Run test to verify it fails**

Run: `node --test js/retryQueue.test.js`
Expected: FAIL — `Cannot find module './retryQueue.js'`

- [ ] **Step 19: Implement `retryQueue.js`**

Create `js/retryQueue.js`:

```js
const RETRY_QUEUE_KEY = 'pendingRegistrations';

function queueFailedRegistration(storage, payload) {
  const list = readRetryQueue(storage);
  list.push(payload);
  storage.setItem(RETRY_QUEUE_KEY, JSON.stringify(list));
}

function readRetryQueue(storage) {
  const raw = storage.getItem(RETRY_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function clearRetryQueue(storage) {
  storage.removeItem(RETRY_QUEUE_KEY);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { queueFailedRegistration, readRetryQueue, clearRetryQueue, RETRY_QUEUE_KEY };
}
```

- [ ] **Step 20: Run test to verify it passes**

Run: `node --test js/retryQueue.test.js`
Expected: PASS, 5 tests passed.

- [ ] **Step 21: Run all helper tests together**

Run: `node --test js/`
Expected: all 5 test files pass (19 tests total).

- [ ] **Step 22: Commit**

```bash
git add js/remainingPrizes.js js/remainingPrizes.test.js js/dateRangeFilter.js js/dateRangeFilter.test.js js/exportRows.js js/exportRows.test.js js/sessionGuard.js js/sessionGuard.test.js js/retryQueue.js js/retryQueue.test.js
git commit -m "feat: add remaining-stock, date-filter, export-row, session, and retry-queue helpers"
```

---

## Task 5: `wheelConfig.js` — Load Config/Prizes from Supabase

**Files:**
- Modify: `wheelConfig.js:62-158` (replace `loadConfigFromServer`, `saveConfigToServer`, `getRemainingPrizes`, `updatePrizeCount`)
- Modify: `index.html` (add script tags for `js/eventSlug.js` and `js/remainingPrizes.js` before `wheelConfig.js`)

**Interfaces:**
- Consumes: `resolveEventSlug(search)` from `js/eventSlug.js` (Task 3); `computeRemainingMap(prizeRows)` from `js/remainingPrizes.js` (Task 4); global `supabase` from `supabaseClient.js` (Task 2).
- Produces: `async function loadConfigFromServer(): {config, eventName, __eventId} | null` (URL-slug/is_active resolution — public `index.html` only). `async function loadEventConfigById(eventId): {config, eventName, __eventId} | null` (explicit event id — Task 8's admin event selector uses this, since admin needs to load whichever event is picked in the dropdown, not the URL/is_active one). `async function getRemainingPrizes(): {[prizeId]: number} | null` (uses the module-level `CURRENT_EVENT_ID`, set by either loader above). `async function saveConfigToServer(eventId, config): boolean`. `async function decrementPrizeRpc(prizeId): number | null` (uses `CURRENT_EVENT_ID`).

- [ ] **Step 1: Add script tags to `index.html`**

Before the line `<script src="wheelConfig.js"></script>` in `index.html`, add:

```html
<script src="js/eventSlug.js"></script>
<script src="js/remainingPrizes.js"></script>
```

- [ ] **Step 2: Replace the API section of `wheelConfig.js`**

In `wheelConfig.js`, delete everything from line 62 (`// ===... Real-time Sync API`) to the end of the file (line 158), and replace with:

```js
// ============================================================
//  Real-time Sync API — Supabase
// ============================================================

let CURRENT_EVENT_ID = null;

// โหลด Config จาก Supabase (ตาม ?event=<slug> ใน URL, fallback เป็น event ที่ is_active)
async function loadConfigFromServer() {
  const slug = resolveEventSlug(location.search);

  const query = slug
    ? supabase.from('events').select('*').eq('slug', slug).single()
    : supabase.from('events').select('*').eq('is_active', true).single();

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error loading event config:', error);
    return null;
  }

  CURRENT_EVENT_ID = data.id;
  return { ...data.config, eventName: data.name, __eventId: data.id };
}

// โหลด Config ของ event ที่ระบุ id ตรงๆ (ใช้โดยหน้า admin — event ที่เลือกใน dropdown อาจไม่ใช่ event ที่ is_active)
async function loadEventConfigById(eventId) {
  const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
  if (error || !data) {
    console.error('Error loading event by id:', error);
    return null;
  }

  CURRENT_EVENT_ID = data.id;
  return { ...data.config, eventName: data.name, __eventId: data.id };
}

// บันทึก Config กลับไปยัง Supabase (ต้อง login เป็น authenticated)
async function saveConfigToServer(eventId, config) {
  const { error } = await supabase.from('events').update({ config }).eq('id', eventId);
  if (error) {
    console.error('Error saving config:', error);
    return false;
  }
  return true;
}

// ดึงจำนวนของรางวัลคงเหลือแบบ real-time
async function getRemainingPrizes() {
  if (!CURRENT_EVENT_ID) return null;

  const { data, error } = await supabase
    .from('prizes')
    .select('id, quantity, used')
    .eq('event_id', CURRENT_EVENT_ID);

  if (error || !data) {
    console.error('Error getting remaining prizes:', error);
    return null;
  }

  return computeRemainingMap(data);
}

// ลดสต็อกของรางวัลแบบ atomic ผ่าน RPC (คืนค่า remaining ใหม่ หรือ null ถ้าของหมดพอดี)
async function decrementPrizeRpc(prizeId) {
  if (!CURRENT_EVENT_ID) return null;

  const { data, error } = await supabase.rpc('decrement_prize', {
    p_event_id: CURRENT_EVENT_ID,
    p_prize_id: prizeId,
  });

  if (error) {
    console.error('Error decrementing prize:', error);
    return null;
  }

  return data;
}
```

- [ ] **Step 3: Manual verification — config loads**

In Supabase SQL Editor, insert a test event so there's something to load:

```sql
insert into events (name, slug, config, is_active) values (
  'Test Event', 'test-event',
  '{"prizes":[{"id":"notepad","label":"โน๊ตก้อน","weight":50,"quantity":5,"color":"#f9c74f","textColor":"#1a1a2e","icon":"N"}],"formFields":[],"brandsCheckbox":{"enabled":false},"pdpa":{"enabled":false},"wheel":{"fontSize":13,"fontFamily":"sans-serif","centerCircleColor":"#162c3b","centerCircleBorderColor":"#ffd700","textRadiusRatio":0.8,"iconGap":28},"spin":{"minRotations":5,"maxRotations":10,"durationMs":5000}}'::jsonb,
  true
);
insert into prizes (id, event_id, label, quantity) select 'notepad', id, 'โน๊ตก้อน', 5 from events where slug = 'test-event';
```

Open `index.html?event=test-event` in a browser, DevTools console.
Expected: no errors; `WHEEL_CONFIG.prizes` in console shows the "notepad" prize; wheel renders 1 segment.

- [ ] **Step 4: Commit**

```bash
git add wheelConfig.js index.html
git commit -m "feat: load config, remaining stock, and prize decrement from Supabase"
```

---

## Task 6: `script.js` — Registration Insert, Retry Queue, Respin-on-Race

**Files:**
- Modify: `script.js:382-407` (replace `sendToGoogleSheets`)
- Modify: `script.js:526-571` (`handleSpin` — resync remaining before spin, handle RPC null)
- Modify: `script.js:44-66` (`init` — drain retry queue on load)
- Modify: `index.html` (add script tag for `js/retryQueue.js` before `script.js`)

**Interfaces:**
- Consumes: `queueFailedRegistration`, `readRetryQueue`, `clearRetryQueue` from `js/retryQueue.js` (Task 4); `getRemainingPrizes()`, `decrementPrizeRpc(prizeId)` from `wheelConfig.js` (Task 5); global `supabase`, `CURRENT_EVENT_ID` from `wheelConfig.js`.

- [ ] **Step 1: Add script tag to `index.html`**

Before `<script src="script.js"></script>` in `index.html`, add:

```html
<script src="js/retryQueue.js"></script>
```

- [ ] **Step 2: Replace `sendToGoogleSheets` in `script.js:382-407`**

Replace the block from `async function sendToGoogleSheets(payload) {` through its closing `}` (script.js:385-407) with:

```js
async function insertRegistration(payload) {
  const row = {
    event_id: CURRENT_EVENT_ID,
    first_name: payload.firstName || '',
    last_name: payload.lastName || '',
    email: payload.email || '',
    phone: payload.phone || '',
    company: payload.company || '',
    position: payload.position || '',
    prize_label: payload.prize || '',
    prize_id: payload.prizeId || '',
    brands: payload.brands || '',
    pdpa_consent: payload.pdpaConsent === 'true' ? 'YES' : payload.pdpaConsent === 'false' ? 'NO' : 'N/A',
    custom_fields: payload.customFields ? JSON.parse(payload.customFields) : null,
  };

  const { error } = await supabase.from('registrations').insert(row);
  if (error) {
    console.error('Insert failed, queueing for retry:', error);
    queueFailedRegistration(window.localStorage, row);
    return false;
  }
  return true;
}

async function drainRetryQueue() {
  const pending = readRetryQueue(window.localStorage);
  if (pending.length === 0) return;

  const stillFailing = [];
  for (const row of pending) {
    const { error } = await supabase.from('registrations').insert(row);
    if (error) stillFailing.push(row);
  }

  if (stillFailing.length === 0) {
    clearRetryQueue(window.localStorage);
  } else {
    window.localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(stillFailing));
  }
}
```

- [ ] **Step 3: Drain the retry queue on init — `script.js:44-51`**

In the `init()` function, after the line `await loadConfig();` (script.js:51), add:

```js
    drainRetryQueue().catch(console.error);
```

- [ ] **Step 4: Resync remaining + handle RPC-null in `handleSpin` — `script.js:526-571`**

Replace the full `handleSpin` function (script.js:526-571) with:

```js
  async function handleSpin() {
    if (state.isSpinning) return;

    dom.spinBtn.disabled = true;

    // Sync ล่าสุดจาก Supabase ก่อนคำนวณวงล้อ ลดโอกาสชนกับคนอื่นให้เหลือน้อยที่สุด
    const freshRemaining = await getRemainingPrizes();
    if (freshRemaining) {
      WHEEL_CONFIG.prizes.forEach(p => {
        if (freshRemaining[p.id] !== undefined) state.prizesRemaining[p.id] = freshRemaining[p.id];
      });
      drawWheel(state.currentAngle);
    }

    const active = getActiveSegments();
    if (active.length === 0) {
      showToast('ของรางวัลหมดแล้ว!', 'error');
      dom.spinBtn.disabled = false;
      return;
    }

    const prize = pickPrize();
    state.wonPrize = prize;
    state.isSpinning = true;
    dom.canvas.classList.add('spinning');

    const segments = getActiveSegments();
    const segCount = segments.length;
    const prizeIndex = segments.findIndex(s => s.id === prize.id);
    const arc = (2 * Math.PI) / segCount;

    const cfg = WHEEL_CONFIG.spin;
    const rotations = cfg.minRotations + Math.floor(Math.random() * (cfg.maxRotations - cfg.minRotations + 1));
    const baseTarget = -Math.PI / 2 - (prizeIndex * arc) - (arc / 2);
    const currentNorm = ((state.currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const targetNorm  = ((baseTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const diff = ((targetNorm - currentNorm) + 2 * Math.PI) % (2 * Math.PI);
    const targetAngle = state.currentAngle + diff + (2 * Math.PI * rotations);

    spinAnimate(state.currentAngle, targetAngle, cfg.durationMs, async () => {
      state.currentAngle = targetAngle;
      state.isSpinning = false;
      dom.canvas.classList.remove('spinning');

      const newRemaining = await decrementPrizeRpc(prize.id);

      if (newRemaining === null) {
        // ของหมดพอดีตอนกำลังหมุน — บังคับหมุนใหม่ ห้ามสุ่มของอื่นแทน (วงล้อโชว์ผลไปแล้ว)
        showToast('ของชิ้นนี้เพิ่งหมดพอดี กรุณาหมุนใหม่', 'error');
        state.prizesRemaining[prize.id] = 0;
        drawWheel(state.currentAngle);
        dom.spinBtn.disabled = false;
        return;
      }

      state.prizesRemaining[prize.id] = newRemaining;

      insertRegistration({
        ...state.userData,
        prize: prize.label,
        prizeId: prize.id,
      }).catch(console.error);

      showResult(prize);
      dom.spinBtn.disabled = false;
    });
  }
```

- [ ] **Step 5: Manual verification — happy path**

Using the `test-event` from Task 5 Step 3, open `index.html?event=test-event`, fill the form, spin the wheel.
Expected: result page shows a prize; in Supabase Table Editor, `registrations` has a new row with `event_id` matching the test event, and `prizes.used` for `notepad` incremented by 1.

- [ ] **Step 6: Manual verification — out-of-stock respin**

In Supabase Table Editor, set `prizes.used = quantity` for the `notepad` row (make it 0 remaining). Reload `index.html?event=test-event` and spin.
Expected: toast "ของรางวัลหมดแล้ว!" (no active segments) OR, if you instead set `used = quantity - 1` and open two tabs and spin both near-simultaneously, one tab shows the result, the other shows "ของชิ้นนี้เพิ่งหมดพอดี กรุณาหมุนใหม่" and no duplicate registration row is created for the failed one.

- [ ] **Step 7: Commit**

```bash
git add script.js index.html
git commit -m "feat: insert registrations via Supabase with retry queue and atomic decrement"
```

---

## Task 7: Admin Login Gate

**Files:**
- Create: `js/sessionGuard.js` (already created in Task 4 — reused here)
- Modify: `admin.html:362-368` (add login overlay markup)
- Modify: `admin.html:595` (add `js/sessionGuard.js` script tag)
- Modify: `admin.html:638-642` (`init()` — gate on session before running existing init logic)

**Interfaces:**
- Consumes: `hasValidSession(session)` from `js/sessionGuard.js` (Task 4); global `supabase`.
- Produces: `async function requireAuth(): boolean` — Tasks 8–11 assume `init()` has already gated on this before their setup code runs.

- [ ] **Step 1: Add script tag — `admin.html:595`**

Add `<script src="js/sessionGuard.js"></script>` on its own line immediately after the `<script src="supabaseClient.js"></script>` line added in Task 2.

- [ ] **Step 2: Add login overlay markup — `admin.html:366`**

Immediately after the closing `</div>` of `<div class="loading-overlay" id="loading">...</div>` (admin.html:364-366), add:

```html
<div class="login-gate" id="login-gate" style="display:none;">
  <form id="login-form" class="login-card">
    <h2>เข้าสู่ระบบ Admin</h2>
    <div class="form-group"><label>อีเมล</label><input type="email" id="login-email" required autocomplete="username" /></div>
    <div class="form-group"><label>รหัสผ่าน</label><input type="password" id="login-password" required autocomplete="current-password" /></div>
    <div class="field-error" id="login-error"></div>
    <button type="submit" class="btn btn-primary" style="width:100%;">เข้าสู่ระบบ</button>
  </form>
</div>
```

- [ ] **Step 3: Add minimal CSS for the login gate**

In the `<style>` block, right before the closing `</style>` (admin.html:360), add:

```css
.login-gate {
  position: fixed; inset: 0; z-index: 200;
  background: var(--bg); display: flex; align-items: center; justify-content: center;
}
.login-card {
  width: 320px; padding: 28px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
  display: flex; flex-direction: column; gap: 14px;
}
.login-card h2 { font-size: 18px; margin-bottom: 4px; }
```

- [ ] **Step 4: Wrap the existing app markup so it can be hidden**

Add `id="app-layout"` to the existing `<div class="layout">` opening tag (admin.html:368):

```html
<div class="layout" id="app-layout" style="display:none;">
```

- [ ] **Step 5: Add the auth gate logic and rewrite `init()` — `admin.html:638-642`**

Replace the existing `init()` function (admin.html:638-642):

```js
async function init() {
  setupNav();
  await loadFromServer();
  startAutoRefresh();
}
```

with:

```js
async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!hasValidSession(session)) {
    document.getElementById('login-gate').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    return false;
  }

  document.getElementById('login-gate').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';
  return true;
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    return;
  }

  const ok = await requireAuth();
  if (ok) await init();
});

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    document.getElementById('login-gate').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
  }
});

async function init() {
  const authed = await requireAuth();
  if (!authed) return;

  setupNav();
  await loadFromServer();
  startAutoRefresh();
}
```

- [ ] **Step 6: Disable public sign-up in Supabase Dashboard**

Supabase Dashboard → Authentication → Providers (or Authentication → Settings, depending on dashboard version) → turn OFF "Allow new users to sign up". This must happen before creating the test admin user below — otherwise anyone who finds the anon key could sign themselves up as an authenticated user and pass the login gate.

- [ ] **Step 7: Manual verification — logged out**

Open `admin.html` in a private/incognito window (no prior Supabase session).
Expected: login form shown, sidebar/content hidden.

- [ ] **Step 8: Manual verification — logged in**

In Supabase Dashboard → Authentication → Users, create a test admin user (email + password). Use those credentials in the login form.
Expected: form submits, login gate hides, sidebar/content appears, existing prize panel loads as before.

- [ ] **Step 9: Commit**

```bash
git add admin.html
git commit -m "feat: gate admin.html behind Supabase Auth login"
```

---

## Task 8: Event Selector + Create Event

**Files:**
- Modify: `admin.html:397-412` (topbar — add event selector dropdown)
- Modify: `admin.html:638-` (`init()`/new functions — load event list, create event, set active, copy link)

**Interfaces:**
- Consumes: `buildEventUrl(origin, slug)` from `js/eventLink.js` (Task 3); `loadEventConfigById(eventId)`, `saveConfigToServer(eventId, config)` from `wheelConfig.js` (Task 5); global `supabase`; `requireAuth()` from Task 7.
- Produces: global `state.currentEventId` (the event being viewed/edited in admin) — Tasks 9–11 filter all registrations queries by this value. `async function loadEventList()`, `async function selectEvent(eventId)`, `async function createEvent(name, slug)`, `async function setActiveEvent(eventId)`.

**Important — this task also fixes an interface mismatch from Task 5:** the existing `loadFromServer()` (admin.html:674) and `saveToServer()` (admin.html:759) call the shared `wheelConfig.js` functions with their *old* (pre-Supabase) signatures. Steps 6–7 below update those two call sites so the admin panel actually reads/writes whichever event is selected in the dropdown, instead of silently always operating on the `is_active` event regardless of the dropdown.

- [ ] **Step 1: Add script tag — `admin.html:595`**

Add `<script src="js/eventLink.js"></script>` after the `js/sessionGuard.js` tag from Task 7.

- [ ] **Step 2: Add the event selector markup — `admin.html:397-404`**

Replace the `<div class="topbar-left">...</div>` block (admin.html:398-403) with:

```html
<div class="topbar-left">
  <div class="form-group" style="min-width:220px;">
    <label style="font-size:11px;">Event</label>
    <select id="event-select" style="width:100%;"></select>
  </div>
  <button class="btn btn-outline btn-sm" onclick="openCreateEventPrompt()">+ Event ใหม่</button>
  <button class="btn btn-outline btn-sm" onclick="setActiveEvent(state.currentEventId)">ตั้งเป็น Event ปัจจุบัน</button>
  <button class="btn btn-outline btn-sm" onclick="copyEventLink()">คัดลอกลิงก์</button>
  <div>
    <div class="topbar-title" id="panel-title">ของรางวัล</div>
    <div class="topbar-sub" id="panel-sub">จัดการของรางวัล + ดูจำนวนคงเหลือแบบ real-time</div>
  </div>
</div>
```

- [ ] **Step 3: Add `currentEventId` to `state` — `admin.html:602-619`**

In the `state` object literal (admin.html:602), add a new key after `prizes: [],`:

```js
  currentEventId: null,
```

- [ ] **Step 4: Add event list/create/select/link functions**

Add this block right before the existing `async function init() {` (admin.html):

```js
async function loadEventList() {
  const { data, error } = await supabase.from('events').select('id, name, slug, is_active').order('created_at', { ascending: false });
  if (error) { console.error('Error loading events:', error); return; }

  const select = document.getElementById('event-select');
  select.innerHTML = data.map(ev =>
    `<option value="${ev.id}" data-slug="${ev.slug}">${ev.name}${ev.is_active ? ' (ปัจจุบัน)' : ''}</option>`
  ).join('');

  if (!state.currentEventId && data.length > 0) {
    state.currentEventId = data[0].id;
  }
  if (state.currentEventId) select.value = state.currentEventId;
}

async function selectEvent(eventId) {
  state.currentEventId = eventId;
  await loadFromServer();
  if (typeof loadRegistrations === 'function') await loadRegistrations();
}

async function openCreateEventPrompt() {
  const name = prompt('ชื่อ Event ใหม่:');
  if (!name) return;
  const slug = prompt('Slug (ใช้ใน URL เช่น belden-roadshow-2026):', name.toLowerCase().replace(/\s+/g, '-'));
  if (!slug) return;
  await createEvent(name, slug);
}

async function createEvent(name, slug) {
  const defaultConfig = {
    prizes: [], formFields: getDefaultFormFields(),
    brandsCheckbox: { enabled: false, items: [] }, pdpa: { enabled: false },
    wheel: { fontSize: 13, fontFamily: "'Kanit', sans-serif", centerCircleColor: '#162c3b', centerCircleBorderColor: '#ffd700', textRadiusRatio: 0.8, iconGap: 28 },
    spin: { minRotations: 5, maxRotations: 10, durationMs: 5000 },
  };

  const { data, error } = await supabase.from('events').insert({ name, slug, config: defaultConfig }).select().single();
  if (error) { toast('สร้าง Event ไม่สำเร็จ: ' + error.message, 'err'); return; }

  await loadEventList();
  await selectEvent(data.id);
  toast('สร้าง Event สำเร็จ', 'ok');
}

async function setActiveEvent(eventId) {
  if (!eventId) return;
  await supabase.from('events').update({ is_active: false }).neq('id', eventId);
  const { error } = await supabase.from('events').update({ is_active: true }).eq('id', eventId);
  if (error) { toast('ตั้ง Event ปัจจุบันไม่สำเร็จ: ' + error.message, 'err'); return; }
  await loadEventList();
  toast('ตั้งเป็น Event ปัจจุบันแล้ว', 'ok');
}

function copyEventLink() {
  const select = document.getElementById('event-select');
  const slug = select.selectedOptions[0]?.dataset.slug;
  if (!slug) return;
  const url = buildEventUrl(location.origin, slug);
  navigator.clipboard.writeText(url);
  toast('คัดลอกลิงก์แล้ว: ' + url, 'ok');
}
```

- [ ] **Step 5: Wire the dropdown's change event and load the list on init**

In `init()` (the version from Task 7 Step 5), replace:

```js
  setupNav();
  await loadFromServer();
  startAutoRefresh();
```

with:

```js
  setupNav();
  await loadEventList();
  document.getElementById('event-select').addEventListener('change', (e) => selectEvent(e.target.value));
  await loadFromServer();
  startAutoRefresh();
```

- [ ] **Step 6: Rewire `loadFromServer()` to load the selected event — `admin.html:674-682`**

Replace the line (admin.html:680):

```js
    const config = await loadConfigFromServer();
```

with:

```js
    if (!state.currentEventId) { showLoading(false); return; }
    const config = await loadEventConfigById(state.currentEventId);
```

- [ ] **Step 7: Rewire `saveToServer()` to save to the selected event — `admin.html:791`**

Replace line 791:

```js
    const success = await saveConfigToServer(config);
```

with:

```js
    const success = await saveConfigToServer(state.currentEventId, config);
```

- [ ] **Step 8: Manual verification — create + switch events**

Log in to `admin.html`. Click "+ Event ใหม่", enter a name and slug. Confirm the new event appears selected in the dropdown, and the prizes panel is empty (fresh config).
Click "ตั้งเป็น Event ปัจจุบัน", reload the page — the dropdown option should show "(ปัจจุบัน)" next to that event's name.
Click "คัดลอกลิงก์", paste into a new browser tab — `index.html?event=<that-slug>` should load (prizes list empty until you add some via the admin panel).

- [ ] **Step 9: Manual verification — switching events actually changes what's shown**

With two events created (e.g. `test-event` and a second one from Step 8), select `test-event` in the dropdown, confirm its prizes show. Switch to the second event in the dropdown.
Expected: the prizes panel updates to show the second event's (empty) config, not `test-event`'s — confirming `state.currentEventId` actually drives what loads, not just the URL/`is_active` fallback.

- [ ] **Step 10: Commit**

```bash
git add admin.html
git commit -m "feat: add event selector, create-event flow, set-active, and copy-link"
```

---

## Task 9: Registrations Tab — Table + Realtime

**Files:**
- Modify: `admin.html:376-386` (sidebar nav — add "รายชื่อผู้ลงทะเบียน" nav item)
- Modify: `admin.html:414-434` (add new `#panel-registrations` panel div after the connection alert)
- Modify: `admin.html:644-669` (`setupNav()` — add panel title/sub entry + render call)

**Interfaces:**
- Consumes: global `supabase`; `state.currentEventId` from Task 8.
- Produces: `state.registrations: array` (in-memory full list for the current event), `async function loadRegistrations()`, `function renderRegistrationsTable(rows)` — Task 10 and 11 read `state.registrations` and call `renderRegistrationsTable` after filtering/deleting.

- [ ] **Step 1: Add the nav item — `admin.html:383-385`**

Immediately after the `form` nav-item button (admin.html:383-385), add:

```html
      <button class="nav-item" data-panel="registrations">
        <span class="icon">R</span><span>รายชื่อผู้ลงทะเบียน</span>
      </button>
```

- [ ] **Step 2: Add the panel markup — after `admin.html:419`**

Immediately after the connection-alert `</div>` (admin.html:419), add:

```html
<!-- ── REGISTRATIONS ── -->
<div id="panel-registrations" class="panel">
  <div class="total-strip">
    <div><div class="total-lbl">จำนวนผู้ลงทะเบียนทั้งหมด</div><div class="total-val" id="reg-total">0</div></div>
  </div>
  <div style="overflow-x:auto;margin-top:14px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--border);">
          <th style="padding:8px;">เวลา</th>
          <th style="padding:8px;">ชื่อ</th>
          <th style="padding:8px;">นามสกุล</th>
          <th style="padding:8px;">อีเมล</th>
          <th style="padding:8px;">เบอร์โทร</th>
          <th style="padding:8px;">ของรางวัล</th>
        </tr>
      </thead>
      <tbody id="reg-table-body"></tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 3: Add title/sub entry to `setupNav()` — `admin.html:653-661`**

In the `titles` object inside `setupNav()` (admin.html:653-657), add a new entry after `form:`:

```js
        registrations: { title: 'รายชื่อผู้ลงทะเบียน', sub: 'ดูแบบ real-time, filter, export, ลบ' },
```

And after the line `if (pid === 'form') renderFormPanel();` (admin.html:659), add:

```js
      if (pid === 'registrations') loadRegistrations();
```

- [ ] **Step 4: Add `state.registrations` and the load/render/realtime functions**

Add `registrations: [],` to the `state` object (admin.html:602, next to `currentEventId: null,` from Task 8).

Add this block after the `createEvent`/`setActiveEvent`/`copyEventLink` functions from Task 8:

```js
let registrationsChannel = null;

async function loadRegistrations() {
  if (!state.currentEventId) return;

  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('event_id', state.currentEventId)
    .order('created_at', { ascending: false });

  if (error) { toast('โหลดรายชื่อไม่สำเร็จ: ' + error.message, 'err'); return; }

  state.registrations = data;
  renderRegistrationsTable(state.registrations);
  subscribeRegistrations();
}

function renderRegistrationsTable(rows) {
  document.getElementById('reg-total').textContent = rows.length;
  document.getElementById('reg-table-body').innerHTML = rows.map(r => `
    <tr style="border-bottom:1px solid var(--border);" data-id="${r.id}">
      <td style="padding:8px;">${esc(new Date(r.created_at).toLocaleString('th-TH'))}</td>
      <td style="padding:8px;">${esc(r.first_name)}</td>
      <td style="padding:8px;">${esc(r.last_name)}</td>
      <td style="padding:8px;">${esc(r.email)}</td>
      <td style="padding:8px;">${esc(r.phone)}</td>
      <td style="padding:8px;">${esc(r.prize_label)}</td>
    </tr>
  `).join('');
}

function subscribeRegistrations() {
  if (registrationsChannel) supabase.removeChannel(registrationsChannel);

  registrationsChannel = supabase
    .channel('registrations-live-' + state.currentEventId)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registrations', filter: `event_id=eq.${state.currentEventId}` },
        (payload) => {
          state.registrations = [payload.new, ...state.registrations];
          renderRegistrationsTable(state.registrations);
        }
    )
    .subscribe();
}
```

- [ ] **Step 5: Enable Realtime replication in Supabase Dashboard**

Supabase Dashboard → Database → Replication → enable replication for the `registrations` table.

- [ ] **Step 6: Manual verification — table + realtime**

Log in to `admin.html`, select the `test-event` from Task 5, click "รายชื่อผู้ลงทะเบียน" in the sidebar.
Expected: shows the registration row(s) created in Task 6's manual tests.

Open a second browser tab with `index.html?event=test-event`, register and spin.
Expected: the new row appears at the top of the admin table within a few seconds, without reloading the admin page.

- [ ] **Step 7: Commit**

```bash
git add admin.html
git commit -m "feat: add realtime registrations table to admin panel"
```

---

## Task 10: Registrations Tab — Date Filter + Row/Bulk Delete

**Files:**
- Modify: `admin.html` (registrations panel markup — add filter inputs, checkboxes, delete buttons)
- Modify: `admin.html:595` (add `js/dateRangeFilter.js` script tag)

**Interfaces:**
- Consumes: `filterByDateRange(rows, startISO, endISO)` from `js/dateRangeFilter.js` (Task 4); `state.registrations`, `renderRegistrationsTable` from Task 9.
- Produces: `function applyRegFilter()`, `async function deleteRegistration(id)`, `async function deleteSelectedRegistrations()` — reused as-is by Task 11 (export respects the same filtered set).

- [ ] **Step 1: Add script tag — `admin.html:595`**

Add `<script src="js/dateRangeFilter.js"></script>` after the `js/eventLink.js` tag from Task 8.

- [ ] **Step 2: Add filter/bulk-action controls to the registrations panel**

In the `#panel-registrations` div added in Task 9 Step 2, replace the `total-strip` block with:

```html
  <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px;">
    <div class="form-group"><label>ตั้งแต่วันที่</label><input type="date" id="reg-filter-start" /></div>
    <div class="form-group"><label>ถึงวันที่</label><input type="date" id="reg-filter-end" /></div>
    <button class="btn btn-outline btn-sm" onclick="applyRegFilter()">กรอง</button>
    <button class="btn btn-outline btn-sm" onclick="clearRegFilter()">ล้างตัวกรอง</button>
    <button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="deleteSelectedRegistrations()">ลบที่เลือก</button>
  </div>
  <div class="total-strip">
    <div><div class="total-lbl">จำนวนผู้ลงทะเบียน (ตามตัวกรอง)</div><div class="total-val" id="reg-total">0</div></div>
  </div>
```

- [ ] **Step 3: Add a select-all checkbox column and per-row checkbox + delete button to the table**

Replace the `<thead>...</thead>` in the registrations table with:

```html
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--border);">
          <th style="padding:8px;"><input type="checkbox" id="reg-select-all" onclick="toggleSelectAll(this.checked)" /></th>
          <th style="padding:8px;">เวลา</th>
          <th style="padding:8px;">ชื่อ</th>
          <th style="padding:8px;">นามสกุล</th>
          <th style="padding:8px;">อีเมล</th>
          <th style="padding:8px;">เบอร์โทร</th>
          <th style="padding:8px;">ของรางวัล</th>
          <th style="padding:8px;"></th>
        </tr>
      </thead>
```

- [ ] **Step 4: Replace `renderRegistrationsTable` and add filter/delete functions**

Replace the `renderRegistrationsTable` function body (from Task 9 Step 4) with:

```js
let regFilteredRows = [];

function renderRegistrationsTable(rows) {
  regFilteredRows = rows;
  document.getElementById('reg-total').textContent = rows.length;
  document.getElementById('reg-table-body').innerHTML = rows.map(r => `
    <tr style="border-bottom:1px solid var(--border);" data-id="${r.id}">
      <td style="padding:8px;"><input type="checkbox" class="reg-row-check" value="${r.id}" /></td>
      <td style="padding:8px;">${esc(new Date(r.created_at).toLocaleString('th-TH'))}</td>
      <td style="padding:8px;">${esc(r.first_name)}</td>
      <td style="padding:8px;">${esc(r.last_name)}</td>
      <td style="padding:8px;">${esc(r.email)}</td>
      <td style="padding:8px;">${esc(r.phone)}</td>
      <td style="padding:8px;">${esc(r.prize_label)}</td>
      <td style="padding:8px;"><button class="btn btn-outline btn-sm" style="color:var(--danger);border-color:var(--danger);" onclick="deleteRegistration('${r.id}')">ลบ</button></td>
    </tr>
  `).join('');
}

function toggleSelectAll(checked) {
  document.querySelectorAll('.reg-row-check').forEach(cb => cb.checked = checked);
}

function applyRegFilter() {
  const start = document.getElementById('reg-filter-start').value || null;
  const end = document.getElementById('reg-filter-end').value || null;
  const filtered = filterByDateRange(state.registrations, start ? start + 'T00:00:00' : null, end ? end + 'T23:59:59' : null);
  renderRegistrationsTable(filtered);
}

function clearRegFilter() {
  document.getElementById('reg-filter-start').value = '';
  document.getElementById('reg-filter-end').value = '';
  renderRegistrationsTable(state.registrations);
}

async function deleteRegistration(id) {
  if (!confirm('ยืนยันลบผู้ลงทะเบียนรายนี้? กู้คืนไม่ได้')) return;

  const { error } = await supabase.from('registrations').delete().eq('id', id);
  if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'err'); return; }

  state.registrations = state.registrations.filter(r => r.id !== id);
  renderRegistrationsTable(regFilteredRows.filter(r => r.id !== id));
  toast('ลบสำเร็จ', 'ok');
}

async function deleteSelectedRegistrations() {
  const ids = [...document.querySelectorAll('.reg-row-check:checked')].map(cb => cb.value);
  if (ids.length === 0) { toast('ยังไม่ได้เลือกแถวใดเลย', 'err'); return; }
  if (!confirm(`ยืนยันลบผู้ลงทะเบียน ${ids.length} รายการ? กู้คืนไม่ได้`)) return;

  const { error } = await supabase.from('registrations').delete().in('id', ids);
  if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'err'); return; }

  state.registrations = state.registrations.filter(r => !ids.includes(r.id));
  renderRegistrationsTable(regFilteredRows.filter(r => !ids.includes(r.id)));
  toast(`ลบสำเร็จ ${ids.length} รายการ`, 'ok');
}
```

- [ ] **Step 5: Manual verification — filter**

With at least 2 registrations spanning different dates in `test-event` (insert one manually with an old `created_at` via SQL Editor if needed), set "ตั้งแต่วันที่"/"ถึงวันที่" to bracket only one of them, click "กรอง".
Expected: table shows only the matching row; "ล้างตัวกรอง" restores the full list.

- [ ] **Step 6: Manual verification — delete**

Click "ลบ" on one row, confirm the dialog.
Expected: row disappears from the table and from `registrations` in Supabase Table Editor.
Select 2 rows via checkboxes, click "ลบที่เลือก", confirm.
Expected: both rows disappear from the table and the database.

- [ ] **Step 7: Commit**

```bash
git add admin.html
git commit -m "feat: add date filter and row/bulk delete to registrations tab"
```

---

## Task 11: Registrations Tab — Export to Excel

**Files:**
- Modify: `admin.html` (registrations panel — add export button; add SheetJS CDN script tag)
- Modify: `admin.html:595` (add `js/exportRows.js` script tag)

**Interfaces:**
- Consumes: `buildExportRows(registrations, eventName)` from `js/exportRows.js` (Task 4); `regFilteredRows` from Task 10; global `XLSX` (SheetJS, loaded via CDN).

- [ ] **Step 1: Add SheetJS CDN + helper script tags**

In `admin.html`, before `<script src="wheelConfig.js"></script>`, add:

```html
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="js/exportRows.js"></script>
```

- [ ] **Step 2: Add the export button**

In the filter/bulk-action row added in Task 10 Step 2, add a button right after "ลบที่เลือก":

```html
    <button class="btn btn-primary btn-sm" onclick="exportRegistrationsToExcel()">Export Excel</button>
```

- [ ] **Step 3: Add the export function**

Add this function after `deleteSelectedRegistrations`:

```js
function exportRegistrationsToExcel() {
  if (regFilteredRows.length === 0) {
    toast('ไม่มีข้อมูลให้ export (ตามตัวกรองปัจจุบัน)', 'error');
    return;
  }

  const eventName = document.getElementById('event-select').selectedOptions[0]?.textContent || '';
  const rows = buildExportRows(regFilteredRows, eventName);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

  const filename = `registrations-${eventName.replace(/[^a-zA-Z0-9ก-๙]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
```

- [ ] **Step 4: Manual verification**

With the `test-event` selected and at least one registration in the table, click "Export Excel".
Expected: an `.xlsx` file downloads named `registrations-test-event-<date>.xlsx`; opening it shows one row per registration with Thai column headers (ชื่อ, นามสกุล, อีเมล, ...) matching what's in the table.

Apply a date filter that excludes all rows, click "Export Excel" again.
Expected: toast "ไม่มีข้อมูลให้ export (ตามตัวกรองปัจจุบัน)", no file downloads.

- [ ] **Step 5: Commit**

```bash
git add admin.html
git commit -m "feat: add Excel export for filtered registrations"
```

---

## Task 12: Manual Supabase API Tester Page

**Files:**
- Create: `test-supabase.html` (analogous to the existing `test-api.html`, which tests the old Google Apps Script endpoints)

**Interfaces:**
- Consumes: `supabaseClient.js` (Task 2). No other task depends on this file — it's a standalone debugging tool.

- [ ] **Step 1: Create the tester page**

Create `test-supabase.html`:

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>Test Supabase API</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #0d1117; color: #e6edf3; padding: 24px; }
    h1 { color: #ffd700; }
    .btn { background: #ffd700; color: #0d1117; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; margin: 6px 4px; }
    .btn:hover { background: #ffe54d; }
    .result { margin-top: 16px; padding: 16px; background: #161b22; border: 1px solid #30363d; border-radius: 8px; white-space: pre-wrap; word-break: break-all; font-size: 13px; min-height: 60px; }
    .ok { border-color: #3fb950; color: #3fb950; }
    .err { border-color: #f85149; color: #f85149; }
    .info { border-color: #58a6ff; color: #58a6ff; }
    .section { margin-bottom: 28px; }
    label { color: #7d8590; font-size: 12px; }
    input { background: #21262d; color: #e6edf3; border: 1px solid #30363d; border-radius: 4px; padding: 6px 10px; width: 100%; box-sizing: border-box; margin-top: 4px; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>

<h1>Test Supabase API</h1>

<div class="section">
  <label>Event Slug</label>
  <input id="test-slug" type="text" value="test-event" />
</div>

<hr />

<div class="section">
  <h3>1. โหลด Config (events by slug)</h3>
  <button class="btn" onclick="testGetConfig()">Run</button>
  <div class="result info" id="result-1">กด Run เพื่อทดสอบ...</div>
</div>

<div class="section">
  <h3>2. ดูจำนวนของรางวัลคงเหลือ (prizes)</h3>
  <button class="btn" onclick="testGetRemaining()">Run</button>
  <div class="result info" id="result-2">กด Run เพื่อทดสอบ...</div>
</div>

<div class="section">
  <h3>3. ทดสอบลงทะเบียน (insert registrations)</h3>
  <button class="btn" onclick="testRegister()">Run (TEST DATA)</button>
  <div class="result info" id="result-3">กด Run เพื่อทดสอบ...</div>
</div>

<div class="section">
  <h3>4. ทดสอบลดสต็อกของรางวัล (decrement_prize RPC)</h3>
  <button class="btn" onclick="testDecrement()">Run</button>
  <div class="result info" id="result-4">กด Run เพื่อทดสอบ...</div>
</div>

<div class="section">
  <h3>5. ทดสอบ RLS block (anon SELECT registrations ต้องถูกบล็อก)</h3>
  <button class="btn" onclick="testRlsBlock()">Run</button>
  <div class="result info" id="result-5">กด Run เพื่อทดสอบ...</div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js"></script>
<script>
  function show(id, text, cls) {
    const el = document.getElementById('result-' + id);
    el.textContent = text;
    el.className = 'result ' + cls;
  }

  let testEventId = null;

  async function testGetConfig() {
    const slug = document.getElementById('test-slug').value.trim();
    const { data, error } = await supabase.from('events').select('*').eq('slug', slug).single();
    if (error) { show(1, 'ERROR: ' + error.message, 'err'); return; }
    testEventId = data.id;
    show(1, JSON.stringify(data, null, 2), 'ok');
  }

  async function testGetRemaining() {
    if (!testEventId) { show(2, 'รัน Test 1 ก่อน เพื่อดึง event id', 'err'); return; }
    const { data, error } = await supabase.from('prizes').select('*').eq('event_id', testEventId);
    if (error) { show(2, 'ERROR: ' + error.message, 'err'); return; }
    show(2, JSON.stringify(data, null, 2), 'ok');
  }

  async function testRegister() {
    if (!testEventId) { show(3, 'รัน Test 1 ก่อน เพื่อดึง event id', 'err'); return; }
    const { data, error } = await supabase.from('registrations').insert({
      event_id: testEventId, first_name: 'ทดสอบ', last_name: 'ระบบ',
      email: 'test@api-check.com', phone: '0812345678', company: 'TEST',
      position: 'API Tester', prize_label: 'ของรางวัลทดสอบ', prize_id: 'notepad',
    }).select();
    if (error) { show(3, 'ERROR: ' + error.message, 'err'); return; }
    show(3, JSON.stringify(data, null, 2) + '\n\nอย่าลืมลบแถวทดสอบนี้ทีหลัง', 'ok');
  }

  async function testDecrement() {
    if (!testEventId) { show(4, 'รัน Test 1 ก่อน เพื่อดึง event id', 'err'); return; }
    const { data, error } = await supabase.rpc('decrement_prize', { p_event_id: testEventId, p_prize_id: 'notepad' });
    if (error) { show(4, 'ERROR: ' + error.message, 'err'); return; }
    show(4, 'remaining after decrement: ' + JSON.stringify(data), 'ok');
  }

  async function testRlsBlock() {
    const { data, error } = await supabase.from('registrations').select('*');
    if (error) {
      show(5, 'ผ่าน — ถูกบล็อกตามที่คาด: ' + error.message, 'ok');
    } else if (data.length === 0) {
      show(5, 'ผ่าน — ไม่มีข้อมูลคืนมา (RLS บล็อก select ให้ anon)', 'ok');
    } else {
      show(5, 'FAIL — anon อ่านข้อมูล registrations ได้! ตรวจ RLS policy ด่วน:\n' + JSON.stringify(data, null, 2), 'err');
    }
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Manual verification — run all 5 tests**

Open `test-supabase.html` in a browser (not logged in to admin). Click each button in order 1→5.
Expected: tests 1–4 show `ok` (green) results; test 5 shows `ok` (green) confirming anon cannot read registrations. If test 5 shows `FAIL` (red), stop and re-check the RLS policies from Task 1 before continuing to use the app.

- [ ] **Step 3: Clean up test data**

In Supabase SQL Editor: `delete from registrations where email = 'test@api-check.com';`

- [ ] **Step 4: Commit**

```bash
git add test-supabase.html
git commit -m "feat: add manual Supabase API tester page"
```

---

## Task 13: End-to-End Verification Pass

**Files:** none (verification only, no code changes)

- [ ] **Step 1: Concurrent decrement check**

Set `prizes.used = quantity - 1` for one prize in `test-event` (1 remaining). Open `index.html?event=test-event` in two separate browser tabs. Fill both forms. Click "หมุน" in both tabs within ~1 second of each other.
Expected: exactly one tab shows a result page; the other shows the "เพิ่งหมดพอดี กรุณาหมุนใหม่" toast. `registrations` table has exactly one new row from this test, not two.

- [ ] **Step 2: Multi-event isolation check**

Create a second event via the admin "+ Event ใหม่" flow (e.g. slug `event-b`) with its own prize. Open `index.html?event=test-event` and `index.html?event=event-b` in two tabs, register in both.
Expected: each event's `registrations` and `prizes.used` only reflect its own tab's activity — no cross-contamination.

- [ ] **Step 3: RLS check from a public tab**

In `index.html` (not `admin.html`), open DevTools console and run:
```js
supabase.from('registrations').select('*').then(r => console.log(r));
```
Expected: `data` is empty array or `error` is set — never the full registrations list.

- [ ] **Step 4: Admin auth check**

Log out of `admin.html` (add a logout button if one doesn't exist yet, or run `supabase.auth.signOut()` in the console). Reload the page.
Expected: login gate reappears; sidebar/content hidden until logging back in.

- [ ] **Step 5: Export + delete check**

In the registrations tab, filter to a known date range, export to Excel, open the file and confirm row count matches the on-screen filtered count. Then bulk-delete those same rows with the checkboxes.
Expected: exported file matches what was on screen; after delete, those rows are gone from both the table and Supabase.

- [ ] **Step 6: Record results**

No commit needed for this task — if all 5 checks pass, the migration is functionally complete per the spec's Testing section (`docs/superpowers/specs/2026-07-01-supabase-migration-design.md`, section 6). If any check fails, open a new task to fix it before considering the migration done.
