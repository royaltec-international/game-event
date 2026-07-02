# Admin Mobile Responsiveness + Prize Image Upload Polish — Design

## Part 1 — Human-readable summary

### What is being built and why

Two independent polish changes to `admin.html`, the event-admin control panel:

1. **Mobile/tablet responsiveness.** The admin panel is used at events themselves, often from a phone or iPad while setting up prizes or checking registrations on the fly — not just from a desk. Today `admin.html` has almost no responsive treatment: a single `@media (max-width: 700px)` rule collapses the sidebar to an icon-only rail and drops the prize grid to 2 columns, but that's it. Two much bigger problems go unaddressed: the topbar (`admin.html:428-451`) packs an event `<select>` plus four action buttons plus a title block into one unwrapped flex row, which overflows horizontally on any phone-width screen; and two content grids (`.field-grid-4` at admin.html:333, 4 fixed columns; `.prize-grid` at admin.html:210, only gets to 2 columns) never collapse to something a narrow screen can actually use.

2. **Prize image upload button polish.** The per-prize image upload control added in the previous feature branch works, but looks unfinished: it uses the browser's unstyled native `<input type="file">` (a grey OS-chrome button + "No file chosen" text that doesn't match the app's dark/gold theme), and crams the thumbnail, file input, and "No file chosen" text into one cramped flex row next to a label that reads as equal-weight to every other field label on the card, when it's actually describing/qualifying the Emoji Icon field beside it.

### Key design decisions

**Nav pattern: hamburger + off-canvas drawer, not a bottom tab bar.** Three options were mocked and compared visually (bottom tab bar, hamburger drawer, and "keep the existing icon-rail, just fix the topbar"). The user picked the hamburger drawer for navigation specifically — it shows full menu labels (not just icons, which the current icon-rail limits to) — and separately picked the bottom-tab-bar concept's *topbar* treatment: keep every action button visible and wrapped, rather than hiding secondary actions behind a "⋯ more" menu. The two are combined: drawer for nav, all-buttons-visible for topbar. This existing `@media (max-width: 700px)` breakpoint is reused as the trigger for switching from the current desktop sidebar to the hamburger+drawer — it already exists, already fires at a sensible width, and this change repurposes what happens at that breakpoint rather than inventing a new one.

**Drawer interaction: click-to-navigate (matches existing desktop behavior, no new "save" step), plus two ways to close.** The user was explicit that clicking a nav item must switch panels immediately, the same as the existing desktop `nav-item` click handler already does (`admin.html:1064-1066` — no save/confirm step exists today and none should be added). What's new for the drawer is that after a nav-item click, the drawer must also auto-close. In addition, the user asked for swipe-left-to-close as a way to dismiss the drawer without picking a menu item. Tap-on-overlay-to-close is added alongside that as a standard complementary pattern (an open drawer over a dimmed backdrop that doesn't respond to a backdrop tap would be surprising) — this is the implementer's judgment call, not something the user asked for directly, and is called out here so it's not mistaken for a requirement they stated.

**Topbar: stack, don't hide.** Below 700px, the event `<select>` becomes full-width on its own row, and the four action buttons (+ Event ใหม่, ตั้งเป็น Event ปัจจุบัน, คัดลอกลิงก์, ลบ Event) wrap onto as many rows as needed beneath it, each button sized to its label rather than stretched. Nothing is removed or demoted into a secondary menu — every control a desktop admin has, a phone admin has too, just arranged vertically instead of horizontally.

**Grid breakpoints: two tiers, phone and tablet, reusing the existing 700px line as the tablet threshold.** `.field-grid-4` (currently 4 fixed columns: `2fr 2fr 1fr auto`) gets a tablet tier at ≤700px (2 columns) and a phone tier at ≤480px (1 column). `.prize-grid` already has a 700px→2-column rule from the previous branch; this adds a ≤480px→1-column tier on top of it. 480px is picked as the phone/tablet split because it comfortably covers the common phone width range (360-428px logical pixels on current iOS/Android devices) while leaving iPad's 768px+ portrait width untouched by the phone tier — an iPad in portrait mode never triggers the ≤480px rules and only lightly triggers the ≤700px tier's simpler adjustments (which mostly benefit it too, since 2-column grids give more breathing room than the current 4-column squeeze even on a tablet).

**Content padding shrinks on phone width only.** `.content { padding: 28px; }` (admin.html:108) eats 56px of horizontal space total before any content renders — on a 375px-wide phone with the 56px icon-rail-turned-drawer-toggle-bar still reserving space, that's a meaningful fraction of the viewport. A ≤480px rule drops it to 14px per side. The 700px tablet tier keeps the existing 28px padding, since tablets have room to spare.

