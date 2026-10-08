package com.example.blockbound.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Home
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.blockbound.game.GameViewModel
import com.example.blockbound.model.GameDialogState
import com.example.blockbound.voxel.VoxelDioramaCanvas
import kotlinx.coroutines.delay

@Composable
fun MainGameScreen(
    viewModel: GameViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentDistrict = uiState.districts.getOrNull(uiState.currentDistrictIndex)

    // Auto-dismiss banner after 2.8s
    LaunchedEffect(uiState.bannerNotification) {
        if (uiState.bannerNotification != null) {
            delay(2800)
            viewModel.dismissBanner()
        }
    }

    Box(
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

        // 2. Top Header HUD (Resources, Progression, Actions)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(horizontal = 12.dp, vertical = 8.dp)
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
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        for (s in 1..uiState.maxShields) {
                            Icon(
                                imageVector = Icons.Default.Shield,
                                contentDescription = "Shield",
                                tint = if (s <= uiState.shields) Color(0xFF38BDF8) else Color(0xFF475569),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }

                // Menu buttons: Quests & Settings
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(
                        onClick = { viewModel.openDialog(GameDialogState.Quests) },
                        modifier = Modifier
                            .size(38.dp)
                            .background(Color(0xFF1E293B), CircleShape)
                            .testTag("quests_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Assignment,
                            contentDescription = "Quests",
                            tint = Color(0xFF38BDF8),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = { viewModel.openDialog(GameDialogState.Settings) },
                        modifier = Modifier
                            .size(38.dp)
                            .background(Color(0xFF1E293B), CircleShape)
                            .testTag("settings_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = Color(0xFF94A3B8),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // District Bar & Town Upgrade Button
            if (currentDistrict != null) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .clickable { viewModel.openDialog(GameDialogState.UpgradeTown) }
                        .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(16.dp)),
                    color = Color(0xCC0F172A)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = currentDistrict.name,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "⭐ ${currentDistrict.completedTiers}/${currentDistrict.totalTiers}",
                                    color = Color(0xFFFBBF24),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { currentDistrict.progressFraction },
                                modifier = Modifier
                                    .fillMaxWidth(0.9f)
                                    .height(6.dp)
                                    .clip(RoundedCornerShape(3.dp)),
                                color = Color(0xFF10B981),
                                trackColor = Color(0xFF334155)
                            )
                        }

                        // Build Town CTA Button
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color(0xFF10B981),
                            modifier = Modifier.testTag("town_build_button")
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Build,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "BUILD",
                                    color = Color.White,
                                    fontSize = 11.sp,
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
                modifier = Modifier.padding(top = 8.dp)
            ) {
                val banner = uiState.bannerNotification
                if (banner != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF312E81))
                            .border(1.5.dp, Color(0xFFFBBF24), RoundedCornerShape(12.dp))
                            .padding(vertical = 8.dp, horizontal = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = banner,
                            color = Color(0xFFFDE68A),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }

        // 3. Bottom Controls Panel (Dice Energy bar + 3D Dice Roller)
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color(0xEE090D16), Color(0xFF090D16))
                    )
                )
                .padding(bottom = 16.dp)
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
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${uiState.diceEnergy}/${uiState.maxEnergy}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = if (uiState.diceEnergy < uiState.maxEnergy) "+1 in 00:45" else "FULL",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
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

        // 4. Overlays & Dialogs
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
