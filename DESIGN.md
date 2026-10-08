# BLOCKBOUND DESIGN.md — product, visual language and parallel minigame handoff

> **Status:** design specification (not evidence of implemented features). Source snapshot: `sp80808/blockbound` at `6b104f1`, 8 October 2026. Keep [README](README.md), [ROADMAP](ROADMAP.md), [Technical stack](TECHSTACK.md) and [Architecture](docs/ARCHITECTURE.md) in sync with actual code.

## 1. Vision and experience

**Blockbound: Dice Districts — Roll. Build. Raid. Rebuild.**

An original, tactile **mobile-first voxel board-building game**: roll dice around a 32-tile board, resolve compact interactions, collect coins/materials/shields, upgrade a persistent 3D toy-town, and gradually unlock distinctive districts. Visual state changes matter: buildings grow in shape, damage is visible, repair feels physical. The goal is a lively, satisfying miniature world, not a clone of branded dice games.

### Non-negotiable experience pillars
1. **Actions have consequences.** Each action has an explicit cause/result and legible reward; buttons never pretend to do work.
2. **Tactile and snappy.** Short animations, celebratory but controlled audio, deterministic outcomes already committed before animations start.
3. **A living toy world.** Real 3D geometry and perspective, readable details, varied silhouettes, charming micro-animations; minimal repetitive cubes.
4. **Progressive without coercion.** Several complementary rewards, optional live events, fair offline regeneration, no deceptive urgency.
5. **One consistent game.** Parallel experiments must return portable components, not reimplement Blockbound's economy, game shell, network identity or board rules.

## 2. Current truth and inspiration boundary

The primary target is `web/` (React 18 + TypeScript + R3F + Zustand). **The React web client currently has one modeled district and simplified tile resolutions.** The separate `app/src/main/assets/www/index.html` bundles an older playable HTML/Three.js implementation with raids, heists, pip-bearing dice, typed tiles and localStorage, while legacy Kotlin/Compose contains further reference logic. **They are not integrated and are not evidence that web features already work.**

Studied genre patterns: Monopoly GO! (parallel milestone/tournament/boost layers), Coin Master (attack/shield/repair), Board Kings (personal board/visits/props), Dice Dreams (short expressive encounters and collections). **Do not copy any protected assets, branding, audio, UI composition, text, unique character designs or branded board layout.**

## 3. Design language

### Geometry and art direction
- **Voxel-diorama, chunky toy-scale:** real 3D depth, bevel-like lighting, deliberate block grid, legible roofs/windows/landmarks.
- **High contrast in silhouette:** buildings visibly change every tier (0 = empty plot; 1 = base; 2 = storey; 3 = roof + details; 4 = iconic landmark topper).
- **Materials:** matte painted blocks, warm gold/coin accents, selective emissive neon and gentle glass. Avoid noisy textures and over-bloomed scenes.
- **Lighting:** readable soft key + sky/ambient fill; selective contact shadows, lightweight dust and block fragments; maintain color contrast.
- **Camera:** portrait-friendly 3/4 elevated angle; gentle orbit/pinch zoom; hold the focal interaction in view without camera fighting touch controls.
- **Animation language:** crisp anticipation (100–200 ms), clear impact (100–300 ms), brief settlement (200–600 ms). Skip/reduced-motion must preserve outcome.

### Token references (from current code, revise centrally before expanding)
| Token | Hex | Function |
| --- | --- | --- |
| Deep navy | `#0F172A` | Dialog surface and deep background |
| Slate | `#1E293B` | Secondary tiles, panels, quiet navigation |
| Ivory | `#FFFFFF` | Primary text |
| Muted slate | `#94A3B8` | Supporting labels |
| Gold | `#FBBF24` | Coins, rewards, celebratory accents |
| Emerald | `#10B981` | Positive construction/progression |
| Pink | `#F472B6` | Building materials and playful details |
| Indigo | `#6366F1` | Interactive framing and progression |
| Cyan | `#06B6D4` | Shields/protection |
| Red | `#EF4444` | Damage, hazards, blocked actions |

**District palettes:** Sunny Suburb = emerald/gold and quaint structures; Candy Harbour = pastel pink/cyan, candy piers and confectionery; Neon Metropolis = indigo/purple/cyan emissive accents; Pirate Bay = amber/wood/ocean blue. Treat palettes as themes layered on the same tokens.

### Typography and UI
- Bold, rounded, friendly visual hierarchy; use a licensed UI font with robust fallback to system sans.
- Headings: heavy, concise. Numerals: high legibility/tabular where possible. Avoid all-caps walls of text.
- Default controls: 44 × 44 CSS pixel *minimum* tap targets; safe-area top and bottom padding.
- Panels: 12–24 px rounded corners, dark translucent backplates, subtle light hairline border, clear modal-close hit area.
- Resource HUD at top; dice primary action thumb-reachable near bottom. Pause background board gestures behind modals.
- Avoid obstructive banners. Place transient rewards in spare space; queue only important rewards; avoid stacking.
- Responsive at 320/360/390/430 CSS px wide and desktop. One overlay at a time; keyboard and reduced-motion support.

### Feedback
- **Coin reward:** rising coin/burst and a short, single chime; never spam a sound each render frame.
- **Build:** blocks assemble visibly, roof/trim snap, soft dust and final glint.
- **Hit:** wind-up, projectile, impact, voxel fragments and clear SHIELDED / HIT state.
- **Heist:** physical safe door/tile flip with an understandable risk/reward reveal.
- **Excavation:** block dig, soil chunk removal, hidden outline/reveal, progress area updating.
- Muted mode must be truly silent; use device vibration only when supported/consented.

