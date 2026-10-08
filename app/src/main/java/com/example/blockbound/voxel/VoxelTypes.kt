package com.example.blockbound.voxel

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import kotlin.math.cos
import kotlin.math.sin

/**
 * 3D Isometric Voxel Data Structures & Lighting calculations.
 */
data class VoxelCube(
    val x: Float,
    val y: Float,
    val z: Float,
    val size: Float = 1.0f,
    val color: Color,
    val isHighlighted: Boolean = false
) {
    // Top, Left, and Right face colors with stylized directional sunlight
    val topColor: Color
        get() = color

    val leftColor: Color
        get() = Color(
            red = (color.red * 0.72f).coerceIn(0f, 1f),
            green = (color.green * 0.72f).coerceIn(0f, 1f),
            blue = (color.blue * 0.72f).coerceIn(0f, 1f),
            alpha = color.alpha
        )

    val rightColor: Color
        get() = Color(
            red = (color.red * 0.52f).coerceIn(0f, 1f),
            green = (color.green * 0.52f).coerceIn(0f, 1f),
            blue = (color.blue * 0.52f).coerceIn(0f, 1f),
            alpha = color.alpha
        )

    val depthKey: Float
        get() = (x + y) * 1000f + z
}

data class VoxelParticle(
    var x: Float,
    var y: Float,
    var z: Float,
    var vx: Float,
    var vy: Float,
    var vz: Float,
    val color: Color,
    var life: Float = 1.0f,
    val maxLife: Float = 1.0f,
    val size: Float = 6f
) {
    val isAlive: Boolean get() = life > 0f
}

object IsometricProjection {
    private const val COS_30 = 0.8660254f
    private const val SIN_30 = 0.5f

    /**
     * Converts a 3D coordinate (x, y, z) into 2D screen coordinates.
     */
    fun project(
        x: Float,
        y: Float,
        z: Float,
        originX: Float,
        originY: Float,
        scale: Float
    ): Offset {
        val screenX = originX + (x - y) * COS_30 * scale
        val screenY = originY + (x + y) * SIN_30 * scale - (z * scale)
        return Offset(screenX, screenY)
    }
}