**Prize image upload: custom-styled trigger + separated layout, not a full redesign.** The native `<input type="file">` is visually hidden (kept functional and accessible via a `<label for="...">` wired to it — a well-established zero-JS pattern for restyling file inputs) and replaced on-screen with a `.btn`-styled trigger button reading "📷 เลือกรูป", matching the visual language of every other button in this app (`.btn-outline` style: transparent background, `var(--border)` border, hover state that switches to `var(--accent)` gold). Next to/below it, a small `<span>` shows the selected filename (or a "ยังไม่ได้เลือกไฟล์" default) — a JS-driven replacement for the browser's own "No file chosen" text, so it can be styled and put on its own line as requested. The field gets a two-tier label: a normal-weight primary label ("รูปของรางวัล") plus a smaller, dimmer caption line beneath it ("ถ้ามี จะใช้แทน Emoji Icon ด้านล่าง") using the same visual pattern as `.topbar-sub`/`.section-desc` elsewhere in this file (`font-size: 12px; color: var(--text-muted)`) — establishing that this field is a modifier/qualifier of the Emoji Icon field next to it, not a standalone equal-weight field. The thumbnail (when an image exists) moves to its own row above the button row, rather than sharing a row with the file input.

### Architecture overview

Everything in this design is CSS + a handful of small DOM/JS changes inside the single existing `admin.html` file — no new files, no new dependencies, no backend/schema changes. Three independent concerns:

1. A `<div class="sidebar-overlay">` and a small drawer-open/close JS state (a class toggle on `.sidebar`, e.g. `.sidebar.open`) plus a hamburger `<button>` in a new mobile-only topbar-left element, all gated behind the existing 700px breakpoint via CSS (desktop keeps rendering the sidebar as always-visible with no overlay/hamburger, since those elements are `display:none` above 700px).
2. New/extended `@media` blocks for `.field-grid-4`, `.prize-grid`, `.content`, and `.topbar-left` (stacking).
3. A restructured prize-card image field block (HTML template change in `renderPrizes()`) plus one small JS helper to reflect the chosen filename into the new custom label span, hooked into the existing `handlePrizeImageSelect` flow (no change to the actual upload/resize logic from the previous branch — this is presentation-only).

### Constraints and non-obvious trade-offs

- Swipe-to-close needs a touch gesture listener (`touchstart`/`touchmove`/`touchend` on the drawer element, tracking horizontal delta, closing past a threshold e.g. 60-80px of leftward movement) — this is the one genuinely new interaction pattern in this change; everything else is CSS/layout. No gesture library is pulled in; this app has zero dependencies beyond the Supabase SDK and a CDN font, and a threshold-based touch listener is ~15 lines of vanilla JS, consistent with the rest of the codebase's style.
- The existing 700px breakpoint currently also drives the icon-only sidebar collapse (`admin.html:307-310`). This design's hamburger+drawer replaces that behavior at the same breakpoint rather than adding a third state — a screen is either "desktop: full sidebar always visible" (>700px) or "mobile: hamburger toggles a full drawer" (≤700px). The old icon-rail-only mid-state is removed, not kept as a third tier, since the user's approved mockup explicitly showed drawer replacing the rail, not supplementing it.
- No visual regression testing tooling exists in this project (no Playwright/screenshot diffing) — verification for this branch is manual, in a real browser at a few widths (375px phone, 768px iPad portrait, desktop), consistent with how the rest of this codebase's UI changes have been verified so far.

### What is explicitly out of scope

- Any change to the *public* game page (`index.html`/`script.js`/`style.css`) — it already has its own responsive breakpoints from before this project and isn't touched here.
- Redesigning the registrations table's mobile behavior — it already wraps in `overflow-x:auto` (`admin.html:473`), which is a working (if not ideal) pattern, and the user didn't flag it as broken.
- Any change to the prize image upload/resize/Storage logic itself (`handlePrizeImageSelect`, `uploadPrizeImage`, `removePrizeImage`) — this is presentation-only polish around already-working functionality from the previous branch.
- A general design-system pass (e.g., extracting `.btn-file` as a reusable utility beyond this one field) — YAGNI; this app has exactly one file-upload field today.

---

## Part 2 — Implementation tasks

### Task 1: Mobile nav — hamburger button + off-canvas drawer

**Files:**
- Modify: `admin.html` (CSS in the `<style>` block, `<body>` markup, inline `<script>` block)

**What to build:**

