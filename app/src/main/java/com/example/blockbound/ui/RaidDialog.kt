package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
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
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.blockbound.audio.SoundManager
import com.example.blockbound.model.RaidTarget
import kotlinx.coroutines.launch

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

    Dialog(
        onDismissRequest = { /* Must complete raid */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .clip(RoundedCornerShape(24.dp))
                .border(2.5.dp, Color(0xFFEF4444), RoundedCornerShape(24.dp)),
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
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

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Infiltrating $opponentName's District!",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = if (raidOutcome == null) "Choose a building to launch your catapult!" else "Raid completed!",
                    color = Color(0xFF94A3B8),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

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
                                    isAttacking = true
                                    soundManager.playDiceRattle()

                                    scope.launch {
                                        impactScale.animateTo(
                                            targetValue = 1.25f,
                                            animationSpec = tween(300, easing = FastOutSlowInEasing)
                                        )
                                        impactScale.animateTo(
                                            targetValue = 1.0f,
                                            animationSpec = tween(200, easing = FastOutSlowInEasing)
                                        )

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
                                    .padding(vertical = 16.dp, horizontal = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = when (index) {
                                        0 -> "🏰"
                                        1 -> "🍞"
                                        else -> "🎡"
                                    },
                                    fontSize = 32.sp
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = target.name,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Tier ${target.tier}",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

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
                                .padding(16.dp)
                        ) {
                            if (outcome.second) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Shield,
                                        contentDescription = "Shield Defended",
                                        tint = Color(0xFF38BDF8),
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "SHIELD DEFLECTED!",
                                        color = Color(0xFF38BDF8),
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }
                                Text(
                                    text = "Opponent's shield absorbed the blast. Stole +%,d coins!".format(outcome.first),
                                    color = Color(0xFFCBD5E1),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            } else {
                                Text(
                                    text = "💥 DIRECT HIT!",
                                    color = Color(0xFF4ADE80),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Text(
                                    text = "Demolished building! Looted +%,d coins!".format(outcome.first),
                                    color = Color(0xFFFEF08A),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            Button(
                                onClick = { onRaidResolved(outcome.first, outcome.second) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("claim_raid_loot")
                            ) {
                                Text(
                                    text = "CLAIM LOOT",
                                    color = Color.Black,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
