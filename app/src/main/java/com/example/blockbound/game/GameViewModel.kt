package com.example.blockbound.game

import android.app.Application
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.blockbound.audio.SoundManager
import com.example.blockbound.data.SaveManager
import com.example.blockbound.model.BoardTile
import com.example.blockbound.model.Building
import com.example.blockbound.model.District
import com.example.blockbound.model.GameDialogState
import com.example.blockbound.model.HeistSafe
import com.example.blockbound.model.Quest
import com.example.blockbound.model.RaidTarget
import com.example.blockbound.model.RollOutcome
import com.example.blockbound.model.TileType
import com.example.blockbound.voxel.VoxelParticle
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

data class GameUiState(
    val coins: Long = 35000L,
    val materials: Int = 16,
    val diceEnergy: Int = 35,
    val maxEnergy: Int = 50,
    val shields: Int = 2,
    val maxShields: Int = 3,
    val currentTileIndex: Int = 0,
    val targetTileIndex: Int = 0,
    val hopFraction: Float = 0f,
    val isHopping: Boolean = false,
    val currentDistrictIndex: Int = 0,
    val multiplier: Int = 1,
    val isRolling: Boolean = false,
    val isQuickRoll: Boolean = false,
    val die1Value: Int = 3,
    val die2Value: Int = 4,
    val lastRollTotal: Int = 7,
    val isDoubles: Boolean = false,
    val tiles: List<BoardTile> = emptyList(),
    val districts: List<District> = emptyList(),
    val quests: List<Quest> = emptyList(),
    val particles: List<VoxelParticle> = emptyList(),
    val activeDialog: GameDialogState = GameDialogState.None,
    val bannerNotification: String? = null,
    val totalRolls: Int = 0,
    val totalRaids: Int = 0,
    val totalUpgrades: Int = 0,
    val dailyStreak: Int = 3,
    val isSoundEnabled: Boolean = true,
    val isHapticsEnabled: Boolean = true
)

class GameViewModel(application: Application) : AndroidViewModel(application) {

    val soundManager = SoundManager(application)
    private val saveManager = SaveManager(application)

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    private var regenJob: Job? = null
    private var particleJob: Job? = null

    init {
        initGameData()
        startEnergyRegenLoop()
        startParticleSimulation()
    }

    private fun initGameData() {
        val boardTiles = generate32Tiles()
        val defaultDistricts = generateDistricts()
        val defaultQuests = generateQuests()

        // Restore save data if present
        val restoredDistricts = saveManager.restoreDistricts(defaultDistricts)
        val restoredQuests = saveManager.restoreQuests(defaultQuests)
        val savedCoins = saveManager.loadCoins(35000L)
        val savedMaterials = saveManager.loadMaterials(16)
        val savedEnergy = saveManager.loadEnergy(35)
        val savedShields = saveManager.loadShields(2)
        val savedTileIdx = saveManager.loadTileIndex(0)
        val savedDistIdx = saveManager.loadDistrictIndex(0)
        val savedRolls = saveManager.loadTotalRolls()
        val savedRaids = saveManager.loadTotalRaids()
        val savedUpgrades = saveManager.loadTotalUpgrades()

        _uiState.update {
            it.copy(
                coins = savedCoins,
                materials = savedMaterials,
                diceEnergy = savedEnergy,
                shields = savedShields,
                currentTileIndex = savedTileIdx,
                targetTileIndex = savedTileIdx,
                currentDistrictIndex = savedDistIdx.coerceIn(0, restoredDistricts.size - 1),
                tiles = boardTiles,
                districts = restoredDistricts,
                quests = restoredQuests,
                totalRolls = savedRolls,
                totalRaids = savedRaids,
                totalUpgrades = savedUpgrades,
                isSoundEnabled = soundManager.isSoundEnabled,
                isHapticsEnabled = soundManager.isHapticsEnabled
            )
        }
    }

