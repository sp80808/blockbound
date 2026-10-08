# Blockbound — auto-roll, adaptive dice and game feel

> Development notes for the \`web/\` React/R3F client, 8 October 2026. These are experimental features awaiting build/device QA and balance review. Android currently serves a separate HTML bundle; this PR does not automatically update that bundle.

## Genre research and boundaries

Primary observations:

- [Monopoly GO! — High Roller](https://monopolygo.helpshift.com/hc/en/3-monopoly-go/faq/273-high-roller/): multiplier availability changes with dice balance and can be temporarily increased by events.
- [Coin Master — Spin Multiplier](https://support.coinmastergame.com/hc/en-us/articles/360001257693-How-does-the-Spin-Multiplier-work): normal reward classes are multiplied; exceptional/special event rewards are handled separately.
- [Coin Master — Auto Spin](https://support.coinmastergame.com/hc/en-us/articles/26333291436050-How-can-I-play-the-Boss-Fight-event): holding the input enables auto spinning in an event context.
- [Monopoly GO! — board rules](https://monopolygo.helpshift.com/hc/en/3-monopoly-go/faq/66-board/): landing-space rewards and encounter-triggering spaces create an alternating main loop.
- [Game-feel study](https://falcon.so/resources/game-design/juice): brief anticipation, physical reaction and readable follow-through make simple actions more satisfying.

These are pattern-level references, **not instructions to copy** proprietary game UI, branded content or art. Player consent and clear energy exposure matter more than reproducing infinite/hidden auto-play behaviour.

## Implemented in the web prototype branch

### 1. Auto Roll — bounded, explicit spend

- Choose **5**, **10** or **25** rolls and then start/stop an auto batch.
- Auto rolls are queued **after** the preceding roll settles and landing resolution finishes.
- The batch is capped by **both number of rolls and an explicit energy budget** calculated at activation. Rewards earned during the batch do not silently increase the authorised spend.
- The player can tap **STOP AUTO** at any time. This prevents new queued rolls but finishes any already committed roll.
- Auto ends on insufficient energy, reached budget, completed count, foreground loss, build dialog or a choice requiring manual interaction.
- Roll button and multiplier controls are disabled during automatic batches to avoid double actions.

### 2. Adaptive dice multiplier

- Cycling offers only cost multiples that the player can currently afford: 1×, 2×, 3×, 5×, 10×, 20×, 50× or 100× (balance-dependent).
- **ADAPT ×** lets Auto Roll step down to the highest permitted multiple **within remaining energy and the authorised batch budget**.
- Players can disable adaptation: Auto Roll then stops if the selected multiple becomes unaffordable.
- Energy/shields are not multiplied, while standard coins/construction materials are multiplied by the roll cost.
- This is a **spend multiplier**, not an unfair way to alter the outcome probability of two six-sided dice.

### 3. Auto-OK with safe manual pauses

- With **AUTO OK on**, informational rewards display as short toasts and auto-play moves on.
- With **AUTO OK off**, standard rewards require pressing **OKAY**, including within an active auto batch.
- **Heists and raids always pause** for player selection; an informational acknowledgement setting never picks a building or vault silently.
- The current encounter UI is a **basic offline placeholder** with transparent choice amounts. A future minigame integration should replace it rather than adding a second economy controller.

### 4. Small, meaningful feedback

- Three.js dice now have six numbered pip faces and animate towards the committed result.
- Tokens advance tile-by-tile, with a subtle hop while moving.
- Buttons scale briefly on press, coins/material indicators react to changed amounts, and toasts enter with restrained spring motion.
- A **Build Momentum** indicator awards **+3 materials every fifth completed roll**, independent of dice multiplier; this is a transparent progress milestone, not adjusted chance.
- Prefers-reduced-motion suppresses CSS feedback animations. Rendering-loop transitions should also be reduced in a later accessibility pass.

## Behaviour checks

The pure \`src/game/rollRules.ts\` rules can be tested via:

\`\`\`sh
cd web
npm install
npm run test:rules
npm run typecheck
npm run build
\`\`\`

The test script checks board length/wrap, reward classes, affordable multipliers, auto-budget adaptation and injected-RNG dice results. Running these commands and Android on-device acceptance has **not** been verified by this document.

Important manual acceptance cases:

1. Starting a 5-roll auto batch cannot initiate a sixth roll.
2. With 35 energy and a 10× preference, auto spending cannot exceed its displayed budget.
3. Turning Adapt OFF stops rather than silently changing the stake.
4. Pressing STOP during dice movement allows the current roll to resolve **once** but starts no further roll.
5. AUTO OK OFF displays an acknowledgement, pauses auto and resumes only after acknowledgement.
6. Landing on a raid/heist pauses regardless of AUTO OK; selecting a target pays once.
7. Backgrounding the game terminates queued auto-play.
8. A 3D die settles with the correct pip number while the board token traverses exactly the rolled sum.
9. The five-roll momentum bonus increments materials once.
10. On small Android screens, all controls remain reachable and don't overlap the board.

## Follow-up priorities

- **P0:** unify \`web/\` and the bundled Android WebView asset build. This prototype branch only changes the R3F client.
- **P0:** implement versioned web save/recovery, including already committed roll state across page reload.
- **P1:** add reducer/state-machine integration tests for double-spend, repeated events and interrupted animations. Present scripts only test pure helpers so far.
- **P1:** bring richer encounters from the separate minigame lab into a **single reward resolver**, with unique event IDs and authoritative host validation.
- **P1:** design satisfying yet subtle landing VFX/audio/haptics and character expression without rapid repeated sounds.
- **P1:** measure mobile performance, adjust camera framing, token movement timing and visual texture quality.
- **P2:** A/B test or playtest whether 5-roll momentum and multiplier step sizes feel engaging rather than automatic/unfair; keep all tuning values config-driven.
- **P2:** add optional auto-roll end conditions such as stop at a milestone or reserve minimum dice energy, with explicit controls and predictable limits.
