# Blockbound — evidence-led development execution plan (credit-constrained)

> Last reviewed: **8 October 2026** against GitHub `main` commit `f7a75e1` and an inspection of the existing Lovable lab source. This is a **plan**, not implemented gameplay or a passed test suite. Overall delivery tracking: [ROADMAP](../ROADMAP.md). Design: [DESIGN](../DESIGN.md). Tech stack: [TECHSTACK](../TECHSTACK.md).

## Executive decision

**Freeze new Lovable agent spend. No new parallel app.** The authoritative game is `web/` (React 18, TypeScript, Vite 5, Three 0.164, React Three Fiber 8, Drei 9, Zustand 4). Google AI Studio Web app mode is a valid source editing/preview path. The `app/` Android WebView static HTML game and native Kotlin prototype remain reference implementations until their verified useful mechanics are ported and the delivery path is unified. Preserve existing work, do not replace the Android HTML preemptively.

**Success criterion for the next development cycle:** 10-minute self-contained *Sunny Suburb* session: start → correctly numbered dice and 32-space movement → meaningful landing reward (including building materials) → one short optional encounter → tier upgrade with visible 3D construction → saved state survives refresh. A game that does this reliably beats new unconnected events, more worlds or more screen mocks.

## Observed source and reuse inventory

| Implementation / reference | Source path | What is available | Known gaps or risks |
| --- | --- | --- | --- |
| Web game (canonical) | `web/src/` | Vite React/R3F actual 32-tile mesh perimeter, token, spinning dice cubes, basic HUD, one district and buildings in Zustand | No numbered die faces, token leaps to destination, rewards only landing on GO or index divisible by 4, no material earn path, no web saves, no encounters |
| Android WebView HTML (reference only) | `app/src/main/assets/www/index.html` | Typed tile effects, pipped dice, step-by-step hops, NPC raid/heist dialogs, basic energy regen, browser save | Separate game, legacy Three build, repeated claim vulnerabilities, incomplete resume/validation; cannot ship source as a parallel canonical game |
| Kotlin prototype (reference only) | `app/src/main/java/com/example/blockbound/` | Richer district/content/quest models and state rules | Not running in Android's active WebView route; Compose/isometric drawing is not a React rendering solution |
| Lovable Minigame Lab (salvage candidate) | `src/minigames/` in the [lab](https://lovable.dev/projects/cf80f3fa-4225-4df0-916d-dc7567b1411a) | `contracts.ts`, heist/raid pure reducers, deterministic fixtures, R3F Vault Heist/Town Raid, one-shot audio/scene/theme helpers, demo switches and callback inspector | Uses React 19, R3F 9, Three 0.186 and TanStack Start vs React 18/R3F 8/Vite 5 in Blockbound; **no focused minigame tests or `INTEGRATION.md` observed**. No tested build/migration or integrated host economy. Should not be merged wholesale |
| Replit copy | [Replit Blockbound](https://replit.com/@itsharryspeight/blockbound) | Source mirror of GitHub plus `.replit` config | Verify current sync/permissions before editing; AI agent use may have separate credits. Avoid accidental direct pushes to `main` |

## Development sequence and dependency graph

```text
A. Reproducible web build / local test runner (#5, part 1)
             |
B. Pure 32-tile engine, RNG, validated atomic game actions (#5, part 2)
             |
        +----+-----------------+
        |                      |
C. Correct dice display,     D. Versioned browser save, offline
   token hops, tile UI          regen, interruption recovery (#6)
        |                      |
        +----------+-----------+
                   |
E. Host-managed encounter interface + Vault Heist; then Town Raid (#3)
                   |
F. Construction polish, real district progression, mobile UX (#7)
                   |
G. Auto-roll/multiplier safety + small event scheduler (#8)
                   |
H. Packaging Vite build as same Android web app + PWA QA (#4)
```

A/B/C/D are allowed in small separate PRs with explicit dependencies. Rendering polish may progress in parallel with isolated reducer tests, but do not create two authoritative rules engines.

### Slice A — web build and tests
Issue: [#5](https://github.com/sp80808/blockbound/issues/5).

**One narrow PR:** commit a lockfile, choose Node version, verify `npm ci` and `npm run build` at `web/`, add `npm run typecheck` and Vitest runner. Add a small smoke test for one existing rule, no graphical redesign. Optional `eslint` if straightforward. Local checks should work without paid GitHub Actions minutes or Lovable credits.

**Gate:** exact install/build/test commands with captured pass/fail logs in the PR. Never claim tests pass until run.

### Slice B — pure game rules before animations
Issue: [#5](https://github.com/sp80808/blockbound/issues/5).

Extract `web/src/game/rules/` and `game/content/`: 32 typed tiles, district/building config, energy/material/shield/currency caps, injected dice RNG, tile effects and reward settlement with explicit unique roll/encounter IDs. Zustand dispatches game actions; animations are read-only presentation.

- Every landing resolved once; wrapped step-by-step path recorded.
- `roll 1x/2x/3x/5x` cost/spend matches outcome; quick roll changes speed only.
- Tests cover all tile types, energy denial, invalid currency values and 10,000 seeded turns, plus replay/idempotence.
- Use HTML/Kotlin rules as reference, **reimplement with fixes** instead of copying unsafe callback logic.

**Gate:** one turn transaction has deterministic outcome and exactly-once reward independent of animations. Gameplay can be tested headlessly.

### Slice C — readable playable board
Issue: [#5](https://github.com/sp80808/blockbound/issues/5), visual follow-up [#7](https://github.com/sp80808/blockbound/issues/7).

Make pip-bearing 3D die geometry show **the actual rolled values**, hop token across each traversed space, hold viewport camera and HUD stable, render tile type readable with mobile cues, tie dice roll controls to actual turn states. Unit tests assert the face/outcome mapper, transition order, and no second payout on skipped animations.

**Gate:** dice outcome and displayed faces match on 100 seeded previewed cases. A player knows *where* and *why* they earned material, shield or coins.

### Slice D — durability and offline recovery
Issue: [#6](https://github.com/sp80808/blockbound/issues/6).

Versioned browser save schema, migration/validation and recovery policy. Store critical transactions and any pending encounter state, not animation timers. Offline energy catch-up uses elapsed time and a cap, handles clock jumps and restart. Tests for refresh in each turn state, corruption, repeated claim, energy cap and tab visibility pause.

**Gate:** resources, building tiers and board position survive refresh. No trapped `isRolling` or duplicated claims on crash/resume.

### Slice E — salvage Lovable code, not its dependency graph
Issue: [#3](https://github.com/sp80808/blockbound/issues/3).

**Free salvage order:** first review/copy source-level `contracts.ts`, pure reducers and deterministic fixtures to a Blockbound **feature branch**; adapt types and add tests. Do **not** copy the Lovable `package.json`, TanStack Start/router, global CSS, or upgrade Blockbound to React 19 just to accept the lab code. Then port compatible render components and shared primitives into `web/src/minigames/`, adjust R3F 8/Three 0.164 APIs and modular CSS. Implement host adapter to open encounter plans on typed `HEIST`/`RAID` tile events and commit outcomes atomically.

**Specific review red flags found in lab source:**
- Pure `raidReducer` `impact_done` accepts `shielded` from the dispatched event rather than deriving it from committed plan; host must be authoritative for the outcome.
- `validateEncounterResult` compares selected IDs and rewards but currently doesn't verify the full event-log transition sequence or validate all payload ranges/types. Add runtime validation and protocol invariants.
- Lab `App.tsx` contains demo-only in-memory idempotent commit set; no persistence and no host economy integration.
- Source tree did not include focused heist/raid tests or `INTEGRATION.md` at inspection; require them before merge.
- Animated visuals spawn many individual meshes/materials; profile on mid-range Android and instance/reuse if needed.

**Gate:** from a real board tile, Vault Heist opens with 9 unique safes, selects 3, one result applies once and returns to the board, surviving interrupted sessions. Town Raid follows same contract. No duplicate payouts, fake online users or background gameplay timers.

### Slice F — Blockbound's distinctive progression
Issue: [#7](https://github.com/sp80808/blockbound/issues/7).

Polish one complete Sunny Suburb before creating three incomplete districts: distinct tier silhouettes for bakery/windmill/park/cottage/town hall, construction block particles with capped count, damage/shield/repair visuals, visible milestones, village personality. Add **Blueprint Chains** prototype (original Blockbound idea): finishing nearby upgrade sets fills a local blueprint meter granting an optional cosmetic landmark/scene upgrade; avoid extra currencies until economics are tested.

**Gate:** upgrades feel unique and physically visible, UI works on Android portrait (320–430px), effects can be muted/reduced; measured performance notes.

### Slice G — engagement without unreliable spending
Issue: [#8](https://github.com/sp80808/blockbound/issues/8).

**Not before B/D/E.** Implement safe user-controlled auto-roll with hard stop conditions (encounter open, energy threshold, manual decision, tab hidden, error), dynamic 1/2/3/5 multipliers with spend budget and no outcome predictions. Then one data-driven **48-hour Skyline Sprint** milestone event, daily goals, expiry grace and a UTC event-config schema. Progress from canonical game actions, not from UI animations or arbitrary local button counters. Treat any leaderboard as NPC simulation unless server infrastructure actually exists.

**Gate:** 10,000 seeded roll simulations, session abort/refresh tests and no double rewards, runaway energy spend or deceptive deadlines. Expand recurring events and collectibles only after the core loop is fun.

### Slice H — packaging / shipping
Parent: [#4](https://github.com/sp80808/blockbound/issues/4).

Build tested `web/dist` into exactly **one** Android runtime (Capacitor or generated assets WebView, decided in ADR) without maintaining a second HTML game. Test PWA install in Chrome, manual iOS Add to Home Screen instructions, Android Chrome/WebView lifecycle. Avoid buying extra services; a free static preview can serve as the first distribution check.

**Gate:** identical gameplay/save on Vite preview and Android app; bundle tested rather than assumed.

## How to work without more agent credits

1. **GitHub branches and small PRs** are the primary record. Use connected GitHub tools for source and issues; avoid expensive full-repo-generation prompts.
2. The existing **Replit project can be a development/preview mirror** if its terminal/browser is available; do not rely on paid Replit Agent credits or treat unverified Git sync as guaranteed.
3. **Lovable is source material only**, already paid for. Read/export the existing components and reducers; no need to ask Lovable to regenerate code.
4. **Google AI Studio Build Mode** may be used for focused web changes, but require its result to fit the existing Vite/React architecture; don't allow project reset/rewrite.
5. For each implementation session, give a coding agent **one narrowly scoped issue**, the relevant 2–4 files, exact acceptance tests and a prohibition on unrelated changes. Prefer a verified 200-line PR to another 3,000-line half-built app.
6. Use public, licence-reviewed small geometry/assets (Kenney, Quaternius or original procedural) only where they materially improve gameplay. Add attribution as appropriate and avoid redistributing unauthorised assets.

## Target scope and stop rules

**First playable** = a stable, single-district loop, not multiplayer, 4 worlds, 10 event types and a full monetisation backend. Do not start auth, social, ranking or server infrastructure before a demonstrably enjoyable first session.

Stop and fix if:
- 3D scene and game store disagree about dice outcome or building tier;
- any replay produces extra currency;
- a reload destroys meaningful progress;
- a new feature requires a second global game state;
- visual improvements make phone tap controls unreachable;
- external prototype requires a major framework migration without tests.

## Simple release checklist

- [ ] Fresh setup works using exact documented Node/npm versions and committed lockfile.
- [ ] Real deterministic 32-tile board with correct dice/energy/economy and seeded tests.
- [ ] Materials earned and spent, distinct 3D tier construction, district progress visible.
- [ ] One working Vault Heist; optional second Town Raid after review.
- [ ] Autosave survives reload and interrupted animation.
- [ ] Reliable 10-minute portrait session on desktop and actual Android browser.
- [ ] No unsupported claims about multiplayer, availability, performance, live events or builds.
- [ ] Assets/third-party code accounted for; no keys in public repository.

**Priority order:** #5 → #6 → #3 → #7 → #8, with platform packaging tracked by #4 and delivered after parity. The next concrete development action is **#5 Slice A**: lockfile + fresh build + minimal tests.