    /**
     * Build the 32-tile looping board.
     */
    private fun generate32Tiles(): List<BoardTile> {
        val types = listOf(
            TileType.GO_START,        // 0 (Corner)
            TileType.COINS_SMALL,     // 1
            TileType.MATERIALS,       // 2
            TileType.COINS_MEDIUM,    // 3
            TileType.SHIELD,          // 4
            TileType.COINS_SMALL,     // 5
            TileType.RAID,            // 6
            TileType.ENERGY_STATION,  // 7
            TileType.HEIST,           // 8 (Corner)
            TileType.COINS_MEDIUM,    // 9
            TileType.MYSTERY,         // 10
            TileType.MATERIALS,       // 11
            TileType.COINS_LARGE,     // 12
            TileType.SHIELD,          // 13
            TileType.COINS_SMALL,     // 14
            TileType.DISTRICT_BONUS,  // 15
            TileType.JACKPOT,         // 16 (Corner)
            TileType.COINS_MEDIUM,    // 17
            TileType.RAID,            // 18
            TileType.MATERIALS,       // 19
            TileType.COINS_SMALL,     // 20
            TileType.ENERGY_STATION,  // 21
            TileType.HEIST,           // 22
            TileType.COINS_LARGE,     // 23
            TileType.MYSTERY,         // 24 (Corner)
            TileType.COINS_MEDIUM,    // 25
            TileType.SHIELD,          // 26
            TileType.MATERIALS,       // 27
            TileType.COINS_SMALL,     // 28
            TileType.RAID,            // 29
            TileType.DISTRICT_BONUS,  // 30
            TileType.COINS_LARGE      // 31
        )

        return types.mapIndexed { idx, type ->
            BoardTile(
                index = idx,
                type = type,
                name = type.label,
                description = when (type) {
                    TileType.GO_START -> "Collect +25,000 Coins & +10 Energy"
                    TileType.COINS_SMALL -> "Pouch of Gold"
                    TileType.COINS_MEDIUM -> "Chest of Doubloons"
                    TileType.COINS_LARGE -> "Vault of Gold"
                    TileType.MATERIALS -> "Construction Voxel Blocks"
                    TileType.SHIELD -> "Aegis Shield Protection"
                    TileType.RAID -> "Assault Opponent District"
                    TileType.HEIST -> "Crack Vault Safes"
                    TileType.MYSTERY -> "Lucky Surprise Card"
                    TileType.ENERGY_STATION -> "Dice Battery Recharge"
                    TileType.DISTRICT_BONUS -> "District Milestone Bonus"
                    TileType.JACKPOT -> "Mega Gold Jackpot"
                },
                baseCoins = when (type) {
                    TileType.COINS_SMALL -> 3500L
                    TileType.COINS_MEDIUM -> 8500L
                    TileType.COINS_LARGE -> 20000L
                    TileType.JACKPOT -> 50000L
                    TileType.GO_START -> 25000L
                    else -> 0L
                },
                baseMaterials = if (type == TileType.MATERIALS) 4 else 0,
                baseEnergy = if (type == TileType.ENERGY_STATION) 8 else if (type == TileType.GO_START) 10 else 0
            )
        }
    }

