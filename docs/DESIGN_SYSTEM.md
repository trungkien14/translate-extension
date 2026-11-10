# Design System

Source of truth for tokens: `shared/tokens.css` (popup/options). The in-page modal copies them in `content/styles.js` (Shadow DOM cannot read page/extension CSS).

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #ffffff | #1b1d22 | modal / page background |
| surface | #f5f6f8 | #24272e | cards, inputs |
| surface-2 | #eceef2 | #2d3139 | hover, chips |
| text | #14161a | #eceef2 | primary text |
| muted | #6a7280 | #9aa1ad | secondary text, labels |
| border | #e3e5ea | #343841 | hairlines |
| accent | #4f46e5 | #8b8dfc | primary action, focus ring |
| danger | #c2362b | #ff8a80 | errors |

Theme: `system` (prefers-color-scheme) | `light` | `dark`, set via `data-theme`.

## Typography
System UI stack with CJK fallbacks (Noto Sans JP/SC/KR, Yu Gothic UI, Microsoft YaHei UI, Malgun Gothic).
Sizes: 11px caption/label (uppercase, +0.04em), 13px body/UI, 15px original text, 17px translation (word/phrase), 15px translation (sentence), 20px IPA/hero for single words. Line-height 1.45-1.55.

## Spacing / radius / elevation
Scale 4/8/12/16/24/32. Radius: 8 (controls), 12 (cards), 16 (modal). One shadow level for floating UI. 1px borders.

## Components
- **Trigger button**: 30px circle, accent, subtle shadow, fade/scale-in 120ms.
- **Modal**: 380px max width, 16px radius, header (language bar) / body (cards) / footer (provider + TTS note). Max height min(80vh, 560px), body scrolls.
- **Icon button**: 30px square, 8px radius, transparent, surface-2 hover, accent focus ring (2px).
- **Chip**: 12px text, surface-2, 999px radius.
- **Skeleton**: 2-3 shimmering lines while loading. **Error**: danger-soft card with message + Retry (+ Open settings for config/auth errors).
- Motion: <= 160ms, ease `cubic-bezier(.2,.7,.2,1)`, disabled under `prefers-reduced-motion`.
- Voice-honesty: speaker buttons titled "Synthesized voice"; dictionary audio buttons titled "Recorded audio (provider)".
