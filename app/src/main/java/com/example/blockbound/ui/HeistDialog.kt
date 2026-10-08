package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.blockbound.audio.SoundManager
import com.example.blockbound.model.HeistSafe

@Composable
fun HeistDialog(
    initialSafes: List<HeistSafe>,
    soundManager: SoundManager,
    onHeistFinished: (totalCoins: Long, totalMaterials: Int) -> Unit
) {
    val safes = remember { mutableStateListOf(*initialSafes.toTypedArray()) }
    var picksRemaining by remember { mutableIntStateOf(3) }
    var totalLootCoins by remember { mutableLongStateOf(0L) }
    var totalLootMaterials by remember { mutableIntStateOf(0) }

    Dialog(
        onDismissRequest = { /* Must complete heist */ },
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .clip(RoundedCornerShape(24.dp))
                .border(2.5.dp, Color(0xFF8B5CF6), RoundedCornerShape(24.dp)),
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF7C3AED))
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "🗝️ VAULT HEIST EVENT",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Bank Deposit Vault",
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = if (picksRemaining > 0) "Pick $picksRemaining safes to crack open!" else "Vault cracked!",
                    color = Color(0xFFCBD5E1),
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // 3x3 Safes Grid
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(safes) { index, safe ->
                        Card(
                            modifier = Modifier
                                .size(84.dp)
                                .clickable(enabled = !safe.isOpened && picksRemaining > 0) {
                                    if (!safe.isOpened && picksRemaining > 0) {
                                        picksRemaining--
                                        safes[index] = safe.copy(isOpened = true)
                                        totalLootCoins += safe.coins
                                        totalLootMaterials += safe.materials

                                        if (safe.isJackpot) {
                                            soundManager.playJackpotFanfare()
                                        } else {
                                            soundManager.playCoinReward()
                                        }
                                    }
                                }
                                .testTag("safe_$index"),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (safe.isOpened) {
                                    if (safe.isJackpot) Color(0xFFB45309) else Color(0xFF1E293B)
                                } else Color(0xFF334155)
                            ),
                            border = if (safe.isOpened) {
                                CardDefaults.outlinedCardBorder().copy(
                                    brush = androidx.compose.ui.graphics.SolidColor(
                                        if (safe.isJackpot) Color(0xFFFBBF24) else Color(0xFF8B5CF6)
                                    )
                                )
                            } else null
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(84.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                if (safe.isOpened) {
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier.padding(4.dp)
                                    ) {
                                        Text(
                                            text = if (safe.isJackpot) "💎" else if (safe.materials > 0) "🧱" else "💰",
                                            fontSize = 24.sp
                                        )
                                        Text(
                                            text = if (safe.materials > 0) "+${safe.materials} Bricks" else "+%,d".format(safe.coins),
                                            color = if (safe.isJackpot) Color(0xFFFDE047) else Color.White,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                } else {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(text = "🔒", fontSize = 26.sp)
                                        Text(
                                            text = "#${index + 1}",
                                            color = Color(0xFF94A3B8),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Loot Summary & Action
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF1E1B4B))
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Total Loot:",
                        color = Color(0xFF94A3B8),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "🪙 %,d".format(totalLootCoins),
                            color = Color(0xFFFBBF24),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                        if (totalLootMaterials > 0) {
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "🧱 +$totalLootMaterials",
                                color = Color(0xFFF472B6),
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                AnimatedVisibility(
                    visible = picksRemaining == 0,
                    enter = fadeIn() + scaleIn()
                ) {
                    Button(
                        onClick = { onHeistFinished(totalLootCoins, totalLootMaterials) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("collect_heist_loot")
                    ) {
                        Text(
                            text = "COLLECT HEIST SPOILS",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    }
}
