# Blockbound reward presentation research

Updated 8 October 2026. This note covers the requested casual-board-game reward pattern and a small browser implementation path. It does not copy art, branded effects, timings or economy design from another game.

## What the references support

| Reference | Verified observation | Limit |
| --- | --- | --- |
| [Monopoly GO motion index](https://60fps.design/apps/monopoly-go) | The indexed recordings explicitly include Free Gift, Free Cash, Event Rewards, Daily Treats, Token Reveal and City Progress Path interactions. The catalogue describes physics particles and bouncy reward/modal transitions. | Most frame-level recordings require a paid account, so exact timing and trajectories were not extracted. |
| [Monopoly GO design analysis](https://thewhyofplay.com/2024/08/23/monopoly-go-a-design-deep-dive/) | Wins use strong fanfare; tile outcomes feed currency, dice and event progression; reward payouts are staged as prominent moments. | Independent analysis, not an official specification. It also documents social-casino pressure that Blockbound should avoid. |
| [Coin Master official rewards shop](https://shop.coinmaster.com/) and [gameplay video](https://www.youtube.com/watch?v=EcRIOWiakRY) | The official shop uses a gift-first reveal hierarchy: a distinct gift object, “open to reveal”, then the reward. The gameplay video is a useful manual visual reference for the slot-to-resource loop. | The indexed text does not prove a particular curved HUD flight path; inspect the video before matching motion. |
| [Board Kings Google Play listing](https://play.google.com/store/apps/details?id=com.jellybtn.boardkings&hl=en_US) | Official screenshots/video provide the current board, roll and persistent-resource HUD context. | Search excerpts did not expose frame-level reward motion. |
| [Dice Dreams Google Play listing](https://play.google.com/store/apps/details?id=com.superplaystudios.dicedreams) and [long-form gameplay critique](https://www.youtube.com/watch?v=YVgH9TdV2ec) | These are direct visual references for its roll, win and resource presentation. | The second source is commentary rather than official documentation; use it only to inspect visible interaction, not as design authority. |

Across the sources, the defensible shared pattern is **reward hierarchy**, not an identical animation: make the earned object large and readable, separate the reveal from bookkeeping, then visibly connect it to persistent progression. A short curved or looping flight into the relevant HUD counter is a Blockbound design synthesis that serves that connection. It should be playtested rather than described as a verified behaviour in all four games.

## Recommended Blockbound sequence

1. Resolve the authoritative reward once. Show a large coin, energy, material or shield icon with the exact amount for about 350–500 ms.
2. Give the icon one restrained scale overshoot and glow. Reserve confetti or a wider burst for a district completion, rare reward or major milestone.
3. Split the large icon into at most 3–6 lightweight visual tokens. Fly them on a shallow curved path to the matching HUD ticker over about 400–650 ms.
4. Update the stored value when gameplay resolves; animate the displayed ticker at impact so motion never controls economy state. Pulse the destination once and play one short resource-specific sound.
5. Queue mixed reward types instead of covering the board with simultaneous flights. Keep the whole common-reward sequence near one second and let a tap finish it immediately.
6. Under `prefers-reduced-motion`, replace travel and particles with a brief cross-fade plus destination highlight. Do not require motion, colour or sound to identify the reward.

The route should use live `getBoundingClientRect()` coordinates for the revealed icon and target ticker, because the HUD moves across portrait, tablet and desktop layouts. A quadratic Bézier sampled into Web Animations API `transform` keyframes is sufficient and avoids a dependency. CSS [`offset-path`](https://developer.mozilla.org/en-US/docs/Web/CSS/offset-path) is a smaller alternative when the endpoints are known, but dynamic HUD endpoints are easier to express with generated transform keyframes.

## Small implementation references

- MDN's [`offset-distance` example](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/properties/offset-distance/index.md) demonstrates a cubic CSS motion path. MDN prose is CC-BY-SA 2.5 and code examples are documented in the repository [license](https://github.com/mdn/content/blob/main/LICENSE.md); use the platform idea rather than copying prose.
- [`catdad/canvas-confetti`](https://github.com/catdad/canvas-confetti) is an ISC-licensed, focused browser particle implementation with a `disableForReducedMotion` option. It is useful as a behaviour/performance reference. Blockbound does not need the dependency for the common reward flight; consider it only if major milestones need richer particles after profiling.
- The browser [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) supplies cancellation and a completion promise, which are useful when a modal opens, auto-roll stops or the page backgrounds.

## Acceptance checks

- Coins, energy, materials and shields always travel to the correct visible ticker at 320×568, 390×844 and tablet/desktop widths.
- Rapid rewards queue or coalesce without duplicate economy updates, stale destination coordinates or an unbounded number of DOM nodes.
- Backgrounding, opening a modal and reduced-motion mode cancel or simplify presentation without losing the reward.
- The amount is readable before travel, the destination pulse matches the committed value, and the sequence never blocks the next required player choice.
- Audio uses one impact cue per reward type rather than one sound per flying token.

## Research caveat

Search engines exposed good product and gameplay references but incomplete frame-level access for Coin Master, Board Kings and Dice Dreams. Before tuning exact arcs, loop count, easing or duration, perform a short manual capture review of the linked current builds/videos and record timestamps. Avoid importing screenshots, icons, sound effects or animation assets from these games.
