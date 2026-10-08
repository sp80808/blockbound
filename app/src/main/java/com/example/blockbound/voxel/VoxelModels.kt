package com.example.blockbound.voxel

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import com.example.blockbound.model.BoardTile
import com.example.blockbound.model.Building
import com.example.blockbound.model.TileType

object VoxelModels {

    /**
     * Map each of the 32 perimeter board tile indices to 3D grid space.
     * Board size is 8x8 cells, 32 perimeter positions.
     */
    fun getTilePosition(index: Int): Triple<Float, Float, Float> {
        val i = (index % 32 + 32) % 32
        return when {
            i in 0..8 -> Triple(i * 1.5f, 0f, 0f)
            i in 9..16 -> Triple(12f, (i - 8) * 1.5f, 0f)
            i in 17..24 -> Triple(12f - (i - 16) * 1.5f, 12f, 0f)
            else -> Triple(0f, 12f - (i - 24) * 1.5f, 0f)
        }
    }

    /**
     * Generate 3D voxel cubes for a board tile.
     */
    fun createTileVoxels(tile: BoardTile, isCharacterHere: Boolean): List<VoxelCube> {
        val (tx, ty, tz) = getTilePosition(tile.index)
        val cubes = mutableListOf<VoxelCube>()

        val baseColor = when (tile.type) {
            TileType.GO_START -> Color(0xFF10B981) // Emerald
            TileType.COINS_SMALL, TileType.COINS_MEDIUM, TileType.COINS_LARGE -> Color(0xFFF59E0B) // Amber
            TileType.MATERIALS -> Color(0xFFEC4899) // Pink Voxel
            TileType.SHIELD -> Color(0xFF06B6D4) // Cyan Aegis
            TileType.RAID -> Color(0xFFEF4444) // Red Cross-Swords
            TileType.HEIST -> Color(0xFF8B5CF6) // Violet Vault
            TileType.MYSTERY -> Color(0xFFF97316) // Orange Surprise
            TileType.ENERGY_STATION -> Color(0xFFEAB308) // Yellow Lightning
            TileType.DISTRICT_BONUS -> Color(0xFF6366F1) // Indigo Star
            TileType.JACKPOT -> Color(0xFFD946EF) // Magenta Jackpot
        }

        val tileColor = if (isCharacterHere) Color(0xFFFDE047) else baseColor

        // Main tile base slab (4x4 micro-voxels or 1 larger slab)
        cubes.add(
            VoxelCube(
                x = tx,
                y = ty,
                z = tz,
                size = 1.3f,
                color = tileColor,
                isHighlighted = isCharacterHere
            )
        )

        // Raised border / corner studs
        val studColor = if (isCharacterHere) Color(0xFFFFFFFF) else Color(0xFF1E1B4B)
        cubes.add(VoxelCube(tx - 0.45f, ty - 0.45f, tz + 0.35f, 0.25f, studColor))
        cubes.add(VoxelCube(tx + 0.45f, ty - 0.45f, tz + 0.35f, 0.25f, studColor))
        cubes.add(VoxelCube(tx - 0.45f, ty + 0.45f, tz + 0.35f, 0.25f, studColor))
        cubes.add(VoxelCube(tx + 0.45f, ty + 0.45f, tz + 0.35f, 0.25f, studColor))

        // Center feature emblem cube
        val emblemColor = when (tile.type) {
            TileType.GO_START -> Color(0xFF34D399)
            TileType.SHIELD -> Color(0xFF38BDF8)
            TileType.RAID -> Color(0xFFF87171)
            TileType.HEIST -> Color(0xFFA78BFA)
            TileType.MATERIALS -> Color(0xFFF472B6)
            TileType.ENERGY_STATION -> Color(0xFFFACC15)
            else -> Color(0xFFFDE68A)
        }
        cubes.add(VoxelCube(tx, ty, tz + 0.45f, 0.55f, emblemColor))

        return cubes
    }

