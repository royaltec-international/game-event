# Admin Mobile Responsiveness + Prize Upload Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin panel (`admin.html`) usable on phones and tablets — a hamburger-triggered off-canvas nav drawer replaces the current icon-only sidebar collapse, the topbar stacks instead of overflowing, and two fixed-column grids collapse to fewer columns — and restyle the prize-image upload control so it matches the app's theme and reads as a clear, tidy sub-field of the Emoji Icon field next to it.

**Architecture:** Everything is CSS + small DOM/JS additions inside the single existing `admin.html` file — no new files, no dependencies, no schema/backend changes. Four independent regions of the file are touched: sidebar/topbar markup+CSS+JS (nav drawer), topbar CSS only (stacking), grid CSS only (breakpoints), and one prize-card template block (image upload control).

**Tech Stack:** Vanilla JS (no framework, no bundler), plain CSS (`@media` queries, CSS custom properties already defined in `:root`), no test framework changes needed (all four tasks are DOM/CSS/browser-only, consistent with how the rest of `admin.html`'s UI has been built and verified in this project).

## Global Constraints

- No new files — every change lands inside `admin.html`.
- No change to any existing JS function's behavior/signature: `handlePrizeImageSelect(i, inputEl)`, `uploadPrizeImage(i, blob)`, `removePrizeImage(i)`, `setPrize(i, key, val)`, the `nav-item` click handler's panel-switching logic — all keep doing exactly what they do today; this plan only adds new surrounding code/markup/CSS.
- The existing `@media (max-width: 700px)` block (admin.html:306-312) is the single breakpoint for "mobile mode" (hamburger+drawer, topbar stacking, 2-column grids). A new `@media (max-width: 480px)` block is the phone-specific tier (1-column grids, reduced content padding). Nothing new is introduced at any other width.
- No gesture library — the swipe-to-close listener is vanilla `touchstart`/`touchend`, consistent with this codebase having zero dependencies beyond the Supabase JS SDK and a CDN font.
- Reuse existing `.btn`, `.btn-outline`, `.btn-sm` classes for the new file-picker trigger button rather than inventing a near-duplicate class — this guarantees exact visual parity with every other button in the app and is more DRY than the spec's originally-sketched `.btn-file-trigger` class (a deliberate simplification made while writing this plan; the resulting button is visually and functionally identical to what the approved mockup showed).
- Desktop (>700px) must render pixel-identical to today after this branch — every new rule in this plan is scoped inside a `@media` query or a `display:none`-by-default rule that a `@media` query overrides, never a bare unscoped rule.

---

### Task 1: Mobile nav — hamburger button + off-canvas drawer

**Files:**
- Modify: `admin.html:41-50` (`.sidebar` CSS)
- Modify: `admin.html:78` (`.main` CSS)
- Modify: `admin.html:306-312` (existing `@media (max-width: 700px)` block — rewritten, not appended to)
- Modify: `admin.html:393-423` (sidebar markup — add overlay element after `</nav>`)
- Modify: `admin.html:425-426` (add mobile topbar markup before `.topbar`)
- Modify: `admin.html:1063-1084` (`setupNav()` — add drawer-close call)
- Modify: `admin.html` (add new `toggleSidebar()`, `closeSidebar()`, and swipe-listener functions near `setupNav()`)

**Interfaces:**
- Produces: `toggleSidebar(): void`, `closeSidebar(): void` — global functions (matching every other handler in this file, e.g. `removePrize`, `setPrizeColor`), called from a new `onclick` in the template and consumed internally by the swipe listener.
- Consumes: nothing from other tasks. Tasks 2, 3, and 4 don't depend on this task's functions, only on the same `@media (max-width: 700px)` block existing in a known state (see Task 3's dependency note).

- [ ] **Step 1: Add the mobile-only hamburger topbar and sidebar overlay markup**

Find (admin.html:423-426):
```html
  </nav>

  <!-- ═══ MAIN ═══ -->
  <div class="main">
```
Replace with:
```html
  </nav>

  <div class="sidebar-overlay" onclick="closeSidebar()"></div>

  <!-- ═══ MAIN ═══ -->
  <div class="main">
    <div class="mobile-topbar">
      <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="เปิดเมนู">☰</button>
      <span class="mobile-topbar-title">⚙️ Config</span>
    </div>
```

- [ ] **Step 2: Add CSS for the hamburger bar and overlay (hidden by default, desktop unaffected)**

Find (admin.html:75-78):
```css
    .sidebar-footer { padding: 14px 12px; border-top: 1px solid var(--border); }

    /* ─── Main ─── */
    .main { margin-left: 220px; flex: 1; display: flex; flex-direction: column; }
```
Replace with:
```css
    .sidebar-footer { padding: 14px 12px; border-top: 1px solid var(--border); }

    /* ─── Mobile hamburger bar + overlay (hidden on desktop) ─── */
    .mobile-topbar { display: none; }
    .hamburger-btn {
      background: none; border: none; color: var(--text); font-size: 20px;
      cursor: pointer; padding: 4px 8px; line-height: 1;
    }
    .mobile-topbar-title { font-size: 15px; font-weight: 700; color: var(--accent); }
    .sidebar-overlay { display: none; }

    /* ─── Main ─── */
    .main { margin-left: 220px; flex: 1; display: flex; flex-direction: column; }
```

- [ ] **Step 3: Rewrite the existing mobile breakpoint block to use the drawer instead of the icon-rail**

Find (admin.html:306-312):
```css
    @media (max-width: 700px) {
      .sidebar { width: 56px; }
      .sidebar-logo h1, .sidebar-logo span, .nav-item span { display: none; }
      .nav-item { justify-content: center; padding: 10px; }
      .main { margin-left: 56px; }
      .prize-grid { grid-template-columns: 1fr 1fr; }
    }
```
Replace with:
```css
    @media (max-width: 700px) {
      .sidebar {
        width: 240px;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }
      .sidebar.open { transform: translateX(0); box-shadow: 8px 0 24px rgba(0,0,0,0.5); }
      .main { margin-left: 0; }
      .mobile-topbar {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border);
      }
      .sidebar-overlay.visible {
        display: block; position: fixed; inset: 0;
        background: rgba(0,0,0,0.5); z-index: 90;
      }
      .prize-grid { grid-template-columns: 1fr 1fr; }
    }
```
(This removes the old icon-only-rail rules — `.sidebar { width: 56px }`, hiding labels, centering nav items, `.main { margin-left: 56px }` — entirely, replacing them with the drawer's off-screen/on-screen transform. `.prize-grid`'s 2-column rule is kept as-is; Task 3 adds to it further down at a narrower breakpoint.)

- [ ] **Step 4: Add `toggleSidebar()`, `closeSidebar()`, and the swipe-to-close listener**

Find `setupNav()` (admin.html:1063):
```js
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pid = btn.dataset.panel;
      document.getElementById('panel-' + pid).classList.add('active');
      
      const titles = {
        prizes:  { title: '🎁 ของรางวัล',      sub: 'จัดการของรางวัล + ดูจำนวนคงเหลือแบบ real-time' },
        general: { title: '🔧 ตั้งค่าทั่วไป',   sub: 'URLs, Logo และ Animation' },
        form:    { title: '📋 หน้าลงทะเบียน', sub: 'Fields, แบรนด์, PDPA — ปรับแต่งฟอร์มลงทะเบียน' },
        registrations: { title: 'รายชื่อผู้ลงทะเบียน', sub: 'ดูแบบ real-time, filter, export, ลบ' },
      };
      // Render form panel on first open
      if (pid === 'form') renderFormPanel();
      if (pid === 'registrations') loadRegistrations();
      document.getElementById('panel-title').textContent = titles[pid]?.title || '';
      document.getElementById('panel-sub').textContent = titles[pid]?.sub || '';
    });
  });
```
Replace with (adds one line — `closeSidebar();` — at the end of the click handler, nothing else in this block changes):
```js
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const pid = btn.dataset.panel;
      document.getElementById('panel-' + pid).classList.add('active');
      
      const titles = {
        prizes:  { title: '🎁 ของรางวัล',      sub: 'จัดการของรางวัล + ดูจำนวนคงเหลือแบบ real-time' },
        general: { title: '🔧 ตั้งค่าทั่วไป',   sub: 'URLs, Logo และ Animation' },
        form:    { title: '📋 หน้าลงทะเบียน', sub: 'Fields, แบรนด์, PDPA — ปรับแต่งฟอร์มลงทะเบียน' },
        registrations: { title: 'รายชื่อผู้ลงทะเบียน', sub: 'ดูแบบ real-time, filter, export, ลบ' },
      };
      // Render form panel on first open
      if (pid === 'form') renderFormPanel();
      if (pid === 'registrations') loadRegistrations();
      document.getElementById('panel-title').textContent = titles[pid]?.title || '';
      document.getElementById('panel-sub').textContent = titles[pid]?.sub || '';
      closeSidebar();
    });
  });
```

Directly above `function setupNav() {`, add:
```js
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('visible');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('visible');
}

(function setupSidebarSwipeClose() {
  const sidebar = document.querySelector('.sidebar');
  let touchStartX = null;
  sidebar.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX < -70) closeSidebar();
    touchStartX = null;
  }, { passive: true });
})();

```

- [ ] **Step 5: Manually verify in browser**

Serve the repo locally from the repo root (`npx serve .` or `python3 -m http.server 8000`), open `admin.html`, log in.
1. Resize the browser window (or use dev tools' device toolbar) to 375px wide. Confirm: the sidebar is not visible by default; a "☰ ⚙️ Config" bar appears at the top; the old icon-only rail is gone.
2. Tap/click the ☰ button — confirm the sidebar slides in from the left showing full labels (🎁 ของรางวัล, 🔧 ตั้งค่าทั่วไป, etc., not icon-only), and the rest of the page dims behind it.
3. Click a nav item (e.g. "ตั้งค่าทั่วไป") — confirm the panel switches (as it already did before this change) AND the drawer closes automatically.
4. Reopen the drawer, click the dimmed overlay area (not a nav item) — confirm the drawer closes without changing the active panel.
5. Reopen the drawer, use dev tools' touch-emulation (or a real touchscreen) to swipe left across the drawer — confirm it closes.
6. Resize back to >700px wide — confirm the sidebar renders exactly as it did before this branch: always visible, full width, no hamburger bar, no overlay.

- [ ] **Step 6: Commit**

```bash
git add admin.html
git commit -m "feat: replace icon-only mobile sidebar with hamburger + off-canvas drawer"
```

---

### Task 2: Topbar — stack on mobile, keep every button visible

**Files:**
- Modify: `admin.html:306-...` (the `@media (max-width: 700px)` block Task 1 already rewrote — this task appends more rules to the same block)

**Interfaces:**
- Consumes: the `@media (max-width: 700px)` block from Task 1 (must be implemented first — see dependency note below).
- Produces: nothing new for later tasks — this is CSS-only, additive to the same media block.

- [ ] **Step 1: Add topbar-stacking rules to the mobile media block**

This task must run after Task 1, since both edit the same `@media (max-width: 700px)` block. Find the block as Task 1 left it:
```css
    @media (max-width: 700px) {
      .sidebar {
        width: 240px;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }
      .sidebar.open { transform: translateX(0); box-shadow: 8px 0 24px rgba(0,0,0,0.5); }
      .main { margin-left: 0; }
      .mobile-topbar {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border);
      }
      .sidebar-overlay.visible {
        display: block; position: fixed; inset: 0;
        background: rgba(0,0,0,0.5); z-index: 90;
      }
      .prize-grid { grid-template-columns: 1fr 1fr; }
    }
```
Replace with (adds 5 new lines before the closing `}`, nothing else changes):
```css
    @media (max-width: 700px) {
      .sidebar {
        width: 240px;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
      }
      .sidebar.open { transform: translateX(0); box-shadow: 8px 0 24px rgba(0,0,0,0.5); }
      .main { margin-left: 0; }
      .mobile-topbar {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border);
      }
      .sidebar-overlay.visible {
        display: block; position: fixed; inset: 0;
        background: rgba(0,0,0,0.5); z-index: 90;
      }
      .prize-grid { grid-template-columns: 1fr 1fr; }
      .topbar { flex-direction: column; align-items: stretch; padding: 12px 16px; }
      .topbar-left { flex-direction: column; align-items: stretch; gap: 8px; }
      .topbar-left .form-group { min-width: 0; width: 100%; }
      .topbar-left > button { width: auto; align-self: flex-start; }
      .topbar-actions { flex-wrap: wrap; margin-top: 8px; }
    }
```

No HTML changes — the existing topbar markup (admin.html:428-451, the event `<select>`, the 4 action buttons, `.topbar-actions`) is untouched; only its layout direction changes at this breakpoint.

- [ ] **Step 2: Manually verify in browser**

At 375px width (same local server as Task 1):
1. Confirm the event `<select>` spans the full content width on its own row.
2. Confirm the 4 buttons (+ Event ใหม่, ตั้งเป็น Event ปัจจุบัน, คัดลอกลิงก์, ลบ Event) appear on their own row(s) below the selector, each sized to its label (not stretched edge-to-edge, not clipped), wrapping onto additional rows as needed.
3. Confirm nothing in the topbar causes horizontal page scrolling.
4. Confirm the sync indicator + "🔄 รีเฟรช" + "💾 บันทึก" buttons in `.topbar-actions` wrap onto their own row(s) beneath, without overlapping other content.
5. Resize to >700px — confirm the topbar renders exactly as before this branch (single row, space-between layout).

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "fix: stack topbar controls on mobile instead of overflowing"
```

---

### Task 3: Responsive grids — `.field-grid-4`, `.prize-grid`, `.content` padding

**Files:**
- Modify: `admin.html:306-...` (append one rule to the existing `@media (max-width: 700px)` block, as left by Task 2)
- Modify: `admin.html` (add a new `@media (max-width: 480px)` block immediately after it)

**Interfaces:** None — pure CSS, no JS/data changes, no new selectors consumed elsewhere.

- [ ] **Step 1: Add the tablet-tier 2-column rule for `.field-grid-4`**

Find the block as Task 2 left it, specifically its last line before the closing brace:
```css
      .topbar-actions { flex-wrap: wrap; margin-top: 8px; }
    }
```
Replace with:
```css
      .topbar-actions { flex-wrap: wrap; margin-top: 8px; }
      .field-grid-4 { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 480px) {
      .content { padding: 14px; }
      .field-grid-4 { grid-template-columns: 1fr; }
      .prize-grid { grid-template-columns: 1fr; }
    }
```

- [ ] **Step 2: Manually verify in browser**

Using the same local server as Tasks 1-2, open the "หน้าลงทะเบียน" (form) panel, which uses `.field-grid-4` for its field editor cards, and the "ของรางวัล" (prizes) panel, which uses `.prize-grid`.
1. At 768px width (iPad portrait): confirm `.field-grid-4` shows its original 4 columns and `.content` keeps its original padding — this width is above both new breakpoints, nothing should change here.
2. At 600px width (in the 481-700px range): confirm `.field-grid-4` shows 2 columns, `.prize-grid` shows 2 columns (unchanged from before this task), `.content` padding is still the original (not yet reduced).
3. At 375px width: confirm `.field-grid-4` shows 1 column, `.prize-grid` shows 1 column, and `.content`'s padding is visibly tighter (14px) than at wider widths.
4. At all three widths, confirm no form field, label, or button is clipped or overlapping another element.

- [ ] **Step 3: Commit**

```bash
git add admin.html
git commit -m "fix: collapse field-grid-4 and prize-grid to fewer columns on tablet/phone widths"
```

---

### Task 4: Prize image upload — themed button + two-line layout

**Files:**
- Modify: `admin.html:210-213` (add 3 new CSS rules near the existing `.prize-image-thumb` rule)
- Modify: `admin.html:1345-1356` (prize-card image-upload template block)

**Interfaces:**
- Consumes: existing `esc(s)` (admin.html:1560), existing `supabase` global client, existing `PRIZE_IMAGE_BUCKET` constant, existing `handlePrizeImageSelect(i, inputEl)`/`removePrizeImage(i)` functions — all unchanged, called exactly as before.
- Produces: no new global functions. The one new piece of behavior (updating the filename span) is inlined directly in the template's `onchange` attribute rather than as a separate named function, since it's a single DOM write with no logic to reuse elsewhere.

- [ ] **Step 1: Add the new CSS rules**

Find (admin.html:210-213):
```css
    .prize-image-thumb {
      width: 48px; height: 48px; border-radius: 50%;
      object-fit: cover; border: 1px solid var(--border);
    }
```
Replace with:
```css
    .prize-image-thumb {
      width: 48px; height: 48px; border-radius: 50%;
      object-fit: cover; border: 1px solid var(--border);
    }

    .prize-image-field-caption {
      font-size: 11px; color: var(--text-muted); display: block; margin: -2px 0 8px;
    }
    .prize-image-filename {
      font-size: 11px; color: var(--text-muted); display: block; margin-top: 5px;
    }
    .prize-image-input-hidden {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
```

- [ ] **Step 2: Replace the prize-card image-upload template block**

Find (admin.html:1345-1356):
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
```
Replace with:
```html
      <div style="display:flex;gap:12px;margin-top:12px;align-items:end;flex-wrap:wrap;">
        <div class="form-group" style="flex:0 0 160px;">
          <label>รูปของรางวัล</label>
          <span class="prize-image-field-caption">ถ้ามี จะใช้แทน Emoji Icon ด้านล่าง</span>

          ${p.imagePath
            ? `<div style="margin-bottom:8px;"><img src="${esc(supabase.storage.from(PRIZE_IMAGE_BUCKET).getPublicUrl(p.imagePath).data.publicUrl)}" class="prize-image-thumb" alt="" /></div>`
            : ''}

          <label class="btn btn-outline btn-sm" for="prize-image-input-${i}">📷 เลือกรูป</label>
          <input type="file" accept="image/*" id="prize-image-input-${i}" class="prize-image-input-hidden"
            onchange="handlePrizeImageSelect(${i}, this); document.getElementById('prize-image-filename-${i}').textContent = this.files[0] ? this.files[0].name : 'ยังไม่ได้เลือกไฟล์';" />
          <span class="prize-image-filename" id="prize-image-filename-${i}">ยังไม่ได้เลือกไฟล์</span>

          ${p.imagePath ? `<div><button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="removePrizeImage(${i})">ลบรูป</button></div>` : ''}
        </div>
        <div class="form-group" style="flex:0 0 90px;">
```
(The `<div class="form-group" style="flex:0 0 90px;">` line at the end is the start of the next field, "Emoji Icon" — included here only to anchor the replacement; its own content below is unchanged.)

- [ ] **Step 3: Manually verify in browser**

Using the same local server, open the "ของรางวัล" panel, log in as needed.
1. Confirm the field shows: a normal-weight "รูปของรางวัล" label, then a visibly smaller/dimmer caption line "ถ้ามี จะใช้แทน Emoji Icon ด้านล่าง" directly beneath it.
2. Confirm the "📷 เลือกรูป" trigger visually matches other outline buttons in the app (transparent background, border that turns gold on hover) — it should be indistinguishable in style from the existing "ลบรูป" button already on the same card.
3. Confirm the native file input itself is not visible anywhere on the page (no grey OS-style button, no "No file chosen" text).
4. Click "📷 เลือกรูป" — confirm the native file picker opens (proving the hidden input still receives the click via the `label for=...` association).
5. Select an image file — confirm: (a) the filename span below the button updates from "ยังไม่ได้เลือกไฟล์" to the chosen file's name, and (b) the existing upload flow still runs (a toast appears, and after it completes, the thumbnail appears above the button on its own row — confirm the thumbnail is NOT sharing a row with the button/filename text).
6. For a prize that already has an image, confirm "ลบรูป" still works exactly as before (removes the Storage object, clears `imagePath`, thumbnail disappears) — this task didn't touch that function, only its template/CSS wrapper.

- [ ] **Step 4: Commit**

```bash
git add admin.html
git commit -m "fix: theme the prize image upload button and clean up its layout"
```

---

### Cross-task notes

- Tasks 1, 2, and 3 edit the same `@media (max-width: 700px)` block in sequence (each leaves it in a known state for the next) — they must be implemented in order 1 → 2 → 3, not in parallel, and not out of order.
- Task 4 is fully independent of Tasks 1-3 (different region of the file: prize-card template + a different CSS block) and could be done before, after, or interleaved with them — but since all four tasks modify the same single file (`admin.html`), commits should still land one task at a time (sequential subagent dispatch, not parallel) to avoid one task's diff conflicting with another's mid-flight.
- After all four tasks, do one final combined manual pass at 375px, 600px, 768px, and desktop widths together (rather than re-testing each task in isolation) to catch any interaction between the drawer, stacked topbar, collapsed grids, and the restyled upload field on the same screen at once.
- After implementation, push to both remotes per the existing dual-repo workflow (`origin` = personal backup, `royaltec` = production via GitHub Pages) — see project memory `reference_github-repos-deployment`.
