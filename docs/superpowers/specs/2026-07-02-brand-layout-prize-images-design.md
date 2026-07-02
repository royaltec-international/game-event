# Brand Layout Fix + Prize Images — Design

## Part 1 — Human-readable summary

### What is being built and why

Two independent UI/data changes to the event registration app:

1. **Brand checkbox layout.** The "แบรนด์หรือสินค้าที่สนใจ" (brands of interest) checkboxes on the registration form currently render in a responsive CSS grid (`auto-fill, minmax(120px, 1fr)`). When brand names are long, this squeezes labels into narrow cells and wraps text awkwardly, making the list hard to scan and click. This was surfaced on the live `temca-2026` event.

2. **Prize images.** Prizes on the wheel (and the "you won" result popup) currently show only an emoji character as their icon (`config.prizes[i].icon`). The event admin wants to optionally upload a real photo of the physical prize instead of relying on an emoji, while keeping database size small — Postgres row/jsonb bloat should stay negligible even as more events and prizes accumulate.

### Key design decisions

**Brand layout: single column, always.** Considered a responsive breakpoint (grid when short, list when long) but rejected — no clear threshold to test against, and a single column is never wrong, just occasionally shows more whitespace on very short lists. Simplicity wins.

**Prize images: Supabase Storage, not a database column.** Two options were on the table: (a) store image bytes/base64 directly in Postgres, or (b) upload to Supabase Storage and keep only a path reference. Storage wins decisively for the stated goal — Postgres rows/jsonb stay tiny (a path string, ~30-40 bytes) regardless of image size, uploads/downloads don't compete with query performance on the `events`/`prizes` tables, and Supabase Storage already has built-in CDN caching for public buckets. Base64-in-DB was rejected outright: it bloats `jsonb` (which is read on every page load via `events.config`), and 33% base64 overhead compounds with duplicate row reads.

**No new database table or column.** Prize metadata (`label`, `icon`, `color`, `textColor`, `quantity`) already lives inside `events.config.prizes[]` (a jsonb array), not in the separate `prizes` table (which only tracks live `quantity`/`used` counters for realtime stock sync). Adding `imagePath` as a sibling key inside the same jsonb objects keeps prize metadata in one place and requires zero schema migration — only a new Storage bucket plus RLS policies.

**Deterministic file paths, not upload-generated names.** Each prize image is stored at `{eventId}/{prizeId}.webp`. Re-uploading a photo for the same prize overwrites the same object (`upsert: true`) instead of accumulating orphaned files, and because the path is derivable from data already in hand (`eventId`, `prizeId`), cleanup on delete never needs a separate lookup or listing call.

**Client-side resize before upload.** Images are resized to fit within 160×160px and re-encoded as WebP (quality ~0.82) in-browser via `<canvas>` before the upload call. This is what actually delivers "ประหยัดพื้นที่" (save space) — the wheel/result circle only ever displays a small icon-sized image, so there's no reason to store or transfer a multi-megabyte phone photo. Expected output is a few KB to ~20-30KB per image.

**Fallback is icon-or-image, not both.** If `imagePath` is set, the image renders; otherwise the existing emoji `icon` renders. This preserves every existing event's config (no `imagePath` key = old behavior, unchanged) and matches how the admin already thinks about prize icons — one visual slot, filled by either an emoji or a photo.

### Architecture overview

```
Admin uploads photo (admin.html)
  → resize+encode to WebP in-browser (canvas)
  → supabase.storage.from('prize-images').upload(`${eventId}/${prizeId}.webp`, blob, {upsert:true})
  → state.prizes[i].imagePath = path
  → (existing save-config flow persists events.config as before — imagePath rides along
     as just another jsonb key, no code path changes needed there)

Public site (script.js) on load
  → for each prize with imagePath: derive public URL via
    supabase.storage.from('prize-images').getPublicUrl(imagePath) (local/no network call)
  → preload as Image() objects, cache by prize id
  → drawWheel(): if image loaded for this segment, clip-circle + drawImage; else fillText(icon)
  → result popup: if image loaded, render <img>; else textContent = icon

Deletion
  → removePrize(i): if imagePath set, storage.remove([imagePath]) before splicing from array
  → deleteCurrentEvent(): collect imagePath from all state.prizes, storage.remove(paths) as one
    batch call, before the existing events.delete() runs
```

