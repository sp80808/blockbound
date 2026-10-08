package com.example.blockbound.model

enum class TileType(val label: String, val iconSymbol: String) {
    GO_START("START / GO", "🏁"),
    COINS_SMALL("Coin Pouch", "💰"),
    COINS_MEDIUM("Coin Chest", "🪙"),
    COINS_LARGE("Gold Vault", "👑"),
    MATERIALS("Voxel Blocks", "🧱"),
    SHIELD("Aegis Shield", "🛡️"),
    RAID("Town Raid", "⚔️"),
    HEIST("Vault Heist", "🗝️"),
    MYSTERY("Mystery Box", "❓"),
    ENERGY_STATION("Dice Energy", "⚡"),
    DISTRICT_BONUS("District Star", "⭐"),
    JACKPOT("Mega Jackpot", "🎰")
}

data class BoardTile(
    val index: Int,
    val type: TileType,
    val name: String,
    val description: String,
    val baseCoins: Long = 0L,
    val baseMaterials: Int = 0,
    val baseEnergy: Int = 0,
    val colorHex: Long = 0xFF4F46E5
)

data class Building(
    val id: String,
    val name: String,
    val icon: String,
    val currentTier: Int = 0, // 0 = empty plot, 1..4 = constructed tiers
    val maxTier: Int = 4,
    val baseCost: Long,
    val baseMaterials: Int,
    val isDamaged: Boolean = false,
    val repairCost: Long = 2500L,
    val description: String
) {
    val isMaxTier: Boolean get() = currentTier >= maxTier

    fun costForNextTier(): Long {
        if (isMaxTier) return 0L
        return (baseCost * (1.0 + currentTier * 1.5)).toLong()
    }

    fun materialsForNextTier(): Int {
        if (isMaxTier) return 0
        return baseMaterials + currentTier * 2
    }
}

data class District(
    val id: Int,
    val name: String,
    val subtitle: String,
    val themeColorHex: Long,
    val buildings: List<Building>,
    val isUnlocked: Boolean = false
) {
    val totalTiers: Int get() = buildings.sumOf { it.maxTier }
    val completedTiers: Int get() = buildings.sumOf { it.currentTier }
    val isFullyCompleted: Boolean get() = completedTiers >= totalTiers
    val progressFraction: Float get() = if (totalTiers > 0) completedTiers.toFloat() / totalTiers else 0f
}

data class Quest(
    val id: String,
    val title: String,
    val target: Int,
    val progress: Int = 0,
    val coinReward: Long,
    val energyReward: Int,
    val isClaimed: Boolean = false,
    val icon: String = "🎯",
    val category: String = "DAILY" // "DAILY", "RAID", "EVENT", "BUILD"
) {
    val isCompleted: Boolean get() = progress >= target
    val progressFraction: Float get() = if (target > 0) (progress.toFloat() / target).coerceIn(0f, 1f) else 0f
}

data class DailyStreakReward(
    val day: Int,
    val coins: Long,
    val energy: Int,
    val materials: Int = 0,
    val multiplierBonus: Int = 1,
    val bonusShield: Boolean = false,
    val description: String
)

enum class LootTargetType { COINS, MATERIALS, ENERGY }

data class FlyingLoot(
    val id: Long,
    val icon: String,
    val startXFraction: Float, // 0..1 screen relative
    val startYFraction: Float,
    val targetType: LootTargetType,
    val amount: Long
)

sealed class GameDialogState {
    object None : GameDialogState()
    object UpgradeTown : GameDialogState()
    data class RaidEvent(val opponentName: String, val targetBuildings: List<RaidTarget>) : GameDialogState()
    data class HeistEvent(val safes: List<HeistSafe>) : GameDialogState()
    data class MysteryReward(val title: String, val message: String, val coins: Long, val materials: Int, val energy: Int) : GameDialogState()
    data class DistrictMilestone(val districtName: String, val nextDistrictName: String, val coinsReward: Long, val diceReward: Int) : GameDialogState()
    object Quests : GameDialogState()
    object Settings : GameDialogState()
}

data class RaidTarget(
    val id: Int,
    val name: String,
    val tier: Int,
    val isShielded: Boolean,
    val lootCoins: Long
)

data class HeistSafe(
    val id: Int,
    val label: String,
    val coins: Long,
    val materials: Int,
    val isOpened: Boolean = false,
    val isJackpot: Boolean = false
)

data class RollOutcome(
    val die1: Int,
    val die2: Int,
    val totalSteps: Int,
    val isDoubles: Boolean
)