    /**
     * Character token ("Blocky") 3D voxel model.
     * Supports animated hop trajectory via hopOffset.
     */
    fun createCharacterVoxels(
        currentTileIdx: Int,
        targetTileIdx: Int,
        hopFraction: Float,
        hopHeight: Float
    ): List<VoxelCube> {
        val (p1x, p1y, p1z) = getTilePosition(currentTileIdx)
        val (p2x, p2y, p2z) = getTilePosition(targetTileIdx)

        val curX = p1x + (p2x - p1x) * hopFraction
        val curY = p1y + (p2y - p1y) * hopFraction
        val curZ = p1z + (p2z - p1z) * hopFraction + hopHeight + 0.8f

        val cubes = mutableListOf<VoxelCube>()

        // Shadow under token
        cubes.add(VoxelCube(curX, curY, 0.2f, 0.7f, Color(0x66000000)))

        // Shoes
        cubes.add(VoxelCube(curX - 0.2f, curY, curZ - 0.35f, 0.22f, Color(0xFF3B82F6)))
        cubes.add(VoxelCube(curX + 0.2f, curY, curZ - 0.35f, 0.22f, Color(0xFF3B82F6)))

        // Torso / Jacket (Bright Orange)
        cubes.add(VoxelCube(curX, curY, curZ, 0.45f, Color(0xFFF97316)))

        // Backpack (Brown)
        cubes.add(VoxelCube(curX, curY - 0.28f, curZ, 0.3f, Color(0xFF92400E)))

        // Head (Peach skin)
        cubes.add(VoxelCube(curX, curY, curZ + 0.45f, 0.42f, Color(0xFFFED7AA)))

        // Face eyes (Navy dots)
        cubes.add(VoxelCube(curX - 0.12f, curY + 0.22f, curZ + 0.48f, 0.1f, Color(0xFF0F172A)))
        cubes.add(VoxelCube(curX + 0.12f, curY + 0.22f, curZ + 0.48f, 0.1f, Color(0xFF0F172A)))

        // Explorer Hat (Golden Yellow cap)
        cubes.add(VoxelCube(curX, curY, curZ + 0.72f, 0.48f, Color(0xFFEAB308)))
        // Hat brim
        cubes.add(VoxelCube(curX, curY + 0.15f, curZ + 0.65f, 0.52f, Color(0xFFCA8A04)))

        return cubes
    }

    /**
     * Coordinates for the 5 town plots in the courtyard.
     */
    fun getBuildingPlotPosition(buildingIndex: Int): Triple<Float, Float, Float> {
        return when (buildingIndex) {
            0 -> Triple(6f, 6f, 0f)       // Central Landmark / Town Hall
            1 -> Triple(3.5f, 3.5f, 0f)   // Bakery / Cottage 1
            2 -> Triple(8.5f, 3.5f, 0f)   // Residence / Cottage 2
            3 -> Triple(3.5f, 8.5f, 0f)   // Workshop / Arcade
            4 -> Triple(8.5f, 8.5f, 0f)   // Park & Monument
            else -> Triple(6f, 6f, 0f)
        }
    }

