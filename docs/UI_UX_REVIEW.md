# Blockbound — mobile game UX reference and UI review

Reviewed against the user's October 8, 2026 desktop screenshot of the Blockbound Vercel preview. This document describes the source changes on the accompanying feature branch, **not** an independently captured phone screenshot or production QA.

See [DESIGN.md](../DESIGN.md), [ROADMAP.md](../ROADMAP.md), [GAME_FEEL.md](GAME_FEEL.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Comparative references (patterns, not templates)

| Game | Useful principle | Blockbound interpretation |
| --- | --- | --- |
| [Monopoly GO!](https://screenies.app/apps/1621328561-monopoly-go) | Clearly identifiable board spaces, landmarks, a single dominant roll affordance, event feedback | Board occupies the interaction zone; roll button immediately identifiable; differentiated tile emblems |
| [Board Kings](https://play.google.com/store/apps/details?id=com.jellybtn.boardkings) | Visual personality: buildings, tiny scenery, a town worth improving rather than generic board slabs | Trees, footpaths, individual building palettes, landmarks and construction silhouettes |
| [Coin Master](https://support.coinmastergame.com/hc/en-us) | A simple repeated primary action supported by quick reward celebration and one-hand play | Clear action dock, snappy result summary, finite Auto Roll and explicit costs |
| [Dice Dreams](https://superplay.helpshift.com/hc/en/5-dice-dreams/faq/53-how-do-i-play-the-game/) | Strong visual separation between the central action, town progression, and interruptions for events | Resource/progress HUD, 3D board zone, intentional raid/heist pauses rather than surprise auto-selections |

Do not reproduce other games' art, protected characters, distinctive icons, copyrighted compositions, logos or user interface assets.

## Before: visible problems in screenshot

1. **Hierarchy:** A full-width red action strip dominates the entire desktop width; it looks like a debug-mode command bar rather than a physical roll control.
2. **Space allocation:** Board occupies a narrow central vertical band, while the top third is mostly empty and the lower board corner touches/overlaps the action row.
3. **Progression context:** No clear district header or goal; coins and blocks appear as tiny isolated pills with little explanation.
4. **Discovery:** Stake multiplier, Auto Roll batch size, Auto-OK, turbo and multiplier adaptation are all equally visible and compete for attention.
5. **World detail:** Coloured blank tiles and near-identical stacked boxes don't communicate actions or ownership. Dice visually float over untextured empty space.
6. **Responsive behaviour:** Edge-to-edge desktop UI makes the intended mobile-first hierarchy hard to judge; short phones risk cramped controls and unreachable modal close controls.
7. **Feedback:** Persistent numeric roll summary in the scenery and slim reward messaging lack separation of result, progress and new action.

## Implemented in this PR branch

- A **centrally framed 720px maximum game viewport** on desktop, using 100% viewport on phones; a subtle toy-stage surface rather than stretched web-dashboard controls.
- A top grouping for currency, materials and shields, a high-contrast **Build** affordance and **Sunny Suburb** district progress (tiers completed / available).
- A controlled 3D world zone between header and footer, rendered via orthographic camera with resize-based fitting. Bounded orbit/zoom avoids a giant cropped board.
- Physical board blocks with tile-type markers and special-space trims, plus original low-poly trees, roads and building variants, windows, doors and landmarks.
- A compact bottom card: dice energy and Build Streak, hero **Roll** CTA, stake multiplier and Auto action, then batch size / Quick / Settings controls.
- Auto acknowledgement and adaptive multiplier toggles moved into an on-demand settings panel; exposed settings cannot silently choose encounter targets.
- Short transient result badges and subtle resource change animations, with \`prefers-reduced-motion\` support for CSS transitions.
- Accessible labels, minimum tap targets, safe-area padding and scrollable upgrade modal.
- Browser viewport zoom restrictions relaxed for accessibility.

This is a first pass using simple procedural geometry. It is **not** a fully illustrated commercial-quality asset kit.

## Manual acceptance matrix (must be run)

| Device | Minimum check |
| --- | --- |
| 320×568, portrait | No horizontal overflow; roll and Build controls usable; settings visible; no board occlusion at rest |
| 360×640, portrait | Complete board within 3D world region; resource chips do not collide |
| 390×844 and 430×932 | Board is primary visual; bottom control dock thumb-reachable; touch gestures don't trigger controls |
| Short Android landscape | Either responsive fallback or explicit unsupported-orientation message; no invisible modal close |
| 768–1440px desktop | Centred game stage with readable, restrained HUD; no 1500px-wide call-to-action strip |
| Android Chrome and installed WebView | Scene renders without context failure; smooth orbit/pinch, audio/gesture safe areas |
| Accessibility | Keyboard focus visible, actionable buttons labelled, browser text zoom possible, reduced motion respected |

**Performance:** target a stable interactive frame rate on mid-tier Android hardware, but measure draw calls, scene memory, thermal load, device FPS and WebGL lifecycle. The current 32 tile emblems and houses still use many separate meshes; a follow-up instancing pass may be warranted.

## Next iteration opportunities

- Create an original voxel asset library with varied roof kits, detailed terrain and independent animated townsfolk.
- Add camera focus and micro-vignettes to milestone builds, shield bounces and tile outcomes; preserve the action result independently of animations.
- Tie level completion to a brief physical construction sequence and unlock view instead of introducing another full-screen currency dialog.
- Add touch-controlled miniature buildings as **optional interactions**, with contextual tooltip, build/repair preview and nearby character reaction.
- Improve token and dice depth/occlusion, shadow softness, tile labels and landmark readability on 320px phones.
- Tune to avoid repetitive alerts, forced purchase prompts and overstimulation, even if comparable games use them.

Any PR claiming UX completion needs **before/after screenshots at phone sizes**, real Android runtime QA and a build log. CSS and geometry updates alone do not prove a finished experience.