    /**
     * Districts with 5 buildings each.
     */
    private fun generateDistricts(): List<District> {
        return listOf(
            District(
                id = 0,
                name = "Sunny Suburb",
                subtitle = "Charming countryside village with winding paths",
                themeColorHex = 0xFF10B981,
                isUnlocked = true,
                buildings = listOf(
                    Building("suburb_townhall", "Town Hall", "🏛️", 1, 4, 12000L, 4, false, 3000L, "Center of civic pride"),
                    Building("suburb_bakery", "Boulangerie", "🥖", 1, 4, 6000L, 2, false, 1500L, "Fresh artisan croissants"),
                    Building("suburb_cottage", "Oak Cottage", "🏡", 1, 4, 4500L, 2, false, 1200L, "Cozy brick residence"),
                    Building("suburb_windmill", "Windmill", "🌾", 0, 4, 8000L, 3, false, 2000L, "Flour mill with spinning sails"),
                    Building("suburb_fountain", "Central Park", "⛲", 0, 4, 10000L, 4, false, 2500L, "Lush park and marble fountain")
                )
            ),
            District(
                id = 1,
                name = "Candy Harbour",
                subtitle = "Pastel waterfront with confectionary docks",
                themeColorHex = 0xFFEC4899,
                isUnlocked = false,
                buildings = listOf(
                    Building("candy_lighthouse", "Sugar Lighthouse", "🗼", 0, 4, 25000L, 8, false, 5000L, "Beacon of glowing caramel"),
                    Building("candy_parlour", "Ice Cream Emporium", "🍨", 0, 4, 18000L, 6, false, 4000L, "Triple-scoop sundae parlour"),
                    Building("candy_docks", "Pastel Piers", "⛵", 0, 4, 15000L, 5, false, 3500L, "Marshmallow boat docks"),
                    Building("candy_crane", "Gumball Crane", "🏗️", 0, 4, 20000L, 7, false, 4500L, "Giant gumball dispenser"),
                    Building("candy_palace", "Gingerbread Manor", "🏰", 0, 4, 30000L, 10, false, 6000L, "Royal confection palace")
                )
            ),
            District(
                id = 2,
                name = "Neon Metropolis",
                subtitle = "High-tech cyber grid glowing in the night",
                themeColorHex = 0xFF8B5CF6,
                isUnlocked = false,
                buildings = listOf(
                    Building("neon_tower", "Cyber Skyscraper", "🏢", 0, 4, 50000L, 12, false, 10000L, "Ultra-dense data hub"),
                    Building("neon_arcade", "Voxel Arcade", "🕹️", 0, 4, 35000L, 10, false, 8000L, "Retro holographic games"),
                    Building("neon_station", "Hover Station", "🚄", 0, 4, 40000L, 10, false, 8500L, "Maglev transport depot"),
                    Building("neon_matrix", "Quantum Core", "🔮", 0, 4, 60000L, 15, false, 12000L, "Pulsing cyber reactor"),
                    Building("neon_plaza", "Holo-Plaza", "✨", 0, 4, 45000L, 11, false, 9000L, "Neon digital amphitheater")
                )
            ),
            District(
                id = 3,
                name = "Pirate Bay",
                subtitle = "Secret smuggler's cove with wooden docks",
                themeColorHex = 0xFFF59E0B,
                isUnlocked = false,
                buildings = listOf(
                    Building("pirate_keep", "Captain's Fortress", "🏴‍☠️", 0, 4, 100000L, 20, false, 20000L, "Impenetrable cliffside fortress"),
                    Building("pirate_galleon", "Black Pearl Dock", "🚢", 0, 4, 75000L, 16, false, 15000L, "Flagship war galleon"),
                    Building("pirate_tavern", "Smuggler's Tavern", "🍺", 0, 4, 60000L, 14, false, 12000L, "Bustling dockside tavern"),
                    Building("pirate_vault", "Treasure Cavern", "👑", 0, 4, 90000L, 18, false, 18000L, "Hidden gold loot vault"),
                    Building("pirate_watchtower", "Lookout Perch", "🔭", 0, 4, 70000L, 15, false, 14000L, "High crow's nest beacon")
                )
            )
        )
    }

    private fun generateQuests(): List<Quest> {
        return listOf(
            Quest("quest_rolls", "Roll the Dice 15 times", 15, 0, 20000L, 10),
            Quest("quest_upgrade", "Upgrade Town Buildings 2 times", 2, 0, 30000L, 15),
            Quest("quest_raid", "Launch a Town Raid", 1, 0, 25000L, 12),
            Quest("quest_shield", "Hold maximum Shields (3)", 3, 2, 15000L, 8)
        )
    }

    // --- DICE ROLLING & BOARD NAVIGATION ---

    fun onRollClicked() {
        val state = _uiState.value
        val cost = state.multiplier
        if (state.isRolling || state.isHopping || state.diceEnergy < cost) return

        // 1. Deduct dice energy
        soundManager.playDiceRattle()
        _uiState.update {
            it.copy(
                isRolling = true,
                diceEnergy = it.diceEnergy - cost,
                totalRolls = it.totalRolls + 1
            )
        }
        updateQuestProgress("quest_rolls", 1)

        viewModelScope.launch {
            // Dice tumbling animation duration
            val rollTime = if (state.isQuickRoll) 400L else 900L
            delay(rollTime)

            val d1 = Random.nextInt(1, 7)
            val d2 = Random.nextInt(1, 7)
            val totalSteps = d1 + d2
            val isDoubles = (d1 == d2)

            soundManager.playDiceSettle()

            // Bonus on doubles
            var bonusEnergy = 0
            if (isDoubles) {
                bonusEnergy = 10
                soundManager.playJackpotFanfare()
            }

            _uiState.update {
                it.copy(
                    isRolling = false,
                    die1Value = d1,
                    die2Value = d2,
                    lastRollTotal = totalSteps,
                    isDoubles = isDoubles,
                    diceEnergy = (it.diceEnergy + bonusEnergy).coerceAtMost(it.maxEnergy),
                    bannerNotification = if (isDoubles) "🎉 DOUBLE LUCK! +10 FREE ROLLS!" else null
                )
            }

            // Step-by-step token hopping
            animateTokenMovement(totalSteps)
        }
    }

