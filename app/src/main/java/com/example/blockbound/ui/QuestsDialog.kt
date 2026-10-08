package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.blockbound.game.GameViewModel
import com.example.blockbound.model.Quest

@Composable
fun QuestsDialog(
    quests: List<Quest>,
    dailyStreak: Int,
    isStreakClaimable: Boolean,
    onClaimStreak: () -> Unit,
    onClaimQuest: (questId: String) -> Unit,
    onClose: () -> Unit
) {
    var selectedCategory by remember { mutableStateOf("ALL") }

    val categories = listOf("ALL", "DAILY", "BUILD", "RAID", "EVENT")
    val filteredQuests = when (selectedCategory) {
        "ALL" -> quests
        else -> quests.filter { it.category == selectedCategory }
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .clip(RoundedCornerShape(24.dp))
                .border(2.dp, Color(0xFF3B82F6), RoundedCornerShape(24.dp)),
            color = Color(0xFF0F172A),
            shape = RoundedCornerShape(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(18.dp)
            ) {
                // 1. Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "🎯 Objectives & Activities",
                                color = Color.White,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                        Text(
                            text = "Complete missions & maintain daily streak for mega rewards",
                            color = Color(0xFF94A3B8),
                            fontSize = 11.sp
                        )
                    }

                    IconButton(
                        onClick = onClose,
                        modifier = Modifier
                            .size(34.dp)
                            .background(Color(0xFF1E293B), CircleShape)
                            .testTag("close_quests_dialog")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // 2. Interactive Daily Streak Calendar Card
                DailyStreakCalendarCard(
                    currentStreak = dailyStreak,
                    isClaimable = isStreakClaimable,
                    onClaimStreak = onClaimStreak
                )

                Spacer(modifier = Modifier.height(12.dp))

                // 3. Category Filter Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    categories.forEach { cat ->
                        val isSelected = selectedCategory == cat
                        val label = when (cat) {
                            "ALL" -> "All Missions"
                            "DAILY" -> "🎯 Daily"
                            "BUILD" -> "🔨 Town Build"
                            "RAID" -> "⚔️ Raids"
                            "EVENT" -> "🗝️ Mini-Games"
                            else -> cat
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) Color(0xFF3B82F6) else Color(0xFF1E293B),
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { selectedCategory = cat }
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) Color.White else Color(0xFF94A3B8),
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // 4. Quests List
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredQuests) { quest ->
                        QuestCard(
                            quest = quest,
                            onClaim = { onClaimQuest(quest.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DailyStreakCalendarCard(
    currentStreak: Int,
    isClaimable: Boolean,
    onClaimStreak: () -> Unit
) {
    val activeDay = ((currentStreak - 1) % 7) + 1
    val infiniteTransition = rememberInfiniteTransition(label = "pulse_streak")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0xFF1E1B4B),
        border = androidx.compose.foundation.BorderStroke(
            1.5.dp,
            if (isClaimable) Color(0xFFF59E0B) else Color(0xFF4338CA)
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🔥", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Column {
                        Text(
                            text = "Day $activeDay / 7 Login Streak",
                            color = Color(0xFFF59E0B),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = if (isClaimable) "Reward ready to claim today!" else "Streak maintained! Next reward unlocks tomorrow.",
                            color = Color(0xFFCBD5E1),
                            fontSize = 11.sp
                        )
                    }
                }

                if (isClaimable) {
                    Button(
                        onClick = onClaimStreak,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        modifier = Modifier
                            .scale(pulseScale)
                            .testTag("claim_daily_streak_button")
                    ) {
                        Text(
                            text = "CLAIM",
                            color = Color.Black,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF065F46)
                    ) {
                        Text(
                            text = "✓ CLAIMED",
                            color = Color(0xFF34D399),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 7-day Progress Track
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                for (day in 1..7) {
                    val reward = GameViewModel.STREAK_REWARDS.find { it.day == day }
                    val isPast = day < activeDay || (day == activeDay && !isClaimable)
                    val isCurrent = day == activeDay
                    val isBigDay = day == 7

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(if (isBigDay) 34.dp else 28.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isPast -> Color(0xFF059669)
                                        isCurrent -> Color(0xFFF59E0B)
                                        isBigDay -> Color(0xFF7C3AED)
                                        else -> Color(0xFF334155)
                                    }
                                )
                                .border(
                                    width = if (isCurrent) 2.dp else 1.dp,
                                    color = if (isCurrent) Color.White else Color(0x33FFFFFF),
                                    shape = CircleShape
                                )
                        ) {
                            Text(
                                text = when {
                                    isPast -> "✓"
                                    isBigDay -> "👑"
                                    else -> "D$day"
                                },
                                color = if (isCurrent) Color.Black else Color.White,
                                fontSize = if (isPast || isBigDay) 12.sp else 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(2.dp))

                        Text(
                            text = "+${reward?.energy ?: 10}⚡",
                            color = if (isCurrent) Color(0xFFFDE68A) else Color(0xFF94A3B8),
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuestCard(
    quest: Quest,
    onClaim: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        border = if (quest.isCompleted && !quest.isClaimed) {
            androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFF59E0B))
        } else null
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Quest Icon with background
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(38.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF0F172A))
                    .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(10.dp))
            ) {
                Text(text = quest.icon, fontSize = 20.sp)
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = quest.title,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                LinearProgressIndicator(
                    progress = { quest.progressFraction },
                    modifier = Modifier
                        .fillMaxWidth(0.92f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = if (quest.isCompleted) Color(0xFF10B981) else Color(0xFF3B82F6),
                    trackColor = Color(0xFF334155)
                )

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(0.92f),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${quest.progress} / ${quest.target}",
                        color = Color(0xFF94A3B8),
                        fontSize = 10.sp
                    )
                    Text(
                        text = "🪙 %,d  |  +${quest.energyReward}⚡".format(quest.coinReward),
                        color = Color(0xFFFDE68A),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Action / Status Button
            if (quest.isClaimed) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = Color(0xFF065F46)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = null,
                            tint = Color(0xFF34D399),
                            modifier = Modifier.size(12.dp)
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "CLAIMED",
                            color = Color(0xFF34D399),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            } else {
                Button(
                    onClick = onClaim,
                    enabled = quest.isCompleted,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFF59E0B),
                        disabledContainerColor = Color(0xFF334155)
                    ),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.testTag("claim_quest_${quest.id}")
                ) {
                    Text(
                        text = if (quest.isCompleted) "CLAIM" else "IN PROGRESS",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black,
                        color = if (quest.isCompleted) Color.Black else Color(0xFF94A3B8)
                    )
                }
            }
        }
    }
}
