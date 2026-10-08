# 🎲 Blockbound: Dice Districts

**Roll. Build. Raid. Rebuild.** Blockbound is an original, portrait-first voxel board-and-town game in development for the mobile web and Android.

> **Development status: experimental prototype, not a production-ready release.** The repository now includes an **actual React + TypeScript + React Three Fiber/Three.js web scene** as well as an earlier **Kotlin/Jetpack Compose Android prototype** and a **separate Android WebView shell with bundled HTML/Three.js assets**. These are **not yet a unified, tested distribution pipeline**. See [Architecture](docs/ARCHITECTURE.md) before extending any of them.

[Design language & minigame brief](DESIGN.md) · [Tech stack & integration contracts](TECHSTACK.md) · [Roadmap](ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [AI Studio handoff](docs/AI_STUDIO.md) · [Third-party notices](THIRD_PARTY_NOTICES.md)

## The pitch

Build a miniature voxel town while rolling dice around a colourful board. Collect coins, materials and shields, trigger quick events, upgrade buildings and unlock increasingly elaborate districts. The central differentiator is a **living, customisable 3D toy world** where construction, damage and progress have satisfying visible consequences.

**Inspirations:** the broad board-progression, raid/rebuild and playful-city *genres* associated with Monopoly GO!, Coin Master, Board Kings and Dice Dreams. Blockbound must have its **own world, gameplay identity, assets, characters, board layout, UI and branding**.

### Design pillars

- **Play first:** dice → travel → resolve landing → earn → build → repeat; no decorative placeholders presented as completed gameplay.
- **3D, not 2.5D:** a touch-controllable camera, real depth, detailed voxel meshes and playful scene animation.
- **Tactile feedback:** correct numbered dice, readable results, animated rewards, block-by-block construction and restrained one-shot SFX.
- **Mobile friendly:** portrait framing, thumb-reachable HUD, cutout/safe-area support and Android WebGL performance.
- **Reliable progression:** deterministic tests, idempotent reward processing and durable versioned saves.
- **Ethical engagement:** optional cosmetics/ads later, transparent rewards and no paywall around basic play.

## Current implementation (source review: 8 October 2026)

| Area | In source today | Still needed |
| --- | --- | --- |
| Web client | `web/` Vite + React 18 + TypeScript; R3F/Three.js + Drei | Reproducible install, tests, production QA |
| 3D board | 32 coloured **Three.js meshes**, character, buildings and OrbitControls in `web/src/components/VoxelScene.tsx` | Detailed level art, intuitive mobile camera and focus |
| Dice | Two spinning **3D cubes** and store-generated dice numbers | Numbered/pipped faces, correct face settling, sync with visible outcome |
| Gameplay | Zustand roll, energy, multiplier, simplified coin rewards and building upgrades/repairs | Full tile types, raids/heists, quests, robust turn state machine |
| Persistence | Legacy Kotlin `SaveManager.kt` only | Versioned web save, restore, migrations and recovery |
| Mobile app | Kotlin `MainActivity.kt` loads bundled `app/src/main/assets/www/index.html` through Android WebView | Consolidate with the Vite/R3F source; proper Capacitor workflow |
| PWA | Not verified/implemented | Manifest, service worker, offline assets and update handling |
| Quality | Existing Kotlin tests; `web/package.json` exposes `dev`, `build`, `preview`, `cap:sync` | Web test/lint scripts, lockfile, CI, phone profiling |

**Do not conflate the different clients:**

1. **Primary target:** `web/` — React + TypeScript + R3F game, previewable in **Google AI Studio Web app mode**.
2. **Android compatibility shell:** `app/` — native Gradle/Kotlin project; current `MainActivity.kt` loads static HTML/Three.js via a WebView, **not the Vite build automatically**.
3. **Earlier prototype:** `app/src/main/java/com/example/blockbound/` — Kotlin game logic and Compose-drawn isometric voxel UI, useful for feature-parity and content references. The active activity currently uses the WebView shell.

The current `web/src/store/gameStore.ts` awards simplified tile rewards (for GO and certain tile indices); most full event/tile behaviours in the Kotlin prototype are **not ported**. Web state is currently in-memory, so reloading can reset progress. Building geometry changes tiers but lacks the final detail/assembly effects. **Do not advertise these as finished.**

## Start the web prototype

**Requirements:** Node.js and npm compatible with the checked-in Vite/TypeScript dependencies, plus a modern browser with WebGL.

```bash
git clone https://github.com/sp80808/blockbound.git
cd blockbound/web
npm install
npm run dev
```

Open the local address printed by Vite (configured default port: **3000**). For a production bundle:

```bash
npm run build
npm run preview
```

**Important:** as of this review, `web/` has a `package.json` but **no committed lockfile**, so `npm install` is required and dependency versions are not fully frozen; `npm ci` will only be appropriate once a lockfile is committed. A successful browser/Android build was **not** verified during this documentation update.

### Android development

The root folder contains a Gradle/Kotlin Android project with `app/`. It currently launches a WebView pointed at **`file:///android_asset/www/index.html`**. The bundled asset is a separate HTML/Three.js implementation, not proven to be the output of `web/npm run build`. Changes to `web/src/` will **not automatically appear** in that native shell.

A `web/capacitor.config.json` exists, but its presence is not proof of a working Capacitor project. The intended flow is **build the Vite client → validate its output → sync to Capacitor → test on Android** after the packaging strategy is consolidated.

To explore the existing native shell, open the repository root in Android Studio and sync its Gradle project. The repository currently includes `gradle/wrapper/gradle-wrapper.properties` but **not** the wrapper executables/JAR; a clean `./gradlew` command cannot be assumed to work. Keep secrets and signing credentials out of git.

## Where to find things

```text
web/
  package.json                      # Vite/R3F dependencies and scripts
  src/App.tsx                       # Splash, board scene, HUD, upgrade modal
  src/components/VoxelScene.tsx     # WebGL meshes, dice cubes, camera
  src/components/HUD.tsx            # Mobile controls and resource display
  src/components/SplashScreen.tsx   # Browser splash
  src/store/gameStore.ts            # Zustand state and prototype rules
  capacitor.config.json             # Initial config; integration incomplete
app/
  src/main/assets/www/             # Separate, bundled WebView HTML/Three.js
  src/main/java/com/example/
    MainActivity.kt                 # Native WebView launcher
    blockbound/                     # Legacy Kotlin gameplay + Compose UI
docs/
  ARCHITECTURE.md                   # Renderer, state and migration boundaries
  AI_STUDIO.md                      # Development handoff / engine guardrails
```

## Immediate milestones

1. **Unify the running source:** the R3F Vite game must be the web preview and eventual Android content, not a divergent copy of the bundled HTML.
2. **Harden gameplay:** port 32 tile rewards and existing Kotlin event rules to pure, tested TypeScript; make rolls transactional.
3. **Finish a compelling vertical slice:** face-correct dice, stepwise token movement, rewarding encounters, 3D building construction and save/load.
4. **Test on actual phones:** responsive HUD, safe areas, camera gestures, memory/FPS and Android app lifecycle.
5. **Then** broaden districts, daily systems, cloud social features and optional monetisation.

See [ROADMAP.md](ROADMAP.md) for measurable acceptance criteria rather than unchecked feature claims.

## Parallel minigame labs (Lovable / Replit)

The first isolated experimental modules are **Vault Heist** and **Town Raid**. They should be authored in a separate sandbox/project and eventually imported into `web/src/minigames/` through a reviewed pull request. See the [visual and gameplay design brief](DESIGN.md) and [versioned TypeScript host contracts](TECHSTACK.md). The lab must never write the canonical player economy, forge multiplayer opponents or ship a second authoritative Blockbound app shell.

**Current status:** these contracts are *specifications*, not already wired modules; lab project creation/hosting and live integration are tracked independently. The primary target remains React/TypeScript/R3F and Google AI Studio Web App mode. A public repo is not needed for planning: the owner can pass the documents to agents directly or connect Lovable's GitHub integration once access has been reviewed.

## Contributions and rights

We welcome well-scoped issues, original artwork and reviewed code; see [CONTRIBUTING.md](CONTRIBUTING.md). Track third-party code/assets in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); verify licences before reuse. No top-level licence granting rights to the project's original game code/assets was present in the reviewed repository, so **do not assume permission to redistribute them**.