## 4. Game loop and minigame philosophy

**Main loop:** spend dice energy → roll two d6 → token moves 2–12 spaces → resolve exactly one landing → optionally play an encounter → commit rewards once → build/repair → advance district/quests/events.

A minigame is a **short, skippable, discrete episode** with a clear start, 1–4 meaningful choices, a satisfying outcome, and a result sent back to the host. It does **not** decide player balances, directly write saves, simulate a real multiplayer identity, or issue purchases.

### Minigame A — Vault Heist (first parallel feature)
- Entry from a `HEIST` tile and a precommitted encounter definition.
- 3×3 grid of **nine visually distinct voxel safes**. Player may open **three distinct safes**. Never reveal a safe twice or allow more selections.
- An expressive heist room: suspended crates, stacked coins, vault beam and lively safe doors; mobile portrait first.
- Each safe has an opaque result generated by the host rules; the presentation reveals it on choice, not rerolls it.
- Three choice animations → tally cash/materials by host-provided rewards → one **Collect** action that emits exactly one completion event.
- Support short-form skip, touch input, reduced motion, cancel policy and reload recovery; use deterministic seeded fixtures.
- The old HTML has a fixed center jackpot and duplicate-claim risks; **do not inherit either assumption**.

### Minigame B — Town Raid (second parallel feature)
- Entry from a `RAID` tile, with 2–3 target landmarks from an **NPC district** in the offline demo.
- Select one target, see launch → trajectory → damage or shield pop. Playful damage without graphic harm.
- Shield/block state and loot outcome are **host supplied**, with transparent non-streak odds if chance exists.
- Visual geometry reacts to damage: cracks, fragments, tier-dependent ruin; do not rely on a color swap alone.
- One target selection and one resolution per raid; disable repeat-taps during animation and after finish.
- Emit an interaction result **once**, not repeated balance changes. Simulated rivals must be labeled NPCs.
- Avoid irreversible damage to real players before authenticated, authoritative multiplayer exists.

### Future independent modules (not part of first build)
- **Treasure Excavation:** deterministic uncoverable voxel grid, earned tools, event milestones, no self-minting currencies.
- **Skyline Sprint:** mission/milestone UI driven by canonical action events.
- **District Derby:** tournament panel with simulated/sandbox data distinctly labeled; real leaderboards only with server authority.
- **Blueprint Album:** collections/cosmetic preview, duplicates resolved by host rules.
- **Board Mystery Box:** short card reveal with one preselected outcome.

## 5. Parallel delivery rules / host-integration UX

A separate Lovable/Replit prototype is a **feature laboratory**. It may have its own demonstration page and mock fixtures, but final deliverables must be portable React/TypeScript gameplay modules. A preview-only remake or a separate global app store is **not acceptable** as an integration deliverable.

### Required minigame host contract
- Takes `encounterId`, `seed`/precomputed encounter plan, `theme`, `reducedMotion`, `soundEnabled`, `onComplete(result)`, `onExit(reason)`.
- Host defines reward distribution and commits resources; minigame returns selected choices, a replayable outcome transcript and an idempotency key.
- One completion callback maximum per encounter. Host validates IDs, quantities and allowed actions.
- No direct imports from `web/src/store/gameStore.ts`, no imports of global HUD, no mutation of shared economy.
- Visual components remain self-contained and use isolated CSS prefixes/theme tokens to avoid UI collision.
- Supply one public API, standalone demo fixtures, tests and a human-readable integration guide.
- Pause/resume supported; cancel policy explicit (unresolved event either resumes or forfeits under a documented rule).
- No tracking, analytics, payment, accounts or external API required for the lab.

### Desired player path
On tile landing, short scene transition/overlay opens, tutorial hint appears only on first visit, user interacts, result reveals, celebratory animation runs, **collect or dismiss** returns control to the same board with the intended verified reward. No blank screen, page navigation reset, duplicate claim or unexpected overlay.

## 6. Live-operations cadence (design only, not implementation claim)

Plan separate layers: daily objectives (24h UTC resets), rotating boosts (short scheduled windows), solo milestone ladders (2–3 days), special minigame events (3–5 days), seasonal collections (6–8 weeks), occasional team events (server-gated). Define event data declaratively; the same canonical host action may advance several valid events **without duplicating base rewards**. Expiry, claims and offline catch-up require tests. Treat all event schedules as configurable rather than hard-coded and avoid manipulative streak penalties.

## 7. Definition of done for a standalone lab feature
- [ ] Standalone mobile portrait demo actually playable, no filler/buttons without effect.
- [ ] Correct visual behavior against fixed input fixtures; correct single completion callback.
- [ ] At least 10 deterministic unit tests covering choices, cancelled/reloaded sessions, duplicate actions and invalid inputs.
- [ ] No direct writes to player coins, dice, global stores or localStorage; optional isolated demo-only storage clearly documented.
- [ ] No proprietary game assets; list dependencies/licences and asset sources.
- [ ] Verified browser build and 320/360/390/430px mobile layout; state exact checks run.
- [ ] `INTEGRATION.md` showing exports, types, example usage, controlled host adapter and rollback.
- [ ] `src/minigames/<name>/` source can be imported without copying a whole second application.
- [ ] Integration back into Blockbound via reviewed PR with small diff; tests demonstrate no duplicated rewards.

**Final principle:** this document specifies original product intent and style; the active Blockbound `web/` source and tested game rules remain authoritative over guesses in an isolated prototype.
