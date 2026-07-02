# Brand Layout Fix + Prize Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stack the registration form's brand checkboxes into a single readable column, and let admins attach a small compressed photo to a prize (falling back to the existing emoji when none is set) without adding any new database columns or bloating `events.config`.

**Architecture:** Brand layout is a pure CSS change. Prize images use Supabase Storage as the byte store (bucket `prize-images`, public read / authenticated write) with only a deterministic path string (`{eventId}/{prizeId}.webp`) persisted inside the existing `events.config.prizes[]` jsonb array, alongside the prize's existing `icon`/`color`/`label` keys. Images are resized to fit 160×160px and re-encoded as WebP client-side (in the browser, via `<canvas>`) before upload, so nothing large ever touches the database or leaves the browser uncompressed.

**Tech Stack:** Vanilla JS (no framework, no bundler), `node:test` for unit tests, Supabase JS client v2 (`supabase-js@2`, loaded via CDN `<script>` tag — already used throughout the app), Supabase Storage.

## Global Constraints

- No new database table or column — `events.config.prizes[i].imagePath` is the only new persisted field, and it rides through the existing `saveConfigToServer(state.currentEventId, config)` call (admin.html:1204) with no changes to that function.
- Prize image files must be resized client-side to fit within 160×160px and encoded as WebP (quality ~0.82) before upload — this is what keeps storage small; do not upload the raw selected file.
- Storage object paths are deterministic: `{eventId}/{prizeId}.webp`. Every upload for the same prize must use `upsert: true` so re-uploads overwrite rather than accumulate.
- Brand checkboxes render in a single CSS column always — no responsive/conditional breakpoint logic.
- Existing emoji-icon behavior for prizes with no `imagePath` must remain pixel-identical (wheel segment `fillText`, result popup `textContent`) — image support is additive, not a replacement.
- New pure-logic files follow the existing project pattern: a small `js/<name>.js` module (CommonJS export guarded by `typeof module !== 'undefined'`) paired with a `js/<name>.test.js` using `node:test` + `node:assert/strict` — see `js/eventLink.js` / `js/eventLink.test.js` as the reference pair.
- Run the full JS test suite with `node --test js/*.test.js` from the repo root (no `package.json`/test runner config exists — this is the exact command used throughout this project's history).

---

### Task 1: Brand checkbox layout — single column

**Files:**
- Modify: `style.css:476-480`

**Interfaces:** None — pure CSS, no JS/data changes.

- [ ] **Step 1: Change the grid column rule**

In `style.css`, find:
```css
.brands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}
```
Replace with:
```css
.brands-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
```

- [ ] **Step 2: Manually verify in browser**

Open `index.html` in a browser via a local static server (from the repo root: `npx serve .` or `python3 -m http.server 8000`, then visit `http://localhost:8000/index.html?event=temca-2026` — replace the port/path to match whichever server you started). Confirm the "แบรนด์หรือสินค้าที่สนใจ" checkboxes render one per row, full width, regardless of label length. If the `temca-2026` event isn't available locally (server-loaded config), any event slug with the brands section enabled works — `wheelConfig.js`'s local default (`brandsCheckbox.items: ["Panduit", "Allied", "Eaton", "Belden"]`) renders even without a server connection.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "fix: stack brand checkboxes in a single column for readability"
```

---

### Task 2: Create Supabase Storage bucket + RLS policies

**Files:**
- Modify: `supabase/schema.sql` (append, documentation of a one-time manual step)

**Interfaces:**
- Produces: Storage bucket `prize-images` (public read via `anon`, write/update/delete via `authenticated`) — Tasks 4-6 depend on this bucket existing before they can be tested end-to-end (the code for those tasks can still be written first).

- [ ] **Step 1: Append the bucket + policy SQL to `supabase/schema.sql`**

Add this block to the end of `supabase/schema.sql`:
```sql
-- ============================================================
--  Storage: prize images
--  Run once. Public bucket so the unauthenticated game page can
--  display prize photos; write access restricted to admins.
-- ============================================================
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

- [ ] **Step 2: Run it against the live Supabase project**

Open the Supabase Dashboard for this project → SQL Editor → paste the block from Step 1 → Run. Confirm no errors.

- [ ] **Step 3: Verify the bucket in the dashboard**

Supabase Dashboard → Storage → confirm a bucket named `prize-images` exists and is marked Public.

- [ ] **Step 4: Commit the schema doc update**

```bash
git add supabase/schema.sql
git commit -m "docs: document prize-images Storage bucket + RLS policies"
```

---

### Task 3: Pure resize/path helpers (`js/prizeImage.js`)

**Files:**
- Create: `js/prizeImage.js`
- Test: `js/prizeImage.test.js`

**Interfaces:**
- Produces: `fitDimensions(width: number, height: number, maxSize: number): { width: number, height: number }` — computes resize target, preserving aspect ratio, never upscaling.
- Produces: `prizeImagePath(eventId: string, prizeId: string): string` — returns `` `${eventId}/${prizeId}.webp` ``.
- Consumed by: Task 4 (admin upload handler) and indirectly documents the path format Task 6 must reconstruct via `getPublicUrl`.

- [ ] **Step 1: Write the failing tests**

Create `js/prizeImage.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { fitDimensions, prizeImagePath } = require('./prizeImage.js');

test('fitDimensions returns the original size when already within bounds', () => {
  assert.deepEqual(fitDimensions(100, 80, 160), { width: 100, height: 80 });
});

test('fitDimensions scales down a wide image preserving aspect ratio', () => {
  assert.deepEqual(fitDimensions(400, 200, 160), { width: 160, height: 80 });
});

test('fitDimensions scales down a tall image preserving aspect ratio', () => {
  assert.deepEqual(fitDimensions(200, 400, 160), { width: 80, height: 160 });
});

test('fitDimensions never upscales a smaller-than-max image', () => {
  assert.deepEqual(fitDimensions(50, 30, 160), { width: 50, height: 30 });
});

test('fitDimensions handles a square image at exactly the max size', () => {
  assert.deepEqual(fitDimensions(160, 160, 160), { width: 160, height: 160 });
});

test('prizeImagePath builds a deterministic webp path from eventId and prizeId', () => {
  assert.equal(
    prizeImagePath('11111111-2222-3333-4444-555555555555', 'notepad'),
    '11111111-2222-3333-4444-555555555555/notepad.webp'
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test js/prizeImage.test.js`
Expected: FAIL — `Cannot find module './prizeImage.js'` (file doesn't exist yet).

- [ ] **Step 3: Implement `js/prizeImage.js`**

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test js/prizeImage.test.js`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/prizeImage.js js/prizeImage.test.js
git commit -m "feat: add pure resize-dimension and storage-path helpers for prize images"
```

---

### Task 4: Admin upload UI — per-prize image upload

**Files:**
- Modify: `admin.html:205-208` (add a thumbnail CSS rule near `.prize-badge`)
- Modify: `admin.html:687` (add `<script src="js/prizeImage.js"></script>` before the inline admin `<script>` block)
- Modify: `admin.html:1333-1344` (prize card template — add image upload form-group)
- Modify: `admin.html` inline script — add `handlePrizeImageSelect`, `uploadPrizeImage`, `removePrizeImage` functions

**Interfaces:**
- Consumes: `fitDimensions(width, height, maxSize)`, `prizeImagePath(eventId, prizeId)` from `js/prizeImage.js` (Task 3). Consumes the existing global `supabase` client (from `supabaseClient.js`), existing `state.prizes`, `state.currentEventId`, existing `setPrize(i, key, val)` (admin.html:1393-1396), existing `esc(s)` (admin.html:1487-1489), existing `toast(message, kind)` (used throughout admin.html — same signature as other `toast(...)` calls in this file), existing `renderPrizes()` (admin.html:1253).
- Produces: `handlePrizeImageSelect(i: number, inputEl: HTMLInputElement): void`, `uploadPrizeImage(i: number, blob: Blob): Promise<void>`, `removePrizeImage(i: number): Promise<void>` — all attached as global functions (matching every other handler in this file, e.g. `removePrize`, `setPrizeColor`), called from inline `onclick`/`onchange` attributes in the template.
- Produces (data shape): after a successful upload, `state.prizes[i].imagePath` is a non-empty string; after removal, it is `null`. Task 5 and Task 6 both branch on `p.imagePath` truthiness.

- [ ] **Step 1: Add the storage bucket name constant and thumbnail CSS**

In `admin.html`, right after the existing `PALETTE` constant (admin.html:692):
```js
const PALETTE = ['#f9c74f','#4cc9f0','#43aa8b','#f94144','#9b5de5','#ff6b35','#06d6a0','#e9c46a','#118ab2','#e76f51'];
const PRIZE_IMAGE_BUCKET = 'prize-images';
```

In `admin.html`, right after the `.prize-badge` rule (admin.html:205-208):
```css
.prize-badge {
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}

.prize-image-thumb {
  width: 48px; height: 48px; border-radius: 50%;
  object-fit: cover; border: 1px solid var(--border);
}
```

- [ ] **Step 2: Load `js/prizeImage.js` in `admin.html`**

Find (admin.html:687):
```html
<script src="wheelConfig.js"></script>
```
Add immediately after it:
```html
<script src="wheelConfig.js"></script>
<script src="js/prizeImage.js"></script>
```

- [ ] **Step 3: Add the upload form-group to the prize card template**

In `admin.html`, find the block starting at line 1333 (`<div style="display:flex;gap:12px;margin-top:12px;align-items:end;flex-wrap:wrap;">`) through its closing `</div>` at line 1344:
```html
      <div style="display:flex;gap:12px;margin-top:12px;align-items:end;flex-wrap:wrap;">
        <div class="form-group" style="flex:0 0 90px;">
          <label>Emoji Icon</label>
          <input type="text" value="${esc(p.icon)}" placeholder="ว่าง" maxlength="4"
            oninput="setPrize(${i},'icon',this.value);document.getElementById('badge-icon-${i}').textContent=this.value"
            style="font-size:20px;text-align:center;" />
        </div>
        <div class="form-group" style="flex:1;min-width:160px;">
          <label>สีด่วน (คลิกเพื่อใช้)</label>
          <div class="color-presets">${presetDots}</div>
        </div>
      </div>
```
Replace with (adds an image upload form-group as a new sibling before the emoji field):
```html
      <div style="display:flex;gap:12px;margin-top:12px;align-items:end;flex-wrap:wrap;">
        <div class="form-group" style="flex:0 0 140px;">
          <label>รูปของรางวัล (ถ้ามี ใช้แทน emoji)</label>
          <div style="display:flex;align-items:center;gap:8px;">
            ${p.imagePath
              ? `<img src="${esc(supabase.storage.from(PRIZE_IMAGE_BUCKET).getPublicUrl(p.imagePath).data.publicUrl)}" class="prize-image-thumb" alt="" />`
              : ''}
            <input type="file" accept="image/*" style="max-width:110px;font-size:11px;"
              onchange="handlePrizeImageSelect(${i}, this)" />
          </div>
          ${p.imagePath ? `<button class="btn btn-outline btn-sm" style="margin-top:4px;" onclick="removePrizeImage(${i})">ลบรูป</button>` : ''}
        </div>
        <div class="form-group" style="flex:0 0 90px;">
          <label>Emoji Icon</label>
          <input type="text" value="${esc(p.icon)}" placeholder="ว่าง" maxlength="4"
            oninput="setPrize(${i},'icon',this.value);document.getElementById('badge-icon-${i}').textContent=this.value"
            style="font-size:20px;text-align:center;" />
        </div>
        <div class="form-group" style="flex:1;min-width:160px;">
          <label>สีด่วน (คลิกเพื่อใช้)</label>
          <div class="color-presets">${presetDots}</div>
        </div>
      </div>
```

- [ ] **Step 4: Add the upload/remove handler functions**

In `admin.html`, right after the `removePrize` function (which Task 5 will also modify — insert this new code immediately after the current `removePrize` block at admin.html:1408-1412, before `addPrize`):
```js
function handlePrizeImageSelect(i, inputEl) {
  const file = inputEl.files[0];
  if (!file) return;

  const img = new Image();
  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      const { width, height } = fitDimensions(img.width, img.height, 160);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => uploadPrizeImage(i, blob), 'image/webp', 0.82);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function uploadPrizeImage(i, blob) {
  if (!blob) { toast('แปลงรูปไม่สำเร็จ', 'err'); return; }
  const path = prizeImagePath(state.currentEventId, state.prizes[i].id);
  const { error } = await supabase.storage
    .from(PRIZE_IMAGE_BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/webp' });

  if (error) { toast('อัปโหลดรูปไม่สำเร็จ: ' + error.message, 'err'); return; }

  setPrize(i, 'imagePath', path);
  renderPrizes();
  toast('อัปโหลดรูปสำเร็จ', 'ok');
}

async function removePrizeImage(i) {
  const path = state.prizes[i].imagePath;
  if (!path) return;
  const { error } = await supabase.storage.from(PRIZE_IMAGE_BUCKET).remove([path]);
  if (error) { toast('ลบรูปไม่สำเร็จ: ' + error.message, 'err'); return; }
  setPrize(i, 'imagePath', null);
  renderPrizes();
  toast('ลบรูปแล้ว', 'ok');
}
```

- [ ] **Step 5: Manually verify in browser**

Serve the repo locally (`npx serve .` or `python3 -m http.server 8000`) and open `admin.html`, log in, select an event with at least one prize.
1. Click the new file input on a prize card, pick a photo (any size — a phone photo is fine).
2. Confirm a circular thumbnail appears next to the file input within a couple seconds and a "อัปโหลดรูปสำเร็จ" toast shows.
3. In the Supabase Dashboard → Storage → `prize-images` bucket, confirm an object exists at `{eventId}/{prizeId}.webp` and its size is roughly in the tens of KB, not megabytes.
4. Click "ลบรูป" — confirm the thumbnail disappears, a "ลบรูปแล้ว" toast shows, and the object is gone from the Storage dashboard.
5. Click "บันทึก" (save) after uploading an image, reload the admin page, re-select the same event — confirm the thumbnail is still there (proves `imagePath` persisted through `saveConfigToServer`/`config.prizes`).

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat: let admins upload a resized WebP photo per prize"
```

---

### Task 5: Delete image files when a prize or event is deleted

**Files:**
- Modify: `admin.html:834-846` (`deleteCurrentEvent`)
- Modify: `admin.html:1408-1412` (`removePrize`)

**Interfaces:**
- Consumes: `state.prizes[i].imagePath` (Task 4), global `supabase` client, `PRIZE_IMAGE_BUCKET` (Task 4, Step 1).
- Produces: no new interface — this task only changes existing function bodies to add cleanup side effects.

- [ ] **Step 1: Make `removePrize` delete its Storage object first**

Find (admin.html:1408-1412):
```js
function removePrize(i) {
  if (!confirm('ลบรางวัลนี้?')) return;
  state.prizes.splice(i, 1);
  renderPrizes();
}
```
Replace with:
```js
async function removePrize(i) {
  if (!confirm('ลบรางวัลนี้?')) return;
  const imagePath = state.prizes[i].imagePath;
  if (imagePath) {
    await supabase.storage.from(PRIZE_IMAGE_BUCKET).remove([imagePath]);
  }
  state.prizes.splice(i, 1);
  renderPrizes();
}
```
(The existing `onclick="removePrize(${i})"` at admin.html:1299 needs no change — inline HTML event handlers don't need to await an async function.)

- [ ] **Step 2: Make `deleteCurrentEvent` batch-delete all of the event's prize images**

Find (admin.html:834-846):
```js
async function deleteCurrentEvent() {
  if (!state.currentEventId) return;

  const name = document.getElementById('event-select').selectedOptions[0]?.dataset.name || '';

  if (!confirm(`ยืนยันลบ Event "${name}"?\n\nข้อมูลผู้ลงทะเบียนและของรางวัลทั้งหมดของ Event นี้จะถูกลบถาวร กู้คืนไม่ได้`)) return;
  if (prompt(`พิมพ์ชื่อ Event "${name}" เพื่อยืนยันการลบ:`) !== name) {
    toast('ยกเลิกการลบ (ข้อความยืนยันไม่ตรง)', 'err');
    return;
  }

  const { error } = await supabase.from('events').delete().eq('id', state.currentEventId);
  if (error) { toast('ลบ Event ไม่สำเร็จ: ' + error.message, 'err'); return; }
```
Replace with:
```js
async function deleteCurrentEvent() {
  if (!state.currentEventId) return;

  const name = document.getElementById('event-select').selectedOptions[0]?.dataset.name || '';

  if (!confirm(`ยืนยันลบ Event "${name}"?\n\nข้อมูลผู้ลงทะเบียนและของรางวัลทั้งหมดของ Event นี้จะถูกลบถาวร กู้คืนไม่ได้`)) return;
  if (prompt(`พิมพ์ชื่อ Event "${name}" เพื่อยืนยันการลบ:`) !== name) {
    toast('ยกเลิกการลบ (ข้อความยืนยันไม่ตรง)', 'err');
    return;
  }

  const imagePaths = state.prizes.filter(p => p.imagePath).map(p => p.imagePath);
  if (imagePaths.length > 0) {
    await supabase.storage.from(PRIZE_IMAGE_BUCKET).remove(imagePaths);
  }

  const { error } = await supabase.from('events').delete().eq('id', state.currentEventId);
  if (error) { toast('ลบ Event ไม่สำเร็จ: ' + error.message, 'err'); return; }
```
(The rest of the function, from `if (registrationsChannel) { ... }` onward, is unchanged.)

- [ ] **Step 3: Manually verify in browser**

Using the same local server as Task 4:
1. On a prize with an uploaded image, click the prize card's delete (✕) button — confirm the Storage object is gone from the dashboard afterward.
2. Create a scratch/test event, add 2 prizes, upload an image to each, then delete the whole event via "ลบ Event". Confirm both Storage objects (under that event's `{eventId}/` prefix) are gone from the dashboard, and the `events`/`prizes`/`registrations` rows are gone as before (existing cascade behavior, unchanged).

- [ ] **Step 4: Commit**

```bash
git add admin.html
git commit -m "fix: delete prize image files from Storage when a prize or event is deleted"
```

---

### Task 6: Show prize images on the wheel and result popup

**Files:**
- Modify: `script.js:12-19` (state block — add image cache)
- Modify: `script.js:78-103` (`loadConfig`)
- Modify: `script.js:453-530` (`drawWheel`)
- Modify: `script.js:670-677` (`showResult`)
- Modify: `style.css:345-350` (`.result-icon`) — add a sibling rule for the image variant

**Interfaces:**
- Consumes: `WHEEL_CONFIG.prizes[].imagePath` (populated by Task 4's admin flow, read via the existing `Object.assign(WHEEL_CONFIG, config)` at script.js:83 — no change needed there since it's a plain object merge). Consumes the existing global `supabase` client.
- Produces: module-scope `prizeImages` cache (`{ [prizeId]: HTMLImageElement }`) — internal to `script.js`'s IIFE, not exposed outside it.

- [ ] **Step 1: Add the image cache next to existing state**

Find (script.js:12-19):
```js
  const state = {
    currentPage: 'form',
    userData: null,
    prizesRemaining: {},
    currentAngle: 0,
    isSpinning: false,
    wonPrize: null,
  };
```
Add immediately after the closing `};`:
```js
  const state = {
    currentPage: 'form',
    userData: null,
    prizesRemaining: {},
    currentAngle: 0,
    isSpinning: false,
    wonPrize: null,
  };

  // prizeId -> loaded HTMLImageElement, populated by preloadPrizeImages()
  const prizeImages = {};
```

- [ ] **Step 2: Add `preloadPrizeImages` and call it from `loadConfig`**

Find (script.js:78-103):
```js
  async function loadConfig() {
    try {
      // โหลด config จาก server
      const config = await loadConfigFromServer();
      if (config) {
        Object.assign(WHEEL_CONFIG, config);
      }
    } catch (e) {
      console.log('Using local config (server unavailable)');
    }

    // โหลดจำนวนคงเหลือจริงจาก server (แทนที่ค่า quantity เริ่มต้น)
    try {
      const remaining = await getRemainingPrizes();
      if (remaining) {
        // อัปเดต state.prizesRemaining ด้วยข้อมูลจริงจาก Sheets
        WHEEL_CONFIG.prizes.forEach(p => {
          if (remaining[p.id] !== undefined) {
            state.prizesRemaining[p.id] = remaining[p.id];
          }
        });
      }
    } catch (e) {
      console.log('Using local prize quantities (server unavailable)');
    }
  }
```
Replace with:
```js
  async function loadConfig() {
    try {
      // โหลด config จาก server
      const config = await loadConfigFromServer();
      if (config) {
        Object.assign(WHEEL_CONFIG, config);
      }
    } catch (e) {
      console.log('Using local config (server unavailable)');
    }

    // โหลดจำนวนคงเหลือจริงจาก server (แทนที่ค่า quantity เริ่มต้น)
    try {
      const remaining = await getRemainingPrizes();
      if (remaining) {
        // อัปเดต state.prizesRemaining ด้วยข้อมูลจริงจาก Sheets
        WHEEL_CONFIG.prizes.forEach(p => {
          if (remaining[p.id] !== undefined) {
            state.prizesRemaining[p.id] = remaining[p.id];
          }
        });
      }
    } catch (e) {
      console.log('Using local prize quantities (server unavailable)');
    }

    await preloadPrizeImages();
  }

  // โหลดรูปของรางวัล (ถ้ามี) เข้า cache ก่อนวาดวงล้อครั้งแรก
  // จำกัดเวลารอไว้กันรูปโหลดช้า/พังบล็อกหน้าเว็บ — ถ้าไม่ทันก็ fallback เป็น emoji
  function preloadPrizeImages() {
    const loads = (WHEEL_CONFIG.prizes || [])
      .filter(p => p.imagePath)
      .map(p => new Promise(resolve => {
        const url = supabase.storage.from('prize-images').getPublicUrl(p.imagePath).data.publicUrl;
        const img = new Image();
        img.onload = () => { prizeImages[p.id] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = url;
      }));
    if (loads.length === 0) return Promise.resolve();
    return Promise.race([Promise.all(loads), new Promise(resolve => setTimeout(resolve, 1500))]);
  }
```

- [ ] **Step 3: Draw the image (clipped to a circle) instead of the emoji when available**

Find (script.js:500-503):
```js
      // Icon
      const iconFont = `${cfg.fontSize + 2}px serif`;
      ctx.font = iconFont;
      ctx.fillText(seg.icon, textR + 4, 4);
```
Replace with:
```js
      // Icon (photo if the prize has one, emoji otherwise)
      const prizeImg = prizeImages[seg.id];
      if (prizeImg) {
        const size = cfg.fontSize + 10;
        ctx.save();
        ctx.beginPath();
        ctx.arc(textR + 4, 4, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(prizeImg, textR + 4 - size / 2, 4 - size / 2, size, size);
        ctx.restore();
      } else {
        const iconFont = `${cfg.fontSize + 2}px serif`;
        ctx.font = iconFont;
        ctx.fillText(seg.icon, textR + 4, 4);
      }
```

- [ ] **Step 4: Show the image (or emoji) in the result popup**

Find (script.js:670-677):
```js
  function showResult(prize) {
    dom.resultWonView.style.display = '';
    dom.resultSoldoutView.style.display = 'none';
    dom.resultIcon.textContent = prize.icon;
    dom.resultName.textContent = prize.label;
    showPage('result');
    launchConfetti();
  }
```
Replace with:
```js
  function showResult(prize) {
    dom.resultWonView.style.display = '';
    dom.resultSoldoutView.style.display = 'none';

    const prizeImg = prizeImages[prize.id];
    if (prizeImg) {
      dom.resultIcon.textContent = '';
      const imgEl = document.createElement('img');
      imgEl.src = prizeImg.src;
      imgEl.alt = prize.label;
      imgEl.className = 'result-icon-image';
      dom.resultIcon.appendChild(imgEl);
    } else {
      dom.resultIcon.textContent = prize.icon;
    }

    dom.resultName.textContent = prize.label;
    showPage('result');
    launchConfetti();
  }
```

- [ ] **Step 5: Add the `.result-icon-image` CSS rule**

Find (style.css:344-350):
```css
/* ---------- Result Section ---------- */
.result-icon {
  font-size: 72px;
  text-align: center;
  margin: 0 0 16px;
  animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```
Replace with:
```css
/* ---------- Result Section ---------- */
.result-icon {
  font-size: 72px;
  text-align: center;
  margin: 0 0 16px;
  animation: bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.result-icon-image {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
  margin: 0 auto;
}
```

- [ ] **Step 6: Manually verify in browser**

Using the local server, first go through Task 4's admin flow to upload an image for one prize in a test event, and leave at least one other prize with no image. Then open `index.html?event=<that test event's slug>`:
1. Confirm the prize with an image shows the photo (clipped to a circle) on its wheel segment, and prizes without images still show their emoji exactly as before.
2. Spin (or use dev tools to force-land on the prize with an image, if the wheel doesn't land there naturally within a few spins) until you land on the prize with an image — confirm the result popup shows the photo, not the emoji.
3. Land on a prize with no image — confirm the result popup shows the emoji exactly as before.
4. Refresh the page a few times to confirm the preload doesn't introduce a visible delay or a broken/missing wheel on normal network conditions.

- [ ] **Step 7: Run the full JS test suite to confirm nothing else broke**

Run: `node --test js/*.test.js`
Expected: all tests pass (28 pre-existing + 6 new from Task 3 = 34).

- [ ] **Step 8: Commit**

```bash
git add script.js style.css
git commit -m "feat: show prize photos on the wheel and result popup, falling back to emoji"
```

---

### Task 7: Push to both remotes

**Files:** none (git operations only)

**Interfaces:** None.

- [ ] **Step 1: Push to the production remote (`royaltec`)**

```bash
git push royaltec main
```

- [ ] **Step 2: Push to the personal backup remote (`origin`)**

Per project memory (`reference_github-repos-deployment`), pushing to `origin` (`warongkamol/game-event-main`) may require switching the active `gh` account first:
```bash
gh auth switch --hostname github.com --user warongkamol
git push origin main
```

- [ ] **Step 3: Verify the live site**

Visit `https://royaltec-international.github.io/game-event/index.html?event=temca-2026` (GitHub Pages takes roughly a minute to rebuild after a push) and confirm the brand checkbox layout fix is live. Prize images will only show once an admin uploads one for that event via Task 4's flow.