### Constraints and non-obvious trade-offs

- Storage bucket must be created manually in the Supabase dashboard (or via SQL/API) before this ships — it's not part of `supabase/schema.sql`'s table definitions, so this is a one-time manual setup step documented in the plan.
- Public read on the bucket is required (the game/result page is unauthenticated `anon`), matching the existing pattern where `events`/`prizes` tables already grant `anon` read access. Write (upload/delete) is restricted to `authenticated` — mirrors the existing table RLS policies exactly.
- WebP encoding via `canvas.toBlob(cb, 'image/webp', quality)` is broadly supported in modern browsers (Chrome, Edge, Firefox, Safari 14+). No fallback format is planned — this is an internal admin tool, not a public upload surface, so browser coverage risk is low and accepted.
- Preloading images before first `drawWheel()` call adds a brief async wait on page load if images are present; existing behavior (emoji-only) had no such wait. Mitigated with a short timeout-based fallback so a slow/broken image never blocks the wheel from rendering (falls back to emoji if load fails or times out).

### What is explicitly out of scope

- Replacing the emoji icon feature entirely (memory notes this project prefers icons over emoji elsewhere, but that's for *our own added UI*, not a mandate to rip out an existing user-facing feature that wasn't asked to change). Image is additive; emoji stays as the fallback/default.
- Image editing tools (crop, rotate) in the admin — resize-to-fit is automatic and non-interactive.
- Migrating/backfilling images for existing events — this only affects prizes an admin chooses to add a photo to going forward.
- Any change to the `prizes` DB table (quantity/used/remaining tracking) — untouched.

---

## Part 2 — Implementation tasks

### Task 1: Brand layout — single column

**File:** `style.css`

Change `.brands-grid` (around line 476-480) from:
```css
.brands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
```
to:
```css
.brands-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
```

**Acceptance criteria:** On `https://royaltec-international.github.io/game-event/index.html?event=temca-2026`, brand checkboxes stack one per row regardless of label length. No JS changes needed (`.brand-item` styling in style.css:482-510 is unaffected).

No cross-task dependency.

---

### Task 2: Create Supabase Storage bucket + RLS policies

**Where:** Supabase Dashboard (SQL editor) — not a code file, but document the exact SQL in `supabase/schema.sql` as a comment block or new section so it's reproducible.

Run once against the project:
```sql
insert into storage.buckets (id, name, public)
values ('prize-images', 'prize-images', true)
on conflict (id) do nothing;

create policy "public read prize images"
  on storage.objects for select
  to anon
  using (bucket_id = 'prize-images');

create policy "auth write prize images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'prize-images');

create policy "auth update prize images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'prize-images');

create policy "auth delete prize images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'prize-images');
```

**Acceptance criteria:** Bucket `prize-images` exists, is public, and only `authenticated` sessions (i.e. logged-in admin) can upload/update/delete objects in it. Verify via Supabase dashboard Storage tab and a manual test upload from the authenticated admin session.

No cross-task dependency, but Task 4 and 5 require this to exist first.

---

### Task 3: Add `pageDirectoryUrl`-style helper for image resize/encode (pure, testable)

**File:** new `js/prizeImage.js` (mirrors the existing pattern of `js/eventLink.js`, `js/exportRows.js` — small pure-function modules with matching `.test.js` files)

Add a pure function that, given a loaded `HTMLImageElement`/`ImageBitmap` width/height, computes the resize target dimensions (fit within 160×160, preserve aspect ratio, never upscale):
```js
function fitDimensions(width, height, maxSize) {
  if (width <= maxSize && height <= maxSize) return { width, height };
  const scale = maxSize / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function prizeImagePath(eventId, prizeId) {
  return `${eventId}/${prizeId}.webp`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fitDimensions, prizeImagePath };
}
```

The actual canvas drawing / `toBlob` / upload call stays inline in `admin.html` (it needs live DOM/canvas/Supabase client — not unit-testable in Node the way the pure math is), but it calls these two exported helpers.

