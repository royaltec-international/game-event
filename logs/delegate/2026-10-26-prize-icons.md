# Task: Icon set module

Executor: codex    Model: default    Reasoning: medium    Plan: /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/docs/superpowers/plans/2026-10-26-wheel-redesign.md, task 2

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

Add a pure module holding the 24 vendored Lucide line icons used for prizes on the spin wheel, with
helpers that map a prize (new `iconName` or legacy emoji `icon`) to an icon and render it as SVG
markup / an SVG data URL. Browser classic script + node tests.

## Working directory

/Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event — all paths below are absolute.

## Files allowed (edit/create)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeIcons.js
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/prizeIcons.test.js

## Context (read, do not edit)

- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/assets/icons/lucide-subset-0.460.0.json — source: `{name: innerSvgMarkup}`, 24 icons. Embed
  its contents verbatim into the JS (you may generate the file with a local node/python one-off,
  but do not leave the generator script behind).
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/followButtonLabel.js + js/followButtonLabel.test.js — module style to copy: classic browser
  script (top-level const/function, no import/export) ending with
  `if (typeof module !== 'undefined' && module.exports) { module.exports = { ... }; }`; tests use
  `node:test` + `node:assert/strict`.
- /Users/kwxnxxmbair/K Storage/Claude Workspace/RTI Job/Event Lead generation/game-event/js/wheelTheme.js — sibling helper, same style.

## Steps

1. Create `js/prizeIcons.js`, first line comment: `// Lucide icons v0.460.0, ISC License, https://lucide.dev`.
   Exports:
   - `PRIZE_ICONS` — name → inner markup, exactly the 24 entries of the JSON.
   - `PRIZE_ICON_LABELS` — name → Thai label (admin picker tooltips), exactly:
     baby "ของใช้เด็ก", backpack "กระเป๋าเป้", briefcase "กระเป๋าเอกสาร", calculator "เครื่องคิดเลข",
     coffee "แก้วกาแฟ", cup-soda "แก้วน้ำ", fan "พัดลม", gift "ของขวัญ", headphones "หูฟัง",
     lamp-desk "โคมไฟ", notebook-pen "สมุดโน้ต", package "กล่องพัสดุ", pen-line "ปากกา", shirt "เสื้อ",
     shopping-bag "ถุงผ้า", smartphone "โทรศัพท์", smile "ตุ๊กตา/ของเล่น", sticky-note "กระดาษโน้ต",
     tablet "แท็บเล็ต", tent "เต็นท์", ticket "คูปอง", trophy "ถ้วยรางวัล", umbrella "ร่ม", watch "นาฬิกา".
   - `LEGACY_EMOJI_ICONS` — emoji → icon name: 🎁 gift; ☂ and ⛱ umbrella; 🛍 shopping-bag;
     💼 briefcase; 🌀 and 🪭 fan; 📓, 📒 and 📝 sticky-note; 🧮 calculator; 📱 smartphone; 🧸 smile;
     ☕ coffee; 🥤 cup-soda; 🖊 and ✏ pen-line; 🎧 headphones; 👕 shirt; 🎒 backpack; ⌚ watch;
     🏆 trophy; 🎫 ticket; 📦 package. Store keys WITHOUT U+FE0F.
   - `iconNameFor(prize)` — if `prize && typeof prize.iconName === 'string'` and it is an own key
     of PRIZE_ICONS → that name; else if `prize.icon` is a string, strip all U+FE0F and trim, look
     up LEGACY_EMOJI_ICONS (own keys only); else `'gift'`. Must not throw for null/undefined/non-object.
     Use `Object.prototype.hasOwnProperty.call` so names like "constructor" or "__proto__" → gift.
   - `iconSvg(name, color, size)` — returns
     `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">INNER</svg>`;
     unknown name → gift markup; size default 24; color default `'currentColor'`. Reject unsafe
     colours: if color does not match `/^(#[0-9a-fA-F]{3,8}|currentColor)$/` use `'currentColor'`
     (output goes into innerHTML). Size: coerce to a positive finite number, else 24.
   - `iconDataUrl(name, color)` — `'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSvg(name, color, 24))`.
2. Create `js/prizeIcons.test.js`:
   - PRIZE_ICONS has the same keys and values as the JSON file (read it with fs in the test);
     PRIZE_ICON_LABELS has exactly the same keys.
   - valid iconName wins over icon; invalid iconName falls back to emoji; "__proto__"/"constructor" → gift.
   - every legacy emoji maps correctly both with and without a trailing U+FE0F.
   - unknown emoji, null, undefined, {} → 'gift'.
   - iconSvg: contains `stroke="#1f5f8b"` when given that colour; starts with `<svg`, ends with
     `</svg>`, exactly one `<svg` occurrence; unknown name renders gift markup; unsafe colour
     (`'red" onload="x'`) → `stroke="currentColor"`; width/height reflect size.
   - iconDataUrl starts with the data URL prefix and decodes back to iconSvg output.

## Acceptance criteria

- Both files exist in the module style; no dependencies; JSON file unchanged.
- `node --test js/` passes (all existing tests too).

## Verify command

```bash
node --test js/
```

## Out of scope

- Any other file (script.js, admin.html, html/css, the JSON). Do not wire into pages.

## Verify (Claude)
PASS round 0. Git state untouched, scope = 2 allowed files, code matches spec (own-key lookups, colour/size sanitising), `node --test js/` 78/78.
Score: codex default/medium 5 | rounds 0 | clean | difficulty low | full labels + emoji table in brief left nothing to guess; medium enough