    private suspend fun animateTokenMovement(steps: Int) {
        val stepDuration = if (_uiState.value.isQuickRoll) 80L else 170L
        val current = _uiState.value.currentTileIndex

        for (step in 1..steps) {
            val fromTile = (current + step - 1) % 32
            val toTile = (current + step) % 32

            _uiState.update {
                it.copy(
                    isHopping = true,
                    currentTileIndex = fromTile,
                    targetTileIndex = toTile,
                    hopFraction = 0f
                )
            }

            // Sub-frame hop animation
            val frames = if (_uiState.value.isQuickRoll) 4 else 8
            for (f in 1..frames) {
                delay(stepDuration / frames)
                _uiState.update { it.copy(hopFraction = f.toFloat() / frames) }
            }

            soundManager.playHopStep(1.0f + (step * 0.04f))

            // Check if passed GO!
            if (toTile == 0 && step != steps) {
                val goBonusCoins = 25000L * _uiState.value.multiplier
                soundManager.playCoinReward()
                _uiState.update {
                    it.copy(
                        coins = it.coins + goBonusCoins,
                        bannerNotification = "🏁 PASSED START! +%,d Coins!".format(goBonusCoins)
                    )
                }
            }
        }

        val finalTileIdx = (current + steps) % 32
        _uiState.update {
            it.copy(
                isHopping = false,
                currentTileIndex = finalTileIdx,
                targetTileIndex = finalTileIdx,
                hopFraction = 0f
            )
        }

        // Resolve landing space
        resolveTileLanding(finalTileIdx)
    }

    /**
     * Trigger consequences of landing on a board space.
     */
    private fun resolveTileLanding(tileIndex: Int) {
        val tile = _uiState.value.tiles[tileIndex]
        val mult = _uiState.value.multiplier

        when (tile.type) {
            TileType.GO_START -> {
                soundManager.playJackpotFanfare()
                val coins = 30000L * mult
                val energy = 10
                _uiState.update {
                    it.copy(
                        coins = it.coins + coins,
                        diceEnergy = (it.diceEnergy + energy).coerceAtMost(it.maxEnergy),
                        bannerNotification = "🏁 LANDED ON GO! +%,d Coins & +$energy Energy!".format(coins)
                    )
                }
            }
            TileType.COINS_SMALL, TileType.COINS_MEDIUM, TileType.COINS_LARGE, TileType.JACKPOT -> {
                soundManager.playCoinReward()
                val reward = tile.baseCoins * mult
                _uiState.update {
                    it.copy(
                        coins = it.coins + reward,
                        bannerNotification = "💰 +%,d Coins!".format(reward)
                    )
                }
                spawnConfettiParticles(6.0f, 6.0f)
            }
            TileType.MATERIALS -> {
                soundManager.playGemReward()
                val mats = tile.baseMaterials * mult
                _uiState.update {
                    it.copy(
                        materials = it.materials + mats,
                        bannerNotification = "🧱 +$mats Voxel Bricks!"
                    )
                }
            }
            TileType.SHIELD -> {
                soundManager.playShieldBlock()
                val curShields = _uiState.value.shields
                if (curShields < 3) {
                    _uiState.update {
                        it.copy(
                            shields = curShields + 1,
                            bannerNotification = "🛡️ +1 AEGIS SHIELD EQUIPPED!"
                        )
                    }
                    updateQuestProgress("quest_shield", 1)
                } else {
                    val bonus = 10000L * mult
                    _uiState.update {
                        it.copy(
                            coins = it.coins + bonus,
                            bannerNotification = "🛡️ Shields Full! Converted to +%,d Coins!".format(bonus)
                        )
                    }
                }
            }
            TileType.ENERGY_STATION -> {
                soundManager.playGemReward()
                val eng = tile.baseEnergy * mult
                _uiState.update {
                    it.copy(
                        diceEnergy = (it.diceEnergy + eng).coerceAtMost(it.maxEnergy),
                        bannerNotification = "⚡ +$eng DICE ENERGY RECHARGED!"
                    )
                }
            }
            TileType.RAID -> {
                // Launch Town Raid Dialog
                val names = listOf("Captain Voxel", "Mayor Pixel", "Sir Cubicon", "Duchess Block")
                val opponent = names.random()
                val targets = listOf(
                    RaidTarget(1, "Clocktower", 3, Random.nextBoolean(), 45000L * mult),
                    RaidTarget(2, "Bakery", 2, Random.nextBoolean(), 30000L * mult),
                    RaidTarget(3, "Landmark Plaza", 4, Random.nextBoolean(), 65000L * mult)
                )
                _uiState.update { it.copy(activeDialog = GameDialogState.RaidEvent(opponent, targets)) }
            }
            TileType.HEIST -> {
                // Launch Vault Heist Dialog
                val safes = (0..8).map { idx ->
                    val isJackpot = (idx == 4)
                    val coins = if (isJackpot) 80000L * mult else Random.nextLong(20000L, 45000L) * mult
                    val mats = if (Random.nextBoolean()) 6 * mult else 0
                    HeistSafe(idx, "Safe #${idx + 1}", coins, mats, false, isJackpot)
                }
                _uiState.update { it.copy(activeDialog = GameDialogState.HeistEvent(safes)) }
            }
            TileType.MYSTERY -> {
                soundManager.playJackpotFanfare()
                val coins = 25000L * mult
                val mats = 5 * mult
                val energy = 8
                _uiState.update {
                    it.copy(
                        activeDialog = GameDialogState.MysteryReward(
                            title = "Lucky Mystery Vault!",
                            message = "The mysterious golden chest unlocked and rewarded rich treasures!",
                            coins = coins,
                            materials = mats,
                            energy = energy
                        )
                    )
                }
            }
            TileType.DISTRICT_BONUS -> {
                soundManager.playCoinReward()
                val coins = 20000L * mult
                val mats = 6 * mult
                _uiState.update {
                    it.copy(
                        coins = it.coins + coins,
                        materials = it.materials + mats,
                        bannerNotification = "⭐ DISTRICT MILESTONE PACK! +%,d Coins & +$mats Bricks!".format(coins)
                    )
                }
            }
        }

        saveCurrentState()
    }

