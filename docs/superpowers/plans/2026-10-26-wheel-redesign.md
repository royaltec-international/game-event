# Wheel redesign — RTI glass wheel, line icons, auto layout (2026-10-26)

## Part 1 — Summary

The spin wheel on the game page looks like an old Flash game: every prize has its own saturated
colour picked in admin, emoji icons, a gold star hub and a heavy drop-shadowed label. The owner
wants an Apple-like look. After comparing mockups (minimal / liquid glass / RTI brand, then brand
themes, then glass strength, then icon layouts) the owner chose:

- **RTI colours only, no theme picker.** Slice colours are generated, never chosen per prize: a
  fixed ramp of 12 distinct RTI blues from navy `#0f2a3d` through brand `#2c77a8` to `#e8f1f8`.
  For *n* prizes, *n* shades are spread evenly over the ramp and then **interleaved dark/light**
  (`picked[0], picked[h], picked[1], picked[h+1] …`, `h = ceil(n/2)`) so neighbours always contrast.
  Above 12 prizes shades repeat but neighbours still differ. Text/icon colour per slice is whichever
  of `#ffffff` / `#13212b` has the higher WCAG contrast against that slice.
- **"Light glass" finish.** Opaque slices (readable), a frosted glass rim around the wheel, a glass
  hub with "หมุน", a soft top gloss highlight, a gold pointer with a white highlight, a solid brand
  spin button with a subtle sheen. No translucent slices (owner rejected "full glass": hard to read,
  heavy on old phones).
- **Line icons instead of emoji.** Lucide icons (ISC licence, v0.460.0), a curated 24-icon subset
  already vendored at `assets/icons/lucide-subset-0.460.0.json` (`{name: innerSvgMarkup}`), stroked
  in the slice's ink colour. Lucide has no teddy bear; `smile` stands in.
- **Layout chosen automatically by prize count:**
  `1–8 → 'stack'` (icon above label, upright relative to the rim — the slice under the pointer
  reads straight), `9–12 → 'radial-icon'` (icon near the rim, label along the radius — long Thai
  names fit), `13–16 → 'radial-text'` (no icon, smaller label). **Max 16 prizes** per event
  (admin enforces; owner wants more than 12 eventually, 16 is the legibility limit at 380px).
- Prize **photos** (uploaded in admin) stay on the result page only; the wheel always uses icons.
  The result page shows the photo if present, else the prize's icon large (no emoji).

Architecture: the wheel stays a `<canvas>` drawn by `drawWheel()` in `script.js`, so the existing
spin maths (`handleSpin`: segment *i* starts at `rotation + i·arc`, pointer at the top,
`baseTarget = -π/2 - i·arc - arc/2`) and `spinAnimate` stay untouched. New pure helpers live in
`js/` with `node --test` tests, like the existing ones. Icons are drawn by turning each icon's SVG
(with a stroke colour) into a data-URL `Image`, preloaded once per (icon, colour) pair; the glass
rim, gloss, hub and pointer are DOM/CSS layers around the canvas.

Data: prizes in `events.config.prizes` (jsonb) gain an optional `iconName` (a key of the icon
subset). `color`, `textColor` and emoji `icon` stay in old configs but are ignored by the wheel.
Prizes without `iconName` map their legacy emoji through a small table (🎁→gift, ☂/⛱→umbrella,
🛍→shopping-bag, 💼→briefcase, 🌀/🪭→fan, 📓/📒/📝→sticky-note, 🧮→calculator, 📱→smartphone,
🧸→smile, ☕→coffee, 🥤→cup-soda, 🖊/✏→pen-line, 🎧→headphones, 👕→shirt, 🎒→backpack,
⌚→watch, 🏆→trophy, 🎫→ticket, 📦→package), else `gift`. No DB migration.

Out of scope: theme picker, more than 16 prizes, per-prize colours, admin wheel preview (admin has
none today), changes to the draw RPC or spin maths, header/page theme.

## Part 2 — Tasks

Shared rules for every task: repo `/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event`;
UI text Thai, code/comments English; match surrounding style; browser files are classic scripts
that also `module.exports` for node tests (see `js/followButtonLabel.js`); no network; do not touch
`supabase/`, `wheelConfig.js` RPC code, `handleSpin`/`spinAnimate` maths.

### Task 1 — Wheel palette + layout helpers
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `js/wheelTheme.js`, `js/wheelTheme.test.js`
- Do: export `RTI_WHEEL_SHADES` (12 hex, dark→light: interpolate `#0f2a3d`→`#2c77a8` for the first
  half and `#2c77a8`→`#e8f1f8` for the second, t = i/11), `MAX_PRIZES = 16`,
  `wheelPalette(n)` (spread n over the 12 by `round(i·11/(max(n,2)-1))` for n ≤ 12; for n > 12 cycle
  the 12; then interleave as in Part 1), `inkFor(bgHex)` (WCAG contrast pick of `#ffffff`/`#13212b`),
  `contrastRatio(a,b)`, `wheelLayout(n)` (`'stack'`|`'radial-icon'`|`'radial-text'` per Part 1).
- Accept: tests cover n = 1, 2, 6, 9, 12, 13, 16: length n; for n ≤ 12 all shades distinct; adjacent
  (incl. last→first, n ≥ 3) differ; every slice's ink contrast ≥ 4.5; layout boundaries 8/9, 12/13.
- **Verify:** `node --test js/`

