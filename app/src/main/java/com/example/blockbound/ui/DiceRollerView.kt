package com.example.blockbound.ui

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.random.Random

@Composable
fun DiceRollerView(
    die1Value: Int,
    die2Value: Int,
    isRolling: Boolean,
    energy: Int,
    multiplier: Int,
    isQuickRoll: Boolean,
    onRollClick: () -> Unit,
    onMultiplierChange: () -> Unit,
    onQuickRollToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Pulse animation for Roll button when ready
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = if (!isRolling && energy >= multiplier) 1.04f else 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Visual Tumbling Dice Display
        Row(
            modifier = Modifier.padding(bottom = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Voxel3DDie(value = die1Value, isRolling = isRolling, seed = 101)
            Voxel3DDie(value = die2Value, isRolling = isRolling, seed = 202)
        }

        // Action Control Row (Multiplier, BIG ROLL BUTTON, Fast-Forward toggle)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Multiplier Selector Button (1X / 2X / 3X / 5X)
            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onMultiplierChange() }
                    .border(2.dp, Color(0xFFFBBF24), RoundedCornerShape(16.dp))
                    .testTag("multiplier_button"),
                color = Color(0xFF1E1B4B),
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "BET",
                        color = Color(0xFF94A3B8),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${multiplier}X",
                        color = Color(0xFFFBBF24),
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // Central Hero ROLL Button
            Box(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                Button(
                    onClick = onRollClick,
                    enabled = !isRolling && energy >= multiplier,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp)
                        .scale(pulseScale)
                        .shadow(12.dp, RoundedCornerShape(20.dp))
                        .testTag("roll_button"),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFE11D48),
                        disabledContainerColor = Color(0xFF475569)
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = if (isRolling) "ROLLING..." else "ROLL",
                            color = Color.White,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        // Cost chip
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0x33000000))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "⚡ -$multiplier",
                                color = Color(0xFFFACC15),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            // Quick Roll / Turbo Toggle Button
            Surface(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .clickable { onQuickRollToggle() }
                    .border(
                        2.dp,
                        if (isQuickRoll) Color(0xFF10B981) else Color(0xFF64748B),
                        RoundedCornerShape(16.dp)
                    )
                    .testTag("quick_roll_toggle"),
                color = if (isQuickRoll) Color(0xFF064E3B) else Color(0xFF1E1B4B),
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.FastForward,
                        contentDescription = "Turbo",
                        tint = if (isQuickRoll) Color(0xFF34D399) else Color(0xFF94A3B8),
                        modifier = Modifier.size(20.dp)
                    )
                    Text(
                        text = if (isQuickRoll) "FAST" else "NORM",
                        color = if (isQuickRoll) Color(0xFF34D399) else Color(0xFF94A3B8),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/**
 * 3D Isometric Voxel Die with physical tumbling, shadow, and pip pips.
 */
@Composable
private fun Voxel3DDie(
    value: Int,
    isRolling: Boolean,
    seed: Int
) {
    val animAngle = remember { Animatable(0f) }
    val bounceY = remember { Animatable(0f) }

    LaunchedEffect(isRolling) {
        if (isRolling) {
            animAngle.animateTo(
                targetValue = 720f + (seed % 180),
                animationSpec = tween(durationMillis = 800, easing = LinearEasing)
            )
            animAngle.snapTo(0f)
        }
    }

    LaunchedEffect(isRolling) {
        if (isRolling) {
            bounceY.animateTo(
                targetValue = -25f,
                animationSpec = tween(durationMillis = 300, easing = FastOutSlowInEasing)
            )
            bounceY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing)
            )
        }
    }

    val displayValue = if (isRolling) {
        Random(seed + System.currentTimeMillis().toInt()).nextInt(1, 7)
    } else value.coerceIn(1, 6)

    Box(
        modifier = Modifier
            .size(64.dp)
            .shadow(10.dp, RoundedCornerShape(16.dp))
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(Color(0xFFFFFBEB), Color(0xFFFDE68A), Color(0xFFF59E0B))
                )
            )
            .border(2.5.dp, Color(0xFFD97706), RoundedCornerShape(16.dp))
            .rotate(if (isRolling) animAngle.value else 0f),
        contentAlignment = Alignment.Center
    ) {
        // Pip Layout (Classic dice faces)
        Canvas(modifier = Modifier.size(44.dp)) {
            val pipRadius = 4.5.dp.toPx()
            val pipColor = Color(0xFF991B1B) // Crimson pip dots

            val left = size.width * 0.22f
            val center = size.width * 0.5f
            val right = size.width * 0.78f

            val top = size.height * 0.22f
            val mid = size.height * 0.5f
            val bottom = size.height * 0.78f

            when (displayValue) {
                1 -> {
                    drawCircle(pipColor, pipRadius * 1.4f, Offset(center, mid))
                }
                2 -> {
                    drawCircle(pipColor, pipRadius, Offset(left, top))
                    drawCircle(pipColor, pipRadius, Offset(right, bottom))
                }
                3 -> {
                    drawCircle(pipColor, pipRadius, Offset(left, top))
                    drawCircle(pipColor, pipRadius, Offset(center, mid))
                    drawCircle(pipColor, pipRadius, Offset(right, bottom))
                }
                4 -> {
                    drawCircle(pipColor, pipRadius, Offset(left, top))
                    drawCircle(pipColor, pipRadius, Offset(right, top))
                    drawCircle(pipColor, pipRadius, Offset(left, bottom))
                    drawCircle(pipColor, pipRadius, Offset(right, bottom))
                }
                5 -> {
                    drawCircle(pipColor, pipRadius, Offset(left, top))
                    drawCircle(pipColor, pipRadius, Offset(right, top))
                    drawCircle(pipColor, pipRadius, Offset(center, mid))
                    drawCircle(pipColor, pipRadius, Offset(left, bottom))
                    drawCircle(pipColor, pipRadius, Offset(right, bottom))
                }
                6 -> {
                    drawCircle(pipColor, pipRadius, Offset(left, top))
                    drawCircle(pipColor, pipRadius, Offset(right, top))
                    drawCircle(pipColor, pipRadius, Offset(left, mid))
                    drawCircle(pipColor, pipRadius, Offset(right, mid))
                    drawCircle(pipColor, pipRadius, Offset(left, bottom))
                    drawCircle(pipColor, pipRadius, Offset(right, bottom))
                }
            }
        }
    }
}