**Test file:** `js/prizeImage.test.js` — following the existing `node:test` pattern in `js/eventLink.test.js`:
- `fitDimensions` returns unchanged size when already within bounds
- `fitDimensions` scales down a wide image preserving aspect ratio
- `fitDimensions` scales down a tall image preserving aspect ratio
- `fitDimensions` never upscales a smaller-than-max image
- `prizeImagePath` builds `{eventId}/{prizeId}.webp`

**Acceptance criteria:** `node --test js/prizeImage.test.js` passes. Write the failing tests first per TDD, then implement.

Depends on: nothing (pure new file). Must land before Task 4.

---

### Task 4: Admin upload UI — per prize card

**File:** `admin.html`

4a. In `renderPrizes()` (admin.html:1253-1358), inside the prize card template (near the existing "Emoji Icon" form-group at admin.html:1334-1339), add a sibling form-group:
- File input: `<input type="file" accept="image/*" onchange="handlePrizeImageSelect(${i}, this)" />`
- Thumbnail: an `<img>` (hidden if no `p.imagePath`) showing the current image via the public URL
- "ลบรูป" button (only rendered when `p.imagePath` is set), calling `removePrizeImage(${i})`

4b. New function `handlePrizeImageSelect(i, inputEl)`:
- Read the selected `File` via `createImageBitmap` (or `new Image()` + `FileReader`)
- Compute target size with `fitDimensions(bitmap.width, bitmap.height, 160)` from `js/prizeImage.js`
- Draw to an off-screen `<canvas>` at that size
- `canvas.toBlob(blob => uploadPrizeImage(i, blob), 'image/webp', 0.82)`

4c. New async function `uploadPrizeImage(i, blob)`:
- `const path = prizeImagePath(state.currentEventId, state.prizes[i].id)`
- `await supabase.storage.from('prize-images').upload(path, blob, { upsert: true, contentType: 'image/webp' })`
- On success: `setPrize(i, 'imagePath', path)`, re-render that card's thumbnail, `toast('อัปโหลดรูปสำเร็จ', 'ok')`
- On error: `toast('อัปโหลดรูปไม่สำเร็จ: ' + error.message, 'err')`

4d. New async function `removePrizeImage(i)`:
- If `state.prizes[i].imagePath`: `await supabase.storage.from('prize-images').remove([state.prizes[i].imagePath])`
- `setPrize(i, 'imagePath', null)`, `renderPrizes()`