1. Add a hamburger toggle button and mobile-only title bar, shown only ≤700px, placed as the first element inside `.main` (before `.topbar`):
```html
<div class="mobile-topbar">
  <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="เปิดเมนู">☰</button>
  <span class="mobile-topbar-title">⚙️ Config</span>
</div>
```
2. Add a `.sidebar-overlay` element (click-to-close backdrop), placed right after `.sidebar` closes:
```html
<div class="sidebar-overlay" onclick="closeSidebar()"></div>
```
3. CSS: `.mobile-topbar` and `.sidebar-overlay` are `display: none` by default (desktop). Inside the existing `@media (max-width: 700px)` block:
   - `.mobile-topbar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }`
   - `.sidebar { transform: translateX(-100%); transition: transform 0.25s ease; width: 240px; }` (drawer starts off-screen; width restored to something readable, replacing the old 56px icon-rail rule — remove that rule and the `.sidebar-logo h1, .sidebar-logo span, .nav-item span { display: none; }` rule, since labels are wanted, not hidden)
   - `.sidebar.open { transform: translateX(0); box-shadow: 8px 0 24px rgba(0,0,0,0.5); }`
   - `.sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }` — but only actually shown when open: `.sidebar-overlay.visible { display: block; }`
   - `.main { margin-left: 0; }` (drawer overlays instead of pushing content, replacing the old `margin-left: 56px` rule)
4. JS: add `toggleSidebar()`, `closeSidebar()`, and wire nav-item clicks to close the drawer after switching panels:
```js
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('visible');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('visible');
}
```
Find the existing nav-item click handler (`admin.html:1064-1066`, inside a `.forEach` over `.nav-item`) and add a call to `closeSidebar()` at the end of that click handler, so selecting a panel from the drawer both switches panels (existing behavior, unchanged) and closes the drawer (new).

5. JS: swipe-left-to-close gesture on `.sidebar`:
```js
(function () {
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

**Acceptance criteria:** At ≤700px viewport width, the sidebar starts hidden off-screen; tapping the hamburger button slides it in from the left with visible labels (not icon-only) and dims the rest of the page; tapping a nav item switches the active panel (as it already does today) and closes the drawer; tapping the dimmed overlay closes the drawer without changing panels; a left swipe on the open drawer closes it. Above 700px, none of this is visible — the sidebar renders exactly as it does today (always-visible, full-width, no hamburger, no overlay).

### Task 2: Topbar — stack on mobile, keep every button visible

**Files:**
- Modify: `admin.html` (CSS only, inside the existing `@media (max-width: 700px)` block)

**What to build:**

Inside the existing `@media (max-width: 700px)` block, add:
```css
.topbar { flex-direction: column; align-items: stretch; padding: 12px 16px; }
.topbar-left { flex-direction: column; align-items: stretch; gap: 8px; }
.topbar-left .form-group { min-width: 0; width: 100%; }
.topbar-left > button { width: auto; }
.topbar-actions { flex-wrap: wrap; margin-top: 8px; }
```
The existing HTML structure (`admin.html:428-451`) is unchanged — the event `<select>`'s `.form-group` wrapper already has `style="min-width:220px;"` inline, which the `width: 100%` rule above overrides at this breakpoint (CSS specificity: the media-query class selector `.topbar-left .form-group` beats the plain inline inheritance only because `min-width` and `width` are different properties — `min-width:220px` inline stays but no longer forces overflow once the parent is a full-width flex column). No inline `style` attributes need editing.

**Acceptance criteria:** At ≤700px, the event selector spans the full content width on its own row; the four action buttons (+ Event ใหม่, ตั้งเป็น Event ปัจจุบัน, คัดลอกลิงก์, ลบ Event) wrap onto subsequent rows, each sized to its own label (not stretched full-width, not clipped); nothing overflows the viewport horizontally; the sync indicator + refresh + save buttons in `.topbar-actions` wrap similarly beneath. Above 700px, the topbar renders exactly as today.

Depends on: Task 1 only for the shared breakpoint context (no code dependency — could be done in either order).

### Task 3: Responsive grids — `.field-grid-4`, `.prize-grid`, `.content` padding

**Files:**
- Modify: `admin.html` (CSS only)

**What to build:**

1. Add a phone tier inside the existing `@media (max-width: 700px)` block (this becomes the "tablet" tier for `.field-grid-4`, and confirms the existing 2-column rule stays for `.prize-grid`):
```css
.field-grid-4 { grid-template-columns: 1fr 1fr; }
```
2. Add a NEW `@media (max-width: 480px)` block (phone tier) with:
```css
@media (max-width: 480px) {
  .content { padding: 14px; }
  .field-grid-4 { grid-template-columns: 1fr; }
  .prize-grid { grid-template-columns: 1fr; }
}
```
Place this new block immediately after the existing `@media (max-width: 700px)` block (admin.html:306-312) so the cascade order is readable top-to-bottom: base styles → 700px tablet tier → 480px phone tier (later, narrower rule correctly overrides the wider one because it comes later in the file and both are equally-specific class selectors).

**Acceptance criteria:** At 768px (iPad portrait) and above, all grids render at their original column counts and `.content` keeps 28px padding. At 481-700px, `.field-grid-4` shows 2 columns, `.prize-grid` shows 2 columns (existing rule, unchanged), `.content` keeps 28px padding. At ≤480px, `.field-grid-4` and `.prize-grid` both show 1 column, `.content` padding drops to 14px. No form field or button is visually clipped or overlapping at any of these three widths.

Depends on: nothing (independent CSS-only task, but should land after Task 1 since Task 1 removes the old icon-rail width rules from the same `@media (max-width: 700px)` block — sequencing avoids two tasks editing the same block simultaneously and conflicting).

### Task 4: Prize image upload — themed button + two-line layout

**Files:**
- Modify: `admin.html` (CSS in `<style>` block, HTML template inside `renderPrizes()`, small JS addition)

**What to build:**

1. CSS additions (near the existing `.prize-image-thumb` rule, admin.html:210-212):
```css
.prize-image-field-caption {
  font-size: 11px; color: var(--text-muted); display: block; margin: -2px 0 8px;
}
.btn-file-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 6px 12px; color: var(--text); font-size: 12px; font-family: var(--font);
  cursor: pointer; transition: border-color 0.18s, color 0.18s;
}
.btn-file-trigger:hover { border-color: var(--accent); color: var(--accent); }
.prize-image-filename {
  font-size: 11px; color: var(--text-muted); display: block; margin-top: 5px;
}
.prize-image-input-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```
2. Replace the existing image-field template block (`admin.html:1345-1356`, the `<div class="form-group" style="flex:0 0 140px;">...</div>` covering the label through the "ลบรูป" button) with:
```html
<div class="form-group" style="flex:0 0 160px;">
  <label>รูปของรางวัล</label>
  <span class="prize-image-field-caption">ถ้ามี จะใช้แทน Emoji Icon ด้านล่าง</span>

  ${p.imagePath
    ? `<div style="margin-bottom:8px;"><img src="${esc(supabase.storage.from(PRIZE_IMAGE_BUCKET).getPublicUrl(p.imagePath).data.publicUrl)}" class="prize-image-thumb" alt="" /></div>`
    : ''}

  <label class="btn-file-trigger" for="prize-image-input-${i}">📷 เลือกรูป</label>
  <input type="file" accept="image/*" id="prize-image-input-${i}" class="prize-image-input-hidden"
    onchange="handlePrizeImageSelect(${i}, this); document.getElementById('prize-image-filename-${i}').textContent = this.files[0] ? this.files[0].name : 'ยังไม่ได้เลือกไฟล์';" />
  <span class="prize-image-filename" id="prize-image-filename-${i}">ยังไม่ได้เลือกไฟล์</span>

  ${p.imagePath ? `<div><button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="removePrizeImage(${i})">ลบรูป</button></div>` : ''}
