package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
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
import com.example.blockbound.game.GameViewModel
import com.example.blockbound.model.FlyingLoot
import com.example.blockbound.model.GameDialogState
import com.example.blockbound.model.LootTargetType
import com.example.blockbound.model.Quest
import com.example.blockbound.voxel.VoxelDioramaCanvas
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.sin

@Composable
fun MainGameScreen(
    viewModel: GameViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentDistrict = uiState.districts.getOrNull(uiState.currentDistrictIndex)

    // Pulse animation for notification badge and claim CTA
    val infiniteTransition = rememberInfiniteTransition(label = "pulse_badge")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_scale"
    )

    // Auto-dismiss banner after 2.8s
    LaunchedEffect(uiState.bannerNotification) {
        if (uiState.bannerNotification != null) {
            delay(2800)
            viewModel.dismissBanner()
        }
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF0F172A),
                        Color(0xFF1E1B4B),
                        Color(0xFF1E293B)
                    )
                )
            )
    ) {
        val screenWidth = maxWidth
        val screenHeight = maxHeight

        // 1. Central 3D Voxel Board Diorama
        VoxelDioramaCanvas(
            tiles = uiState.tiles,
            buildings = currentDistrict?.buildings ?: emptyList(),
            characterTileIndex = uiState.currentTileIndex,
            targetTileIndex = uiState.targetTileIndex,
            hopFraction = uiState.hopFraction,
            isHopping = uiState.isHopping,
            particles = uiState.particles,
            modifier = Modifier.fillMaxSize()
        )

        // 2. Top Header HUD (Resources, Progression, Actions, Quests)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 12.dp, vertical = 6.dp)
                .align(Alignment.TopCenter)
        ) {
            // Main Resource Chips Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Coins Pill
                ResourcePill(
                    icon = "🪙",
                    value = "%,d".format(uiState.coins),
                    textColor = Color(0xFFFBBF24),
                    modifier = Modifier.testTag("coins_display")
                )

                // Materials Pill
                ResourcePill(
                    icon = "🧱",
                    value = "${uiState.materials}",
                    textColor = Color(0xFFF472B6),
                    modifier = Modifier.testTag("materials_display")
                )

                // Shields Pill
                Surface(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .border(1.5.dp, Color(0xFF0284C7), RoundedCornerShape(14.dp))
                        .testTag("shields_display"),
                    color = Color(0xFF082F49)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        for (s in 1..uiState.maxShields) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = "Shield",
                                tint = if (s <= uiState.shields) Color(0xFF38BDF8) else Color(0xFF475569),
                                modifier = Modifier.size(15.dp)
                            )
                        }
                    }
                }

                // Menu buttons: Quests & Settings
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Quest Modal Button with Icon + Label + Notification Badge
                    Box {
                        Surface(
                            onClick = { viewModel.openDialog(GameDialogState.Quests) },
                            shape = RoundedCornerShape(14.dp),
                            color = Color(0xFF1E293B),
                            border = androidx.compose.foundation.BorderStroke(
                                1.5.dp,
                                if (uiState.claimableQuestsCount > 0) Color(0xFFF59E0B) else Color(0xFF38BDF8)
                            ),
                            modifier = Modifier.testTag("quests_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("🎯", fontSize = 13.sp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "QUESTS",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        // Notification badge when rewards are ready to claim
                        val claimableCount = uiState.claimableQuestsCount
                        if (claimableCount > 0) {
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .offset(x = 6.dp, y = (-4).dp)
                                    .scale(pulseScale)
                                    .clip(CircleShape)
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(Color(0xFFEF4444), Color(0xFFF59E0B))
                                        )
                                    )
                                    .border(1.5.dp, Color.White, CircleShape)
                                    .padding(horizontal = 6.dp, vertical = 1.dp)
                                    .testTag("quest_notification_badge")
                            ) {
                                Text(
                                    text = "$claimableCount",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }

                    IconButton(
                        onClick = { viewModel.openDialog(GameDialogState.Settings) },
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0xFF1E293B), CircleShape)
                            .testTag("settings_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(19.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // CENTRAL TOP PROGRESS BAR FOR ACTIVE QUESTS (UI CONVENTION)
            TopActiveQuestBanner(
                activeQuest = uiState.activeQuest,
                quests = uiState.quests,
                dailyStreak = uiState.dailyStreak,
                pulseScale = pulseScale,
                onClaimQuest = { qId -> viewModel.claimQuest(qId) },
                onSelectQuest = { qId -> viewModel.selectTopQuest(qId) },
                onOpenQuestsModal = { viewModel.openDialog(GameDialogState.Quests) }
            )

            Spacer(modifier = Modifier.height(6.dp))

            // District Bar & Town Upgrade Button
            if (currentDistrict != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { viewModel.openDialog(GameDialogState.UpgradeTown) }
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(14.dp)),
                    color = Color(0xCC0F172A)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = currentDistrict.name,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "⭐ ${currentDistrict.completedTiers}/${currentDistrict.totalTiers}",
                                    color = Color(0xFFFBBF24),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(3.dp))
                            LinearProgressIndicator(
                                progress = { currentDistrict.progressFraction },
                                modifier = Modifier
                                    .fillMaxWidth(0.9f)
                                    .height(5.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = Color(0xFF10B981),
                                trackColor = Color(0xFF334155)
                            )
                        }

                        // Build Town CTA Button
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFF10B981),
                            modifier = Modifier.testTag("town_build_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Build,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "BUILD",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }
            }

            // Sliding Toast Notification Banner
            AnimatedVisibility(
                visible = uiState.bannerNotification != null,
                enter = slideInVertically() + fadeIn(),
                exit = slideOutVertically() + fadeOut(),
                modifier = Modifier.padding(top = 6.dp)
            ) {
                val banner = uiState.bannerNotification
                if (banner != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF312E81))
                            .border(1.5.dp, Color(0xFFFBBF24), RoundedCornerShape(12.dp))
                            .padding(vertical = 7.dp, horizontal = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = banner,
                            color = Color(0xFFFDE68A),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }

        // 3. Dice Roll Numbers Floating Popup
        AnimatedVisibility(
            visible = uiState.rollPopupText != null,
            enter = fadeIn() + scaleIn(initialScale = 0.8f),
            exit = fadeOut() + scaleOut(targetScale = 1.1f),
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = (-60).dp)
        ) {
            val popupText = uiState.rollPopupText
            if (popupText != null) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color(0xFA0F172A),
                    border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFF59E0B)),
                    shadowElevation = 12.dp,
                    modifier = Modifier.testTag("dice_roll_popup")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = popupText,
                            color = Color(0xFFFDE68A),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }

        // 4. Flying Loot Travel Animation Layer
        for (loot in uiState.flyingLoots) {
            FlyingLootAnimator(
                loot = loot,
                screenWidth = screenWidth.value,
                screenHeight = screenHeight.value,
                onFinished = { viewModel.removeFlyingLoot(loot.id) }
            )
        }

        // 5. Bottom Controls Panel (Dice Energy bar + 3D Dice Roller)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0xEE090D16), Color(0xFF090D16))
                    )
                )
                .padding(bottom = 14.dp)
        ) {
            // Energy Ticker Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "⚡ DICE ENERGY",
                        color = Color(0xFFFACC15),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${uiState.diceEnergy}/${uiState.maxEnergy}",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = if (uiState.diceEnergy < uiState.maxEnergy) "+1 in 00:45" else "FULL",
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp
                )
            }

            // Dice Roller Controls
            DiceRollerView(
                die1Value = uiState.die1Value,
                die2Value = uiState.die2Value,
                isRolling = uiState.isRolling,
                energy = uiState.diceEnergy,
                multiplier = uiState.multiplier,
                isQuickRoll = uiState.isQuickRoll,
                onRollClick = { viewModel.onRollClicked() },
                onMultiplierChange = { viewModel.cycleMultiplier() },
                onQuickRollToggle = { viewModel.toggleQuickRoll() }
            )
        }

        // 6. Overlays & Dialogs
        when (val dialog = uiState.activeDialog) {
            is GameDialogState.None -> Unit
            is GameDialogState.UpgradeTown -> {
                if (currentDistrict != null) {
                    TownUpgradeSheet(
                        district = currentDistrict,
                        playerCoins = uiState.coins,
                        playerMaterials = uiState.materials,
                        onUpgradeBuilding = { bId -> viewModel.upgradeBuilding(bId) },
                        onRepairBuilding = { bId -> viewModel.repairBuilding(bId) },
                        onClose = { viewModel.closeDialog() }
                    )
                }
            }
            is GameDialogState.RaidEvent -> {
                RaidDialog(
                    opponentName = dialog.opponentName,
                    targets = dialog.targetBuildings,
                    soundManager = viewModel.soundManager,
                    onRaidResolved = { loot, shielded -> viewModel.onRaidCompleted(loot, shielded) }
                )
            }
            is GameDialogState.HeistEvent -> {
                HeistDialog(
                    initialSafes = dialog.safes,
                    soundManager = viewModel.soundManager,
                    onHeistFinished = { coins, mats -> viewModel.onHeistCompleted(coins, mats) }
                )
            }
            is GameDialogState.MysteryReward -> {
                EventRewardsDialog(
                    title = dialog.title,
                    message = dialog.message,
                    coins = dialog.coins,
                    materials = dialog.materials,
                    energy = dialog.energy,
                    onClaim = { viewModel.onEventRewardClaimed(dialog.coins, dialog.materials, dialog.energy) }
                )
            }
            is GameDialogState.DistrictMilestone -> {
                EventRewardsDialog(
                    title = "🎉 DISTRICT COMPLETED!",
                    message = "You fully constructed ${dialog.districtName}! Next destination: ${dialog.nextDistrictName}!",
                    coins = dialog.coinsReward,
                    materials = 20,
                    energy = dialog.diceReward,
                    onClaim = { viewModel.advanceToNextDistrict() }
                )
            }
            is GameDialogState.Quests -> {
                QuestsDialog(
                    quests = uiState.quests,
                    dailyStreak = uiState.dailyStreak,
                    isStreakClaimable = uiState.isStreakClaimable,
                    onClaimStreak = { viewModel.claimDailyStreak() },
                    onClaimQuest = { qId -> viewModel.claimQuest(qId) },
                    onClose = { viewModel.closeDialog() }
                )
            }
            is GameDialogState.Settings -> {
                SettingsDialog(
                    isSoundEnabled = uiState.isSoundEnabled,
                    isHapticsEnabled = uiState.isHapticsEnabled,
                    isQuickRoll = uiState.isQuickRoll,
                    onSoundToggle = { viewModel.toggleSound(it) },
                    onHapticsToggle = { viewModel.toggleHaptics(it) },
                    onQuickRollToggle = { viewModel.toggleQuickRoll() },
                    onResetProgress = { viewModel.resetGameProgress() },
                    onClose = { viewModel.closeDialog() }
                )
            }
        }
    }
}

