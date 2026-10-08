package com.example.blockbound.voxel

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import com.example.blockbound.model.BoardTile
import com.example.blockbound.model.Building

@Composable
fun VoxelDioramaCanvas(
    tiles: List<BoardTile>,
    buildings: List<Building>,
    characterTileIndex: Int,
    targetTileIndex: Int,
    hopFraction: Float,
    isHopping: Boolean,
    particles: List<VoxelParticle>,
    modifier: Modifier = Modifier
) {
    // Camera pan and zoom state
    var panX by remember { mutableFloatStateOf(0f) }
    var panY by remember { mutableFloatStateOf(0f) }
    var zoomScale by remember { mutableFloatStateOf(1.0f) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    panX += pan.x
                    panY += pan.y
                    zoomScale = (zoomScale * zoom).coerceIn(0.6f, 2.2f)
                }
            }
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            // Calculate base isometric scale adapted to screen width
            val baseScale = (width / 24f) * zoomScale
            val originX = width / 2f + panX
            val originY = height * 0.44f + panY

            // 1. Gather all voxel cubes
            val allCubes = ArrayList<VoxelCube>(500)

            // Board tiles
            for (tile in tiles) {
                val isCharOnTile = !isHopping && tile.index == characterTileIndex
                allCubes.addAll(VoxelModels.createTileVoxels(tile, isCharOnTile))
            }

            // Courtyard environment (paths, trees)
            allCubes.addAll(VoxelModels.createEnvironmentVoxels())

            // Town buildings
            buildings.forEachIndexed { index, building ->
                allCubes.addAll(VoxelModels.createBuildingVoxels(building, index))
            }

            // Character token with animated hopping curve
            val hopHeight = if (isHopping) {
                kotlin.math.sin(hopFraction * kotlin.math.PI.toFloat()) * 1.6f
            } else 0f

            allCubes.addAll(
                VoxelModels.createCharacterVoxels(
                    currentTileIdx = characterTileIndex,
                    targetTileIdx = targetTileIndex,
                    hopFraction = hopFraction,
                    hopHeight = hopHeight
                )
            )

            // 2. Depth sort (Painter's algorithm: lowest depthKey drawn first)
            allCubes.sortBy { it.depthKey }

            // 3. Render voxel cubes
            for (cube in allCubes) {
                drawIsometricVoxel(
                    cube = cube,
                    originX = originX,
                    originY = originY,
                    scale = baseScale
                )
            }

            // 4. Render active particles (confetti, dust, smoke)
            for (p in particles) {
                val pPos = IsometricProjection.project(p.x, p.y, p.z, originX, originY, baseScale)
                val alpha = (p.life / p.maxLife).coerceIn(0f, 1f)
                drawCircle(
                    color = p.color.copy(alpha = alpha),
                    radius = p.size * zoomScale,
                    center = pPos
                )
            }
        }
    }
}

private fun DrawScope.drawIsometricVoxel(
    cube: VoxelCube,
    originX: Float,
    originY: Float,
    scale: Float
) {
    val hs = cube.size * 0.5f
    val x = cube.x
    val y = cube.y
    val z = cube.z

    // Vertices for Top face
    val pTop = IsometricProjection.project(x - hs, y - hs, z + hs, originX, originY, scale)
    val pRight = IsometricProjection.project(x + hs, y - hs, z + hs, originX, originY, scale)
    val pBottom = IsometricProjection.project(x + hs, y + hs, z + hs, originX, originY, scale)
    val pLeft = IsometricProjection.project(x - hs, y + hs, z + hs, originX, originY, scale)

    // Vertices for Bottom face
    val pbRight = IsometricProjection.project(x + hs, y - hs, z - hs, originX, originY, scale)
    val pbBottom = IsometricProjection.project(x + hs, y + hs, z - hs, originX, originY, scale)
    val pbLeft = IsometricProjection.project(x - hs, y + hs, z - hs, originX, originY, scale)

    // 1. Left Face
    val leftPath = Path().apply {
        moveTo(pLeft.x, pLeft.y)
        lineTo(pBottom.x, pBottom.y)
        lineTo(pbBottom.x, pbBottom.y)
        lineTo(pbLeft.x, pbLeft.y)
        close()
    }
    drawPath(path = leftPath, color = cube.leftColor, style = Fill)

    // 2. Right Face
    val rightPath = Path().apply {
        moveTo(pBottom.x, pBottom.y)
        lineTo(pRight.x, pRight.y)
        lineTo(pbRight.x, pbRight.y)
        lineTo(pbBottom.x, pbBottom.y)
        close()
    }
    drawPath(path = rightPath, color = cube.rightColor, style = Fill)

    // 3. Top Face
    val topPath = Path().apply {
        moveTo(pTop.x, pTop.y)
        lineTo(pRight.x, pRight.y)
        lineTo(pBottom.x, pBottom.y)
        lineTo(pLeft.x, pLeft.y)
        close()
    }
    drawPath(path = topPath, color = cube.topColor, style = Fill)

    // Outline / Highlight if requested
    if (cube.isHighlighted) {
        drawPath(path = topPath, color = Color.White, style = Stroke(width = 2.5f))
    }
}