    // --- BUILDING CONSTRUCTION & UPGRADES ---

    fun upgradeBuilding(buildingId: String) {
        val state = _uiState.value
        val curDist = state.districts[state.currentDistrictIndex]
        val building = curDist.buildings.find { it.id == buildingId } ?: return

        val cost = building.costForNextTier()
        val matCost = building.materialsForNextTier()

        if (state.coins < cost || state.materials < matCost || building.isMaxTier) return

        soundManager.playBlockSnap()
        spawnConfettiParticles(6f, 6f)

        val updatedBuildings = curDist.buildings.map { b ->
            if (b.id == buildingId) b.copy(currentTier = b.currentTier + 1) else b
        }
        val updatedDistrict = curDist.copy(buildings = updatedBuildings)
        val updatedDistricts = state.districts.map { d ->
            if (d.id == curDist.id) updatedDistrict else d
        }

        _uiState.update {
            it.copy(
                coins = it.coins - cost,
                materials = it.materials - matCost,
                districts = updatedDistricts,
                totalUpgrades = it.totalUpgrades + 1,
                bannerNotification = "🔨 UPGRADED ${building.name.uppercase()} TO TIER ${building.currentTier + 1}!"
            )
        }

        soundManager.playUpgradeComplete()
        updateQuestProgress("quest_upgrade", 1)

        // Check if entire district completed!
        if (updatedDistrict.isFullyCompleted) {
            handleDistrictCompletion(updatedDistrict)
        }

        saveCurrentState()
    }

    fun repairBuilding(buildingId: String) {
        val state = _uiState.value
        val curDist = state.districts[state.currentDistrictIndex]
        val building = curDist.buildings.find { it.id == buildingId } ?: return

        if (state.coins < building.repairCost || !building.isDamaged) return

        soundManager.playBlockSnap()
        val updatedBuildings = curDist.buildings.map { b ->
            if (b.id == buildingId) b.copy(isDamaged = false) else b
        }
        val updatedDistricts = state.districts.map { d ->
            if (d.id == curDist.id) d.copy(buildings = updatedBuildings) else d
        }

        _uiState.update {
            it.copy(
                coins = it.coins - building.repairCost,
                districts = updatedDistricts,
                bannerNotification = "✨ REPAIRED ${building.name.uppercase()}!"
            )
        }

        saveCurrentState()
    }

