package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.blockbound.audio.SoundManager
import com.example.blockbound.model.RaidTarget
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

private data class DustParticle(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    var radius: Float,
    var color: Color,
    var alpha: Float = 1.0f
)

@Composable
fun RaidDialog(
    opponentName: String,
    targets: List<RaidTarget>,
    soundManager: SoundManager,
    onRaidResolved: (loot: Long, wasShielded: Boolean) -> Unit
) {
    var selectedTargetIndex by remember { mutableIntStateOf(-1) }
    var isAttacking by remember { mutableStateOf(false) }
    var raidOutcome by remember { mutableStateOf<Pair<Long, Boolean>?>(null) } // (loot, wasShielded)
    val scope = rememberCoroutineScope()
    val impactScale = remember { Animatable(1.0f) }

    // Screen Shake Offset
    var shakeX by remember { mutableFloatStateOf(0f) }
    var shakeY by remember { mutableFloatStateOf(0f) }

    // Projectile Animation State (0f = catapult start, 1f = hit target)
    val projectileProgress = remember { Animatable(0f) }
    var isProjectileFlying by remember { mutableStateOf(false) }
    var projectileTargetIdx by remember { mutableIntStateOf(0) }

    // Dust particles
    val dustParticles = remember { mutableStateListOf<DustParticle>() }

    Dialog(
        onDismissRequest = { /* Must complete raid */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        BoxWithConstraints(modifier = Modifier.fillMaxWidth(0.96f)) {
            val totalWidthPx = constraints.maxWidth.toFloat()
            val totalHeightPx = constraints.maxHeight.toFloat()

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .offset(x = shakeX.dp, y = shakeY.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .border(2.5.dp, Color(0xFFEF4444), RoundedCornerShape(24.dp)),
                color = Color(0xFF0F172A),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header: Raid Banner
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFFDC2626))
                            .padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = "⚔️ TOWN RAID EVENT",
                            color = Color.White,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Infiltrating $opponentName's District!",
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = if (isAttacking) "🚀 Projectile in mid-air!"
                        else if (raidOutcome == null) "Select a target building to launch catapult attack!"
                        else "Raid completed!",
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 4.dp)
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Target Buildings Selection
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        targets.forEachIndexed { index, target ->
                            val isSelected = selectedTargetIndex == index
                            Card(
                                modifier = Modifier
                                    .weight(1f)
                                    .padding(horizontal = 4.dp)
                                    .scale(if (isSelected) impactScale.value else 1.0f)
                                    .clickable(enabled = !isAttacking && raidOutcome == null) {
                                        selectedTargetIndex = index
                                        projectileTargetIdx = index
                                        isAttacking = true
                                        isProjectileFlying = true
                                        soundManager.playDiceRattle()

                                        scope.launch {
                                            // 1. Launch Projectile Arc Animation (0.0 to 1.0)
                                            projectileProgress.snapTo(0f)
                                            projectileProgress.animateTo(
                                                targetValue = 1f,
                                                animationSpec = tween(550, easing = LinearEasing)
                                            )
                                            isProjectileFlying = false

                                            // 2. Trigger Screen Shake on impact
                                            launch {
                                                val shakeDur = 350
                                                val start = System.currentTimeMillis()
                                                while (System.currentTimeMillis() - start < shakeDur) {
                                                    val factor = 1f - (System.currentTimeMillis() - start) / shakeDur.toFloat()
                                                    shakeX = (Random.nextFloat() - 0.5f) * 16f * factor
                                                    shakeY = (Random.nextFloat() - 0.5f) * 16f * factor
                                                    delay(25)
                                                }
                                                shakeX = 0f
                                                shakeY = 0f
                                            }

                                            // 3. Spawn Dust & Rubble Particles on Target
                                            val targetCenterX = totalWidthPx * ((index * 2 + 1) / 6f)
                                            val targetCenterY = totalHeightPx * 0.38f
                                            val colors = listOf(
                                                Color(0xFFE2E8F0), Color(0xFF94A3B8), Color(0xFFF59E0B),
                                                Color(0xFFEF4444), Color(0xFF64748B)
                                            )
                                            val newParticles = (1..32).map {
                                                val angle = Random.nextFloat() * 2f * PI.toFloat()
                                                val speed = Random.nextFloat() * 8f + 2f
                                                DustParticle(
                                                    x = targetCenterX,
                                                    y = targetCenterY,
                                                    vx = kotlin.math.cos(angle) * speed,
                                                    vy = kotlin.math.sin(angle) * speed,
                                                    radius = Random.nextFloat() * 5f + 3f,
                                                    color = colors.random()
                                                )
                                            }
                                            dustParticles.clear()
                                            dustParticles.addAll(newParticles)

                                            // 4. Building impact scale bounce
                                            impactScale.animateTo(1.3f, tween(150, easing = FastOutSlowInEasing))
                                            impactScale.animateTo(1.0f, tween(150, easing = FastOutSlowInEasing))

                                            // 5. Sound and outcome resolution
                                            if (target.isShielded) {
                                                soundManager.playShieldBlock()
                                                val consolation = target.lootCoins / 3
                                                raidOutcome = Pair(consolation, true)
                                            } else {
                                                soundManager.playRaidBlast()
                                                soundManager.playCoinReward()
                                                raidOutcome = Pair(target.lootCoins, false)
                                            }
                                            isAttacking = false
                                        }
                                    }
                                    .testTag("raid_target_$index"),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) Color(0xFF334155) else Color(0xFF1E293B)
                                ),
                                border = if (isSelected) {
                                    CardDefaults.outlinedCardBorder().copy(
                                        brush = androidx.compose.ui.graphics.SolidColor(Color(0xFFFBBF24))
                                    )
                                } else null
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 14.dp, horizontal = 6.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = when (index) {
                                            0 -> "🏰"
                                            1 -> "🍞"
                                            else -> "🎡"
                                        },
                                        fontSize = 30.sp
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = target.name,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "Tier ${target.tier}",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 9.sp
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Catapult launch base illustration
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF1E293B))
                            .padding(vertical = 8.dp)
                    ) {
                        Text(text = "🎯 Catapult Ready", color = Color(0xFFCBD5E1), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(text = "🚀", fontSize = 16.sp)
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Outcome Banner & Claim Button
                    AnimatedVisibility(
                        visible = raidOutcome != null,
                        enter = fadeIn() + scaleIn()
                    ) {
                        val outcome = raidOutcome
                        if (outcome != null) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (outcome.second) Color(0xFF0F2B48) else Color(0xFF064E3B))
                                    .padding(14.dp)
                            ) {
                                if (outcome.second) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            imageVector = Icons.Default.Shield,
                                            contentDescription = "Shield Defended",
                                            tint = Color(0xFF38BDF8),
                                            modifier = Modifier.size(22.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "SHIELD DEFLECTED!",
                                            color = Color(0xFF38BDF8),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Black
                                        )
                                    }
                                    Text(
                                        text = "Aegis shield absorbed the blast! Stole +%,d coins!".format(outcome.first),
                                        color = Color(0xFFCBD5E1),
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                } else {
                                    Text(
                                        text = "💥 DIRECT HIT DEMOLITION!",
                                        color = Color(0xFF4ADE80),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                    Text(
                                        text = "Demolished building! Looted +%,d coins!".format(outcome.first),
                                        color = Color(0xFFFEF08A),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Button(
                                    onClick = { onRaidResolved(outcome.first, outcome.second) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("claim_raid_loot")
                                ) {
                                    Text(
                                        text = "CLAIM LOOT",
                                        color = Color.Black,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Projectile & Dust Particles Overlay Canvas
            Canvas(modifier = Modifier.fillMaxSize()) {
                val startX = size.width * 0.5f
                val startY = size.height * 0.85f

                val targetX = size.width * ((projectileTargetIdx * 2 + 1) / 6f)
                val targetY = size.height * 0.38f

                // Draw in-flight projectile
                if (isProjectileFlying) {
                    val p = projectileProgress.value
                    val curX = startX + (targetX - startX) * p
                    val arcHeight = size.height * 0.32f
                    val curY = startY + (targetY - startY) * p - (sin(p * PI.toFloat()) * arcHeight)

                    // Projectile core
                    drawCircle(
                        color = Color(0xFFF59E0B),
                        radius = 12f,
                        center = Offset(curX, curY)
                    )
                    // Projectile flame/trail
                    drawCircle(
                        color = Color(0xFFEF4444).copy(alpha = 0.8f),
                        radius = 8f,
                        center = Offset(curX - (targetX - startX) * 0.05f, curY + 6f)
                    )
                }

                // Draw dust and rubble particles
                for (d in dustParticles) {
                    if (d.alpha > 0.05f) {
                        drawCircle(
                            color = d.color.copy(alpha = d.alpha),
                            radius = d.radius,
                            center = Offset(d.x, d.y)
                        )
                    }
                }
            }
        }
    }

    // Dust particle physics tick
    LaunchedEffect(dustParticles.size) {
        if (dustParticles.isNotEmpty()) {
            while (dustParticles.any { it.alpha > 0.05f }) {
                delay(30)
                for (p in dustParticles) {
                    p.x += p.vx
                    p.y += p.vy
                    p.vy += 0.4f // Gravity
                    p.alpha = (p.alpha - 0.045f).coerceAtLeast(0f)
                }
            }
            dustParticles.clear()
        }
    }
}