4e. Import `js/prizeImage.js` via `<script src="js/prizeImage.js"></script>` near the existing `<script src="js/eventLink.js"></script>` (admin.html:682-area, mirror whatever admin.html's existing script includes look like).

**Acceptance criteria:** Manually verified in browser — selecting an image file for a prize shows a thumbnail, uploads to Storage (confirm in Supabase dashboard the object exists at `{eventId}/{prizeId}.webp` and is under ~30KB for a typical phone photo input), "ลบรูป" removes it and reverts to emoji-only state.

Depends on: Task 2 (bucket must exist), Task 3 (`fitDimensions`, `prizeImagePath`).

---

### Task 5: Cleanup on delete

**File:** `admin.html`

5a. `removePrize(i)` (admin.html:1408-1412) currently reads:
```js
function removePrize(i) {
  if (!confirm('ลบรางวัลนี้?')) return;
  state.prizes.splice(i, 1);
  renderPrizes();
}
```
Change to async and delete the Storage object (if any) before splicing:
```js
async function removePrize(i) {
  if (!confirm('ลบรางวัลนี้?')) return;
  const imagePath = state.prizes[i].imagePath;
  if (imagePath) await supabase.storage.from('prize-images').remove([imagePath]);
  state.prizes.splice(i, 1);
  renderPrizes();
}
```
The existing `onclick="removePrize(${i})"` (admin.html:1299) keeps working unchanged — inline HTML handlers don't need to await an async function.

5b. `deleteCurrentEvent()` (admin.html:834-846): immediately before the `supabase.from('events').delete()` call, collect `const imagePaths = state.prizes.filter(p => p.imagePath).map(p => p.imagePath)`. If non-empty, `await supabase.storage.from('prize-images').remove(imagePaths)` (single batch call) before proceeding with the event delete.

**Acceptance criteria:** Manually verified — removing a single prize with an image deletes its Storage object (confirm in dashboard); deleting an entire event with 2+ prizes that have images removes all of them in one batch call (confirm dashboard shows the `{eventId}/` folder empty/gone).

Depends on: Task 4 (imagePath must exist on prizes to test cleanup against).

---

### Task 6: Public site rendering — wheel + result popup

**File:** `script.js`

6a. Add an image preload/cache step, called from `loadConfig()` (script.js:78-103) after `Object.assign(WHEEL_CONFIG, config)`:
```js
const prizeImages = {}; // module-scope cache, keyed by prize id

async function preloadPrizeImages() {
  const loads = WHEEL_CONFIG.prizes
    .filter(p => p.imagePath)
    .map(p => new Promise(resolve => {
      const url = supabase.storage.from('prize-images').getPublicUrl(p.imagePath).data.publicUrl;
      const img = new Image();
      img.onload = () => { prizeImages[p.id] = img; resolve(); };
      img.onerror = () => resolve(); // fall back to emoji, don't block
      img.src = url;
    }));
  // don't let a slow/broken image hang the page — cap the wait
  await Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 1500))]);
}
```
Call `await preloadPrizeImages();` in `loadConfig()` before the function returns (after the existing remaining-quantity fetch block).

6b. `drawWheel()` (script.js:453-onward, icon draw at line 501-503): change
```js
const iconFont = `${cfg.fontSize + 2}px serif`;
ctx.font = iconFont;
ctx.fillText(seg.icon, textR + 4, 4);
```
to check `prizeImages[seg.id]` first:
```js
const img = prizeImages[seg.id];
if (img) {
  const size = cfg.fontSize + 10; // roughly matches prior emoji visual weight
  ctx.save();
  ctx.beginPath();
  ctx.arc(textR + 4, 4, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, textR + 4 - size / 2, 4 - size / 2, size, size);
  ctx.restore();
} else {
  ctx.font = `${cfg.fontSize + 2}px serif`;
  ctx.fillText(seg.icon, textR + 4, 4);
}
```
(Exact pixel constants to be tuned visually against the existing wheel — the acceptance criterion is "looks correct on the actual wheel", not exact pixel match to this pseudocode.)

6c. Result popup (script.js:673): change
```js
dom.resultIcon.textContent = prize.icon;
```
to:
```js
const img = prizeImages[prize.id];
if (img) {
  dom.resultIcon.innerHTML = '';
  const imgEl = document.createElement('img');
  imgEl.src = img.src;
  imgEl.alt = prize.label;
  imgEl.className = 'result-icon-image';
  dom.resultIcon.appendChild(imgEl);
} else {
  dom.resultIcon.textContent = prize.icon;
}
```
Add a `.result-icon-image` rule to `style.css` (circular crop, sized to match the existing emoji's visual footprint in the result popup — inspect current `#result-icon` CSS for sizing to match).

**Acceptance criteria:** For a prize with an uploaded image: the wheel segment shows the photo clipped to a circle instead of the emoji; landing on that prize shows the photo (not emoji) in the result popup. For a prize with no image: wheel and popup behavior is pixel-identical to current behavior (emoji, unchanged). Test against `temca-2026` or a scratch/test event — do not modify production prize data without the user's go-ahead.

Depends on: Task 4 (need at least one prize with `imagePath` set to test against), Task 1 is independent (no shared files/state).

---

### Cross-task notes

- Tasks 1 and 3 have no dependencies — can be done first/in parallel.
- Task 2 (manual Supabase setup) must happen before any upload can be tested (Tasks 4-6), but doesn't block writing the code for those tasks.
- Tasks 4 → 5 → 6 are naturally sequential (need upload working before cleanup is meaningfully testable; need `imagePath` data flowing before rendering can be verified) but 5 and 6 don't touch the same files/functions and could be implemented in either order once 4 is done.
- After implementation, push to both remotes per the existing dual-repo workflow (`origin` = personal backup, `royaltec` = production via GitHub Pages) — see project memory `reference_github-repos-deployment`.
