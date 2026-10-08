package com.example

import com.example.blockbound.model.Building
import com.example.blockbound.model.District
import com.example.blockbound.model.TileType
import com.example.blockbound.voxel.VoxelModels
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExampleUnitTest {

    @Test
    fun testBoardLoopWrapAround() {
        // Board has 32 tiles (indices 0..31)
        val initialIndex = 28
        val rollSteps = 6
        val newIndex = (initialIndex + rollSteps) % 32
        assertEquals(2, newIndex)
    }

    @Test
    fun testTileCoordinatePositions() {
        // Corner 0: (0, 0, 0)
        val (c0x, c0y, _) = VoxelModels.getTilePosition(0)
        assertEquals(0f, c0x, 0.01f)
        assertEquals(0f, c0y, 0.01f)

        // Corner 8: (12, 0, 0)
        val (c8x, c8y, _) = VoxelModels.getTilePosition(8)
        assertEquals(12f, c8x, 0.01f)
        assertEquals(0f, c8y, 0.01f)

        // Corner 16: (12, 12, 0)
        val (c16x, c16y, _) = VoxelModels.getTilePosition(16)
        assertEquals(12f, c16x, 0.01f)
        assertEquals(12f, c16y, 0.01f)

        // Corner 24: (0, 12, 0)
        val (c24x, c24y, _) = VoxelModels.getTilePosition(24)
        assertEquals(0f, c24x, 0.01f)
        assertEquals(12f, c24y, 0.01f)
    }

    @Test
    fun testBuildingUpgradeProgression() {
        val building = Building(
            id = "test_cottage",
            name = "Cozy Cottage",
            icon = "🏡",
            currentTier = 0,
            maxTier = 4,
            baseCost = 5000L,
            baseMaterials = 2,
            isDamaged = false,
            repairCost = 1500L,
            description = "Test description"
        )

        assertFalse(building.isMaxTier)
        assertEquals(5000L, building.costForNextTier())
        assertEquals(2, building.materialsForNextTier())

        val tier1 = building.copy(currentTier = 1)
        assertEquals(12500L, tier1.costForNextTier())
        assertEquals(4, tier1.materialsForNextTier())

        val tier4 = building.copy(currentTier = 4)
        assertTrue(tier4.isMaxTier)
        assertEquals(0L, tier4.costForNextTier())
        assertEquals(0, tier4.materialsForNextTier())
    }

    @Test
    fun testDistrictCompletionCalculation() {
        val buildings = listOf(
            Building("b1", "B1", "🏛️", 4, 4, 1000L, 2, false, 500L, ""),
            Building("b2", "B2", "🥖", 4, 4, 1000L, 2, false, 500L, "")
        )
        val district = District(
            id = 0,
            name = "Test District",
            subtitle = "Test",
            themeColorHex = 0xFFFFFFFF,
            buildings = buildings,
            isUnlocked = true
        )

        assertEquals(8, district.totalTiers)
        assertEquals(8, district.completedTiers)
        assertTrue(district.isFullyCompleted)
        assertEquals(1.0f, district.progressFraction, 0.001f)
    }

    @Test
    fun testShieldCapLogic() {
        val maxShields = 3
        var currentShields = 2

        // Gaining 1 shield
        currentShields = (currentShields + 1).coerceAtMost(maxShields)
        assertEquals(3, currentShields)

        // Attempting to exceed cap
        currentShields = (currentShields + 1).coerceAtMost(maxShields)
        assertEquals(3, currentShields)
    }

    @Test
    fun testQuestCompletionAndProgressFraction() {
        val quest = com.example.blockbound.model.Quest(
            id = "quest_test",
            title = "Roll the Dice",
            target = 10,
            progress = 7,
            coinReward = 20000L,
            energyReward = 10
        )

        assertFalse(quest.isCompleted)
        assertEquals(0.7f, quest.progressFraction, 0.001f)

        val completedQuest = quest.copy(progress = 10)
        assertTrue(completedQuest.isCompleted)
        assertEquals(1.0f, completedQuest.progressFraction, 0.001f)
    }

    @Test
    fun testDailyStreakLadderRewards() {
        val rewards = com.example.blockbound.game.GameViewModel.STREAK_REWARDS
        assertEquals(7, rewards.size)

        // Day 1
        assertEquals(1, rewards[0].day)
        assertEquals(15000L, rewards[0].coins)
        assertEquals(10, rewards[0].energy)

        // Day 7 Mega Reward
        val day7 = rewards[6]
        assertEquals(7, day7.day)
        assertEquals(300000L, day7.coins)
        assertEquals(70, day7.energy)
        assertTrue(day7.bonusShield)
    }
}