### Task 2 — Icon set module
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `js/prizeIcons.js`, `js/prizeIcons.test.js`
- Do: generate `js/prizeIcons.js` from `assets/icons/lucide-subset-0.460.0.json` (embed the markup;
  header comment: "Lucide icons v0.460.0, ISC License, https://lucide.dev"). Export `PRIZE_ICONS`
  (name → inner markup), `PRIZE_ICON_LABELS` (name → short Thai label for the admin picker, e.g.
  umbrella "ร่ม", fan "พัดลม", smile "ตุ๊กตา/ของเล่น"), `iconNameFor(prize)` (valid `iconName`, else
  legacy emoji table from Part 1 — compare after stripping U+FE0F — else `'gift'`),
  `iconSvg(name, color, size)` (full `<svg xmlns viewBox="0 0 24 24" fill="none" stroke=color
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">…</svg>`, unknown name → gift),
  `iconDataUrl(name, color)` (`data:image/svg+xml;charset=utf-8,` + encodeURIComponent).
- Accept: tests for valid iconName, each legacy emoji (with and without U+FE0F), unknown → gift,
  iconSvg contains the colour and parses as one `<svg>` root, data URL prefix.
- **Verify:** `node --test js/`

### Task 3 — New wheel rendering + glass frame + result icon
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `script.js`, `index.html`, `style.css`
- Depends on tasks 1–2 (load `js/wheelTheme.js` and `js/prizeIcons.js` before `script.js`).
- Do in `drawWheel()`: colours from `wheelPalette(total)`, ink from `inkFor`; thin white
  separators (`rgba(255,255,255,.85)`, 1.5 logical px); no text shadow; Kanit 500. Layout from
  `wheelLayout(total)`:
  - `stack`: rotate to the slice mid-angle + 90° so "up" points at the rim; icon (22px) centred at
    radius ≈ r·0.74, label centred below it (≤ 2 lines via existing `splitLabel`, shrink to fit the
    chord width at that radius, min 9px).
  - `radial-icon`: icon (20px, 17px if n > 10) at radius r−22, rotated to stay upright along the
    radius; label right-aligned ending at r−40 along the radius, flipped 180° on the left half
    (cos(mid) < 0) so it never reads upside down; existing `wrapText` shrink logic for width.
  - `radial-text`: same as radial-icon without icon, label ends at r−16, font ×0.85.
  - Remove the canvas hub circle and ★; remove photo/emoji drawing on the wheel.
  - Icons: preload `Image`s from `iconDataUrl(iconNameFor(p), ink)` for every (icon, ink) in use
    (reuse/extend `preloadPrizeImages()`), draw with `drawImage`; skip an icon not yet loaded
    rather than block.
  - Keep segment geometry identical (segment *i* from `rotation + i·arc`) — `handleSpin` unchanged.
- In `index.html`/`style.css` around `#wheelCanvas` inside `.wheel-container`: glass rim layer
  (`inset:-12px`, `rgba(255,255,255,.16)`, `backdrop-filter: blur(16px) saturate(1.6)`, 1px white
  .55 border, inset highlight, soft shadow), gloss overlay (top radial white .38→0), glass hub
  (≈ 18% of wheel width, "หมุน", white text with soft shadow, `aria-hidden`), pointer path filled
  with a gradient white→`#c99700` and white stroke. Spin button: existing `.btn-primary` plus a
  subtle top sheen. `@supports not (backdrop-filter: blur(1px))` → solid `#f8fafb` rim.
  `prefers-reduced-motion` unaffected (spin is JS).
- `showResult`: no photo → render `iconSvg(iconNameFor(prize), '#1f5f8b', 64)` into
  `#result-icon` instead of emoji text (keep the photo path as is).
- Accept: no emoji or per-prize colour used by the wheel; spin lands on the server's prize exactly
  as before; no horizontal overflow at 390px; no console errors.
- **Verify:** `node --test js/`

### Task 4 — Admin: icon picker, no colours, 16 cap
- **Executor:** codex · **Risk:** normal
- **Files allowed:** `admin.html`
- Depends on task 2 (add `<script src="js/prizeIcons.js">` before admin's inline script).
- Do in `renderPrizes()`: remove slice-colour and text-colour inputs and the "สีด่วน" preset dots;
  replace the "Emoji Icon" input with an icon picker: a grid of `PRIZE_ICONS` buttons (each
  `iconSvg(name,'#1f5f8b',22)` + `title`/`aria-label` = `PRIZE_ICON_LABELS[name]`, ≥ 44px touch
  target, selected state visible), selection sets `iconName` via `setPrize`. The card badge shows the
  selected icon instead of the emoji. Usage bar colour → `var(--brand)` (danger when sold out).
  `addPrize()`: new prizes get `iconName: 'gift'` (drop color/textColor/emoji defaults); when
  `state.prizes.length >= 16` disable "+ เพิ่มของรางวัล" and show `toast('ใส่ของรางวัลได้สูงสุด 16 รายการ — วงล้อจะอ่านยากถ้ามากกว่านี้', 'err')`
  on click; show a small hint under the list "แนะนำ 6–12 รายการ (สูงสุด 16)". Saving keeps
  existing keys untouched (old `color`/`icon` may stay in the jsonb).
- Accept: every existing admin flow (save/load/reorder/delete/image upload) still works; no new
  console errors; picker usable at 390px.
- **Verify:** `node --test js/`

### Task 5 — Visual QA + polish (Claude)
- **Executor:** claude
- **Files allowed:** `script.js`, `style.css`, `index.html`, `admin.html`
- Do: headless Chrome + CDP (KB `~/.claude/kb/claude-code-tooling.md` §24) screenshots at 390 and
  1280 of the wheel with 6, 9, 12, 16 stubbed prizes, a full spin landing on a stubbed prize, the
  result page with photo and with icon, the admin prize editor; fix visual defects found.
- Accept: owner reviews screenshots before push.
- **Verify:** `node --test js/`