    /**
     * Generate 3D voxel structure for a town building across Tiers 0..4.
     */
    fun createBuildingVoxels(
        building: Building,
        buildingIndex: Int,
        animationProgress: Float = 1.0f
    ): List<VoxelCube> {
        val (bx, by, bz) = getBuildingPlotPosition(buildingIndex)
        val cubes = mutableListOf<VoxelCube>()
        val tier = building.currentTier

        // Base foundation plot slab
        val slabColor = if (building.isDamaged) Color(0xFF4B5563) else Color(0xFF94A3B8)
        cubes.add(VoxelCube(bx, by, bz, 1.8f, slabColor))

        if (building.isDamaged) {
            // Broken rubble & smoke indicators
            cubes.add(VoxelCube(bx - 0.4f, by + 0.3f, bz + 0.6f, 0.5f, Color(0xFF374151)))
            cubes.add(VoxelCube(bx + 0.3f, by - 0.4f, bz + 0.4f, 0.4f, Color(0xFF1F2937)))
            cubes.add(VoxelCube(bx, by, bz + 0.9f, 0.6f, Color(0xFF4B5563)))
            // Burning ember
            cubes.add(VoxelCube(bx + 0.2f, by + 0.2f, bz + 1.2f, 0.3f, Color(0xFFEF4444)))
            return cubes
        }

        when (tier) {
            0 -> {
                // Tier 0: Empty Construction Plot stakes + blueprint roll
                val postColor = Color(0xFFB45309)
                cubes.add(VoxelCube(bx - 0.7f, by - 0.7f, bz + 0.4f, 0.25f, postColor))
                cubes.add(VoxelCube(bx + 0.7f, by - 0.7f, bz + 0.4f, 0.25f, postColor))
                cubes.add(VoxelCube(bx - 0.7f, by + 0.7f, bz + 0.4f, 0.25f, postColor))
                cubes.add(VoxelCube(bx + 0.7f, by + 0.7f, bz + 0.4f, 0.25f, postColor))
                // Blueprint roll in center
                cubes.add(VoxelCube(bx, by, bz + 0.3f, 0.5f, Color(0xFF38BDF8)))
            }
            1 -> {
                // Tier 1: Small cottage / starter shop
                val wallColor = Color(0xFFFBBF24)
                val roofColor = Color(0xFFDC2626)
                cubes.add(VoxelCube(bx, by, bz + 0.6f, 1.3f, wallColor))
                cubes.add(VoxelCube(bx, by, bz + 1.4f, 1.1f, roofColor))
                // Doorway
                cubes.add(VoxelCube(bx, by - 0.65f, bz + 0.45f, 0.4f, Color(0xFF78350F)))
            }
            2 -> {
                // Tier 2: 2-storey house + chimney
                val wallColor1 = Color(0xFFF59E0B)
                val wallColor2 = Color(0xFFFDE68A)
                val roofColor = Color(0xFF2563EB) // Royal Blue Roof
                cubes.add(VoxelCube(bx, by, bz + 0.6f, 1.4f, wallColor1))
                cubes.add(VoxelCube(bx, by, bz + 1.6f, 1.2f, wallColor2))
                cubes.add(VoxelCube(bx, by, bz + 2.3f, 1.0f, roofColor))
                // Brick Chimney
                cubes.add(VoxelCube(bx + 0.5f, by + 0.5f, bz + 2.7f, 0.35f, Color(0xFF991B1B)))
                // Windows
                cubes.add(VoxelCube(bx - 0.35f, by - 0.6f, bz + 1.6f, 0.3f, Color(0xFF67E8F9)))
                cubes.add(VoxelCube(bx + 0.35f, by - 0.6f, bz + 1.6f, 0.3f, Color(0xFF67E8F9)))
            }
            3 -> {
                // Tier 3: Elaborate mansion / artisan boutique with balcony & awning
                val wallColor = Color(0xFFE2E8F0)
                val accentColor = Color(0xFF8B5CF6)
                val roofColor = Color(0xFF10B981)
                cubes.add(VoxelCube(bx, by, bz + 0.7f, 1.5f, wallColor))
                cubes.add(VoxelCube(bx, by, bz + 1.8f, 1.3f, accentColor))
                cubes.add(VoxelCube(bx, by, bz + 2.6f, 1.1f, roofColor))
                // Balcony & awning
                cubes.add(VoxelCube(bx, by - 0.8f, bz + 1.2f, 0.5f, Color(0xFFF59E0B)))
                // Gold spire finial
                cubes.add(VoxelCube(bx, by, bz + 3.2f, 0.35f, Color(0xFFFACC15)))
            }
            4 -> {
                // Tier 4: Grand Animated Landmark / Clocktower / Castle
                val stoneColor = Color(0xFFCBD5E1)
                val goldColor = Color(0xFFF59E0B)
                val gemColor = Color(0xFF06B6D4)
                cubes.add(VoxelCube(bx, by, bz + 0.8f, 1.6f, stoneColor))
                cubes.add(VoxelCube(bx, by, bz + 1.9f, 1.4f, stoneColor))
                cubes.add(VoxelCube(bx, by, bz + 2.9f, 1.1f, goldColor))
                cubes.add(VoxelCube(bx, by, bz + 3.7f, 0.8f, stoneColor))
                // Crown battlements
                cubes.add(VoxelCube(bx - 0.4f, by - 0.4f, bz + 4.2f, 0.25f, goldColor))
                cubes.add(VoxelCube(bx + 0.4f, by - 0.4f, bz + 4.2f, 0.25f, goldColor))
                cubes.add(VoxelCube(bx - 0.4f, by + 0.4f, bz + 4.2f, 0.25f, goldColor))
                cubes.add(VoxelCube(bx + 0.4f, by + 0.4f, bz + 4.2f, 0.25f, goldColor))
                // Radiant Gem Beacon
                cubes.add(VoxelCube(bx, by, bz + 4.6f, 0.45f, gemColor))
                // Fluttering Red Banner
                cubes.add(VoxelCube(bx + 0.5f, by, bz + 4.8f, 0.3f, Color(0xFFEF4444)))
            }
        }

        return cubes
    }

    /**
     * Environment scenery: cobblestones, fountain, trees and decorative voxel lamps.
     */
    fun createEnvironmentVoxels(): List<VoxelCube> {
        val cubes = mutableListOf<VoxelCube>()

        // Central park cobblestone cross-path
        for (i in 2..10 step 2) {
            cubes.add(VoxelCube(i.toFloat(), 6f, 0.05f, 0.8f, Color(0xFFE2E8F0)))
            cubes.add(VoxelCube(6f, i.toFloat(), 0.05f, 0.8f, Color(0xFFE2E8F0)))
        }

        // Voxel Trees at courtyard corners
        val treeCoords = listOf(
            Triple(1.8f, 1.8f, 0f),
            Triple(10.2f, 1.8f, 0f),
            Triple(1.8f, 10.2f, 0f),
            Triple(10.2f, 10.2f, 0f)
        )
        for ((tx, ty, tz) in treeCoords) {
            // Trunk
            cubes.add(VoxelCube(tx, ty, tz + 0.4f, 0.35f, Color(0xFF78350F)))
            // Foliage layers (2 green cubes)
            cubes.add(VoxelCube(tx, ty, tz + 0.9f, 0.85f, Color(0xFF15803D)))
            cubes.add(VoxelCube(tx, ty, tz + 1.5f, 0.65f, Color(0xFF22C55E)))
        }

        return cubes
    }
}