/**
 * Central Top Progress Bar for Active Quests and Mini-Games/Activities
 */
@Composable
private fun TopActiveQuestBanner(
    activeQuest: Quest?,
    quests: List<Quest>,
    dailyStreak: Int,
    pulseScale: Float,
    onClaimQuest: (String) -> Unit,
    onSelectQuest: (String) -> Unit,
    onOpenQuestsModal: () -> Unit
) {
    if (activeQuest == null) return

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(
                1.5.dp,
                if (activeQuest.isCompleted && !activeQuest.isClaimed) Color(0xFFF59E0B) else Color(0xFF3B82F6),
                RoundedCornerShape(16.dp)
            )
            .clickable { onOpenQuestsModal() }
            .testTag("top_quest_bar"),
        color = Color(0xE60F172A)
    ) {
        Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp)) {
            // Main Top Bar Row: Icon + Title & Progress + Claim / Reward Chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Quest Icon with illuminated background
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF1E293B))
                        .border(1.dp, Color(0x44FFFFFF), RoundedCornerShape(8.dp))
                ) {
                    Text(text = activeQuest.icon, fontSize = 17.sp)
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Progress Info Column
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = activeQuest.title,
                            color = Color.White,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1
                        )
                        Text(
                            text = "${activeQuest.progress}/${activeQuest.target}",
                            color = if (activeQuest.isCompleted) Color(0xFF34D399) else Color(0xFF94A3B8),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Spacer(modifier = Modifier.height(3.dp))

                    LinearProgressIndicator(
                        progress = { activeQuest.progressFraction },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = if (activeQuest.isCompleted) Color(0xFF10B981) else Color(0xFF3B82F6),
                        trackColor = Color(0xFF334155)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // Action CTA or Reward Chip
                if (activeQuest.isCompleted && !activeQuest.isClaimed) {
                    Button(
                        onClick = { onClaimQuest(activeQuest.id) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .scale(pulseScale)
                            .testTag("claim_top_quest_button")
                    ) {
                        Text(
                            text = "CLAIM!",
                            color = Color.Black,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                } else {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF1E293B),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                    ) {
                        Text(
                            text = "+${activeQuest.energyReward}⚡",
                            color = Color(0xFFFDE68A),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(5.dp))

            // Mini Activity Strip (Mini-games / Quests / Activities)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Daily Streak Pill
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF1E1B4B),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF4338CA)),
                    modifier = Modifier.clickable { onOpenQuestsModal() }
                ) {
                    Text(
                        text = "🔥 Streak D$dailyStreak",
                        color = Color(0xFFF97316),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                // Other Quests
                quests.forEach { q ->
                    val isCurrent = q.id == activeQuest.id
                    val isDone = q.isCompleted && !q.isClaimed
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = when {
                            isDone -> Color(0xFF065F46)
                            isCurrent -> Color(0xFF1D4ED8)
                            else -> Color(0xFF1E293B)
                        },
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isCurrent) Color(0xFF60A5FA) else Color(0x22FFFFFF)
                        ),
                        modifier = Modifier.clickable { onSelectQuest(q.id) }
                    ) {
                        Text(
                            text = "${q.icon} ${q.progress}/${q.target}",
                            color = when {
                                isDone -> Color(0xFF6EE7B7)
                                isCurrent -> Color.White
                                else -> Color(0xFF94A3B8)
                            },
                            fontSize = 9.sp,
                            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Animated Flying Loot Element (Coins, Bricks, Energy) travelling to HUD counters
 */
@Composable
private fun FlyingLootAnimator(
    loot: FlyingLoot,
    screenWidth: Float,
    screenHeight: Float,
    onFinished: () -> Unit
) {
    val progress = remember { Animatable(0f) }

    LaunchedEffect(loot.id) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 650, easing = LinearEasing)
        )
        onFinished()
    }

    val p = progress.value
    val startX = screenWidth * loot.startXFraction
    val startY = screenHeight * loot.startYFraction

    // Target positions in top HUD
    val (targetX, targetY) = when (loot.targetType) {
        LootTargetType.COINS -> Pair(screenWidth * 0.15f, screenHeight * 0.05f)
        LootTargetType.MATERIALS -> Pair(screenWidth * 0.45f, screenHeight * 0.05f)
        LootTargetType.ENERGY -> Pair(screenWidth * 0.5f, screenHeight * 0.88f)
    }

    // Curved parabolic trajectory
    val curX = startX + (targetX - startX) * p
    val arcHeight = screenHeight * 0.12f
    val curY = startY + (targetY - startY) * p - sin(p * PI.toFloat()) * arcHeight

    Box(
        modifier = Modifier
            .offset(x = curX.dp, y = curY.dp)
            .scale(1.2f - p * 0.4f)
    ) {
        Text(
            text = loot.icon,
            fontSize = 22.sp
        )
    }
}

@Composable
private fun ResourcePill(
    icon: String,
    value: String,
    textColor: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(14.dp)),
        color = Color(0xFF1E293B)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = icon, fontSize = 14.sp)
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = value,
                color = textColor,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
