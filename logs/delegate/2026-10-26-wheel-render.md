# Task: New wheel rendering + glass frame + result icon

Executor: codex    Model: default    Reasoning: high    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-26-wheel-redesign.md, task 3

Route: risk=normal literal=n plan=codex chosen=codex default/high reason=kept (effort raised: canvas maths without complete plan code)

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

Restyle the game page's spin wheel to an Apple-like "light glass" RTI look: generated RTI-blue slice
colours, line icons instead of emoji/photos on the wheel, layout chosen by prize count, and a glass
rim / gloss / hub / gold pointer made of DOM+CSS layers around the canvas. The spin maths must not change.

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/script.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/index.html
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/style.css

## Context (read, do not edit)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-26-wheel-redesign.md — Part 1 = the design intent; Task 3 = this task.
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelTheme.js — globals `wheelPalette(n)`, `inkFor(hex)`, `wheelLayout(n)` ('stack' | 'radial-icon' | 'radial-text').
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeIcons.js — globals `iconNameFor(prize)`, `iconSvg(name, color, size)`, `iconDataUrl(name, color)`.
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelLabel.js — global `splitLabel(text)` (≤ 2 lines at a word boundary), already used by `wrapText`.
- In /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/script.js: `drawWheel(rotationAngle, segments)` (~line 505), `wrapText` (~600),
  `preloadPrizeImages` (~151, loads uploaded prize photos into `prizeImages[id]`, used by the result
  page), `handleSpin`/`spinAnimate` (~628/699), `showResult` (~730), `showRepeat`.
  Canvas logical space is `WHEEL_LOGICAL_SIZE = 380` (canvas 760×760 device px).
- In /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/index.html: `.wheel-container` with `#wheel-pointer` SVG + `canvas#wheelCanvas` (~line 89);
  script tags at the bottom (~156–166).

## Steps

1. index.html: add `<script src="js/wheelTheme.js"></script>` and `<script src="js/prizeIcons.js"></script>`
   after `js/wheelLabel.js` and before `script.js`. Change `#result-icon` default text from the
   emoji to empty.
2. drawWheel():
   - Slice fill = `wheelPalette(total)[i]`; ink = `inkFor(fill)`. Ignore `seg.color`, `seg.textColor`, `seg.icon`.
   - Separators: stroke each slice with `rgba(255,255,255,.85)`, lineWidth 1.5 (logical px). No shadowBlur anywhere.
   - Label font: `500 <px>px <cfg.fontFamily>` (Kanit). Make `wrapText` take the weight / starting px
     / min px as parameters (or add a sibling helper) instead of hard-coding 600 — keep it shrinking to min 9px.
   - Layout = `wheelLayout(total)`:
     - **stack** (1–8): `ctx.translate(cx,cy); ctx.rotate(midAngle + Math.PI/2)` so local "up" (−y) points
       at the rim. Icon 22px centred at local (0, −r·0.74). Label centred (`textAlign='center'`) just
       below the icon (≈ r·0.74 − 22 toward the centre), ≤ 2 lines via splitLabel; max width = chord
       width of the slice at that radius minus 8px padding (chord = 2·R·sin(arc/2), cap at r·0.9 for
       n = 1–2); shrink to fit, min 9px.
     - **radial-icon** (9–12): rotate to midAngle; if `Math.cos(midAngle) < 0` additionally rotate 180°
       and mirror x positions so text reads left→right, never upside down. Icon (20px; 17px if total > 10)
       centred at radius r−22, drawn upright in that same rotated frame. Label right-aligned ending at
       radius r−40 (left-aligned starting at −(r−40) in the flipped case), max width = (r−40) − 34
       (clear of the hub), via the wrapText shrink logic.
     - **radial-text** (13–16): same as radial-icon without the icon; label ends at r−16; start font = cfg.fontSize × 0.85.
   - Icons: an icon cache keyed `name + '|' + ink` → `Image` with `src = iconDataUrl(name, ink)`.
     Fill it for every (iconNameFor(seg), ink) in use; when an image finishes loading and no spin is
     running, redraw the wheel at the current rotation (check how the current rotation is stored).
     In drawWheel, draw with `ctx.drawImage` only if `img.complete && img.naturalWidth > 0`; otherwise
     skip it (never block). Extend `preloadPrizeImages()` (or the init that calls it) so icon images are
     also started before the first draw; keep loading prize photos into `prizeImages` for the result page.
   - Remove the canvas centre circle, the ★, and all photo/emoji drawing on the wheel.
   - Segment geometry must stay identical: segment i spans `rotationAngle + i·arc` … `+ arc`. Do not
     touch handleSpin / spinAnimate / the draw RPC code.