</div>
```
This keeps every existing function call (`handlePrizeImageSelect(${i}, this)`, `removePrizeImage(${i})`) and every existing data attribute (`PRIZE_IMAGE_BUCKET`, `p.imagePath`, `esc(...)`) unchanged from the previous branch — only the surrounding markup/CSS classes change. The one new piece of behavior is the inline filename-reflection (`document.getElementById(...).textContent = ...`) appended to the existing `onchange` handler, added directly in the template rather than as a separate function since it's a single DOM write with no reusable logic.

**Acceptance criteria:** The file input itself is visually hidden but still keyboard/screen-reader accessible via the `<label for="...">` association (clicking or focusing+entering on the "📷 เลือกรูป" label opens the native file picker, exactly as clicking a native file input would). The trigger button matches the visual style of other `.btn-outline`-style buttons in the app (transparent background, border color shifts to gold on hover). Selecting a file updates the filename span from "ยังไม่ได้เลือกไฟล์" to the chosen file's name. The thumbnail (when present) appears on its own row above the button row. The caption text under the main label is visibly smaller and dimmer than the label itself. No change to upload/resize/remove behavior — `handlePrizeImageSelect`/`uploadPrizeImage`/`removePrizeImage` are called exactly as before.

Depends on: nothing from Tasks 1-3 (independent CSS/template region of the same file) — can be implemented in any order relative to them, though touching the same file means these tasks should not run as literally concurrent edits (sequential implementation avoids merge conflicts within one file).

### Cross-task notes

- All four tasks modify only `admin.html`. Because they touch different, well-separated regions of the file (sidebar/topbar CSS+JS vs. grid CSS vs. one prize-card template block), they're logically independent, but should still be implemented and committed sequentially (not as parallel subagent dispatches) to avoid one task's diff clobbering another's due to shared file context — consistent with how the previous feature branch on this codebase was executed.
- After implementation, manually verify at three widths in a real browser: ~375px (phone), ~768px (iPad portrait), and desktop (>700px) — this project has no automated visual regression tooling.
- After implementation, push to both remotes per the existing dual-repo workflow (`origin` = personal backup, `royaltec` = production via GitHub Pages) — see project memory `reference_github-repos-deployment`.
