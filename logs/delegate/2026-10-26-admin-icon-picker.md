# Task: Admin — icon picker, no colours, 16 cap

Executor: codex    Model: default    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-26-wheel-redesign.md, task 4

Route: risk=normal literal=n plan=codex chosen=codex default/medium reason=kept

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

The game wheel now generates its own RTI colours and draws Lucide line icons (already shipped in
script.js). Update the admin prize editor to match: replace the per-prize colour inputs and emoji
input with an icon picker, and cap an event at 16 prizes.

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html

## Context (read, do not edit)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeIcons.js — globals `PRIZE_ICONS` (24 names → markup), `PRIZE_ICON_LABELS` (name → Thai
  label), `iconNameFor(prize)` (iconName, else legacy emoji map, else 'gift'), `iconSvg(name, color, size)`
  (returns sanitised `<svg>` markup safe for innerHTML).
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelTheme.js — `MAX_PRIZES = 16`; load it in admin (step 1) and use MAX_PRIZES.
- In /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/admin.html: `renderPrizes()` (~line 1524, builds each card via innerHTML, has `presetDots`
  from `PALETTE`, "สี Slice", "สีตัวอักษร", "Emoji Icon", "สีด่วน (คลิกเพื่อใช้)", badge
  `#badge-icon-i`, usage bar `.prob-bar-fill` coloured `p.color`); `updatePrizeCardStats()`
  (~1652, also colours the bar with `p.color`); `setPrize(i,key,val)` (~1676); `addPrize()` (~1747);
  `toast(msg, type)` (~1812); "+ เพิ่มของรางวัล" button (~line 645); script tags ~832–845.

## Steps

1. Add `<script src="js/prizeIcons.js"></script>` and `<script src="js/wheelTheme.js"></script>`
   before admin's inline `<script>` (~line 845).
2. renderPrizes():
   - Remove the "สี Slice" and "สีตัวอักษร" form groups, the "สีด่วน" presets (and `presetDots`), and
     the "Emoji Icon" input.
   - Add a form group "ไอคอนบนวงล้อ" containing an icon picker: one `<button type="button">` per
     `PRIZE_ICONS` key, inner = `iconSvg(name, '#1f5f8b', 22)`, `title` and `aria-label` =
     `PRIZE_ICON_LABELS[name]`, `aria-pressed` true on the selected one. Selected = `iconNameFor(p)`.
     Click → `setPrize(i, 'iconName', name)`, then update the selected state and the card badge in place
     (no full re-render needed, but a re-render is acceptable). Buttons ≥ 44×44px; selected state
     clearly visible (brand border + brand-tint background); grid wraps (`repeat(auto-fill, minmax(44px, 1fr))`)
     and is usable at 390px wide. Add the CSS in admin's `<style>` next to the prize-card rules,
     using existing tokens (--brand, --brand-tint, --border, --surface).
   - Card badge (`.prize-badge`): show `iconSvg(iconNameFor(p), '#1f5f8b', 20)` instead of the emoji;
     neutral badge background (var(--brand-tint), border var(--border)) instead of `p.color`.
   - Usage bar fill → `var(--brand)` (still `var(--danger)` when remaining === 0); same in updatePrizeCardStats().
   - Photo caption "ถ้ามี จะใช้แทน Emoji Icon ด้านล่าง" → "แสดงในหน้าผลรางวัล (วงล้อใช้ไอคอน)".
   - Keep label/quantity/photo upload/remove/delete exactly as they work today.
3. addPrize(): new prize = `{ id, label: '', quantity: 10, iconName: 'gift' }` (no color/textColor/icon).
   If `state.prizes.length >= MAX_PRIZES` → `toast('ใส่ของรางวัลได้สูงสุด 16 รายการ — วงล้อจะอ่านยากถ้ามากกว่านี้', 'err')`
   and return without adding.
4. Give the "+ เพิ่มของรางวัล" button an id; at the end of renderPrizes() set it visually disabled when
   at the cap (class/`aria-disabled="true"` + reduced opacity) — do NOT use the `disabled` attribute,
   because the click must still show the toast. Add a small hint under the prize list:
   "แนะนำ 6–12 รายการ (สูงสุด 16)" (muted 12px, like `.field-group-hint`).
5. Remove `PALETTE` / `setPrizeColor` only if nothing else uses them after this change (grep first);
   otherwise leave them.
6. Saving: do not strip old keys — prizes loaded with `color`/`textColor`/`icon` keep them in the jsonb;
   no save/validation code may require `color` or `icon` any more (grep `.color`, `.icon`, `textColor`
   in admin.html and fix any remaining dependency).

## Acceptance criteria

- No colour inputs, presets or emoji input remain in the prize editor; icon picker works and persists
  `iconName` via the existing save flow.
- Existing flows unchanged: load, save, reorder (if present), delete, quantity stepper, photo upload/remove.
- 17th prize cannot be added; toast shown; hint visible.
- No new console errors (no references to removed functions/variables).

## Verify command

```bash
node --test js/ && node -e "const s=require('fs').readFileSync('admin.html','utf8');const m=s.match(/<script>([\\s\\S]*?)<\\/script>/g);for(const b of m){new Function(b.replace(/<\\/?script>/g,''))}console.log('inline scripts parse ok')"
```

## Out of scope

- script.js, index.html, style.css, js/*, supabase/, wheelConfig.js.
- Admin wheel preview, theme picker, per-prize colours.

## Verify (Claude)
PASS round 0. Git state untouched, scope = admin.html, no leftover PALETTE/setPrizeColor/p.color/textColor refs, cap uses aria-disabled + toast, new prizes `{iconName:'gift'}`, tests 78/78 + inline scripts parse. Icon click does a full renderPrizes() (allowed by brief). Visual check in task 5.
Score: codex default/medium 5 | rounds 0 | clean | difficulty low | medium enough; telling it "no disabled attr, toast must fire" avoided a dead-click bug