3. Glass frame (index.html + style.css), around the canvas only:
   - Wrap the canvas in `<div class="wheel-stage">` (position:relative, aspect-ratio 1) so overlay layers
     line up with the canvas, not with the container's padding-top (the pointer stays in .wheel-container).
   - `.wheel-rim` (aria-hidden, behind canvas): `position:absolute; inset:-12px; border-radius:50%;
     background: rgba(255,255,255,.16); backdrop-filter: blur(16px) saturate(1.6); -webkit-backdrop-filter: same;
     border: 1px solid rgba(255,255,255,.55);` inset top highlight + soft drop shadow.
     `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` → solid `#f8fafb` rim.
   - `.wheel-gloss` (aria-hidden, above canvas, pointer-events:none, border-radius 50%): radial gradient
     from top centre, white .38 → transparent by ~60%.
   - `.wheel-hub` (aria-hidden, centred, width ≈ 18% of the stage, circle): glass look (white .22 bg,
     blur, white .6 border, soft shadow), text "หมุน" white, Kanit 500, soft text-shadow, font-size scales
     with the wheel (e.g. clamp 13–16px).
   - Replace the old canvas box-shadow ring with the rim. Pointer path: fill a linear gradient white →
     `#c99700` (define `<linearGradient>` in the SVG), white stroke; keep size/position.
   - `.wheel-container`: make sure the rim's −12px never causes horizontal page overflow at a 390px
     viewport (e.g. margin/padding 12px each side, or max-width calc(100% − 24px)).
   - Spin button: keep `.btn-primary`; add a subtle top sheen only on `#spin-btn` (e.g. a
     linear-gradient white .18 → 0 over the top half via background-image or ::after).
4. showResult(): if no photo, render `iconSvg(iconNameFor(prize), '#1f5f8b', 64)` into `#result-icon`
   via innerHTML (output is sanitised by iconSvg) instead of emoji text. Photo path unchanged. Add CSS
   so the svg is centred in .result-icon.

## Acceptance criteria

- Wheel uses no emoji, no prize photo and no per-prize colour; colours/inks come from wheelTheme.js.
- Segment angles identical to before; handleSpin/spinAnimate untouched (diff shows no change there).
- 1–8 / 9–12 / 13–16 layouts as above; labels never upside down in radial layouts.
- No horizontal overflow at 390px; no console errors (e.g. no reference to removed helpers).
- `node --test js/` passes.

## Verify command

```bash
node --test js/ && node --check script.js
```

## Out of scope

- admin.html, js/*, wheelConfig.js, supabase/, header/page theme, spin maths, the draw RPC.
- Removing `prizeImages` (still used by the result page).

## Verify (Claude)
PASS round 0. Git state untouched, scope = script.js/index.html/style.css, segment geometry + handleSpin/spinAnimate unchanged, rotation maths of stack/radial frames checked by hand (local −y → outward; flipped frame → −x outward), `node --test js/` 78/78, `node --check` ok. Visual check deferred to task 5.
Score: codex default/high 5 | rounds 0 | clean | difficulty med | detailed geometry in brief paid off; high appropriate for canvas maths