    private fun handleDistrictCompletion(district: District) {
        soundManager.playJackpotFanfare()
        val nextDistIdx = (district.id + 1).coerceAtMost(_uiState.value.districts.size - 1)
        val nextDistName = _uiState.value.districts[nextDistIdx].name

        // Unlock next district
        val updatedDistricts = _uiState.value.districts.map { d ->
            if (d.id == nextDistIdx) d.copy(isUnlocked = true) else d
        }

        val bonusCoins = 150000L
        val bonusDice = 25

        _uiState.update {
            it.copy(
                districts = updatedDistricts,
                activeDialog = GameDialogState.DistrictMilestone(
                    districtName = district.name,
                    nextDistrictName = nextDistName,
                    coinsReward = bonusCoins,
                    diceReward = bonusDice
                )
            )
        }
    }

    fun advanceToNextDistrict() {
        val state = _uiState.value
        val nextIdx = (state.currentDistrictIndex + 1).coerceAtMost(state.districts.size - 1)
        _uiState.update {
            it.copy(
                currentDistrictIndex = nextIdx,
                activeDialog = GameDialogState.None,
                bannerNotification = "🌟 WELCOME TO ${state.districts[nextIdx].name.uppercase()}!"
            )
        }
        saveCurrentState()
    }

    // --- MINI-GAMES RESOLUTION ---

    fun onRaidCompleted(loot: Long, wasShielded: Boolean) {
        _uiState.update {
            it.copy(
                coins = it.coins + loot,
                totalRaids = it.totalRaids + 1,
                activeDialog = GameDialogState.None,
                bannerNotification = if (wasShielded) "⚔️ Raid: Shield deflected! Looted +%,d coins!".format(loot)
                                     else "💥 Raid Direct Hit! Demolished building for +%,d coins!".format(loot)
            )
        }
        updateQuestProgress("quest_raid", 1)
        saveCurrentState()
    }

    fun onHeistCompleted(totalCoins: Long, totalMats: Int) {
        _uiState.update {
            it.copy(
                coins = it.coins + totalCoins,
                materials = it.materials + totalMats,
                activeDialog = GameDialogState.None,
                bannerNotification = "🗝️ Bank Vault Looted: +%,d Coins & +$totalMats Bricks!".format(totalCoins)
            )
        }
        saveCurrentState()
    }

    fun onEventRewardClaimed(coins: Long, mats: Int, energy: Int) {
        _uiState.update {
            it.copy(
                coins = it.coins + coins,
                materials = it.materials + mats,
                diceEnergy = (it.diceEnergy + energy).coerceAtMost(it.maxEnergy),
                activeDialog = GameDialogState.None
            )
        }
        saveCurrentState()
    }

    // --- MULTIPLIER & SETTINGS ---

    fun cycleMultiplier() {
        soundManager.playClick()
        val cur = _uiState.value.multiplier
        val next = when (cur) {
            1 -> 2
            2 -> 3
            3 -> 5
            else -> 1
        }
        _uiState.update { it.copy(multiplier = next) }
    }

    fun toggleQuickRoll() {
        soundManager.playClick()
        _uiState.update { it.copy(isQuickRoll = !it.isQuickRoll) }
    }

    fun openDialog(dialog: GameDialogState) {
        soundManager.playClick()
        _uiState.update { it.copy(activeDialog = dialog) }
    }

    fun closeDialog() {
        soundManager.playClick()
        _uiState.update { it.copy(activeDialog = GameDialogState.None) }
    }

    fun toggleSound(enabled: Boolean) {
        soundManager.isSoundEnabled = enabled
        _uiState.update { it.copy(isSoundEnabled = enabled) }
    }

    fun toggleHaptics(enabled: Boolean) {
        soundManager.isHapticsEnabled = enabled
        _uiState.update { it.copy(isHapticsEnabled = enabled) }
    }

    fun claimQuest(questId: String) {
        val state = _uiState.value
        val quest = state.quests.find { it.id == questId } ?: return
        if (!quest.isCompleted || quest.isClaimed) return

        soundManager.playCoinReward()
        val updated = state.quests.map { q ->
            if (q.id == questId) q.copy(isClaimed = true) else q
        }
        _uiState.update {
            it.copy(
                coins = it.coins + quest.coinReward,
                diceEnergy = (it.diceEnergy + quest.energyReward).coerceAtMost(it.maxEnergy),
                quests = updated,
                bannerNotification = "🎯 Quest Claimed: +%,d Coins & +${quest.energyReward}⚡!".format(quest.coinReward)
            )
        }
        saveCurrentState()
    }

    private fun updateQuestProgress(questId: String, increment: Int) {
        val state = _uiState.value
        val updated = state.quests.map { q ->
            if (q.id == questId && !q.isClaimed) {
                q.copy(progress = (q.progress + increment).coerceAtMost(q.target))
            } else q
        }
        _uiState.update { it.copy(quests = updated) }
    }

    fun resetGameProgress() {
        soundManager.playClick()
        val defaultDistricts = generateDistricts()
        val defaultQuests = generateQuests()
        _uiState.update {
            it.copy(
                coins = 35000L,
                materials = 16,
                diceEnergy = 35,
                shields = 2,
                currentTileIndex = 0,
                targetTileIndex = 0,
                currentDistrictIndex = 0,
                districts = defaultDistricts,
                quests = defaultQuests,
                activeDialog = GameDialogState.None,
                bannerNotification = "🔄 Game progress reset to vertical slice default!"
            )
        }
        saveCurrentState()
    }

    // --- PARTICLES & REGEN LOOPS ---

    private fun spawnConfettiParticles(centerX: Float, centerY: Float) {
        val colors = listOf(
            Color(0xFFFBBF24), Color(0xFFEF4444), Color(0xFF10B981),
            Color(0xFF3B82F6), Color(0xFFEC4899), Color(0xFF8B5CF6)
        )
        val newParticles = (1..20).map {
            val angle = Random.nextFloat() * 2f * kotlin.math.PI.toFloat()
            val speed = Random.nextFloat() * 0.4f + 0.1f
            VoxelParticle(
                x = centerX,
                y = centerY,
                z = 1.0f,
                vx = kotlin.math.cos(angle) * speed,
                vy = kotlin.math.sin(angle) * speed,
                vz = Random.nextFloat() * 0.5f + 0.3f,
                color = colors.random(),
                life = 1.0f,
                maxLife = 1.0f,
                size = Random.nextFloat() * 4f + 4f
            )
        }
        _uiState.update { it.copy(particles = it.particles + newParticles) }
    }

    private fun startParticleSimulation() {
        particleJob = viewModelScope.launch {
            while (true) {
                delay(33) // ~30 fps particle physics tick
                val current = _uiState.value.particles
                if (current.isNotEmpty()) {
                    val updated = current.mapNotNull { p ->
                        p.x += p.vx
                        p.y += p.vy
                        p.z += p.vz
                        p.vz -= 0.03f // Gravity
                        p.life -= 0.04f
                        if (p.isAlive) p else null
                    }
                    _uiState.update { it.copy(particles = updated) }
                }
            }
        }
    }

    private fun startEnergyRegenLoop() {
        regenJob = viewModelScope.launch {
            while (true) {
                delay(45000) // +1 energy every 45s
                if (_uiState.value.diceEnergy < _uiState.value.maxEnergy) {
                    _uiState.update {
                        it.copy(diceEnergy = (it.diceEnergy + 1).coerceAtMost(it.maxEnergy))
                    }
                    saveCurrentState()
                }
            }
        }
    }

    private fun saveCurrentState() {
        val s = _uiState.value
        saveManager.saveGame(
            coins = s.coins,
            materials = s.materials,
            energy = s.diceEnergy,
            shields = s.shields,
            tileIndex = s.currentTileIndex,
            districtIndex = s.currentDistrictIndex,
            totalRolls = s.totalRolls,
            totalRaids = s.totalRaids,
            totalUpgrades = s.totalUpgrades,
            lastRegenTime = System.currentTimeMillis(),
            districts = s.districts,
            quests = s.quests
        )
    }

    fun dismissBanner() {
        _uiState.update { it.copy(bannerNotification = null) }
    }
}
