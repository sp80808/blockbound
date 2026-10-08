package com.example.blockbound.data

import android.content.Context
import android.content.SharedPreferences
import com.example.blockbound.model.Building
import com.example.blockbound.model.District
import com.example.blockbound.model.Quest
import org.json.JSONArray
import org.json.JSONObject

/**
 * Handles persistent atomic local storage for Blockbound.
 * Preserves district progress, buildings tiers, player currency, energy, quests, and statistics.
 */
class SaveManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("blockbound_save_v1", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SAVE_VERSION = "save_version"
        private const val CURRENT_VERSION = 1

        private const val KEY_COINS = "coins"
        private const val KEY_MATERIALS = "materials"
        private const val KEY_ENERGY = "dice_energy"
        private const val KEY_SHIELDS = "shields"
        private const val KEY_TILE_INDEX = "tile_index"
        private const val KEY_DISTRICT_INDEX = "district_index"
        private const val KEY_TOTAL_ROLLS = "total_rolls"
        private const val KEY_TOTAL_RAIDS = "total_raids"
        private const val KEY_TOTAL_UPGRADES = "total_upgrades"
        private const val KEY_LAST_REGEN = "last_regen"
        private const val KEY_DISTRICTS_JSON = "districts_json"
        private const val KEY_QUESTS_JSON = "quests_json"
        private const val KEY_STREAK_DAYS = "streak_days"
        private const val KEY_LAST_LOGIN_DAY = "last_login_day"
        private const val KEY_LAST_CLAIMED_DAY = "last_claimed_day"
    }

    fun hasSave(): Boolean = prefs.contains(KEY_SAVE_VERSION)

    fun saveGame(
        coins: Long,
        materials: Int,
        energy: Int,
        shields: Int,
        tileIndex: Int,
        districtIndex: Int,
        totalRolls: Int,
        totalRaids: Int,
        totalUpgrades: Int,
        lastRegenTime: Long,
        districts: List<District>,
        quests: List<Quest>
    ) {
        val editor = prefs.edit()
        editor.putInt(KEY_SAVE_VERSION, CURRENT_VERSION)
        editor.putLong(KEY_COINS, coins)
        editor.putInt(KEY_MATERIALS, materials)
        editor.putInt(KEY_ENERGY, energy)
        editor.putInt(KEY_SHIELDS, shields)
        editor.putInt(KEY_TILE_INDEX, tileIndex)
        editor.putInt(KEY_DISTRICT_INDEX, districtIndex)
        editor.putInt(KEY_TOTAL_ROLLS, totalRolls)
        editor.putInt(KEY_TOTAL_RAIDS, totalRaids)
        editor.putInt(KEY_TOTAL_UPGRADES, totalUpgrades)
        editor.putLong(KEY_LAST_REGEN, lastRegenTime)

        // Serialize districts
        val districtsArray = JSONArray()
        for (dist in districts) {
            val dObj = JSONObject()
            dObj.put("id", dist.id)
            dObj.put("unlocked", dist.isUnlocked)
            val bArray = JSONArray()
            for (b in dist.buildings) {
                val bObj = JSONObject()
                bObj.put("id", b.id)
                bObj.put("currentTier", b.currentTier)
                bObj.put("isDamaged", b.isDamaged)
                bArray.put(bObj)
            }
            dObj.put("buildings", bArray)
            districtsArray.put(dObj)
        }
        editor.putString(KEY_DISTRICTS_JSON, districtsArray.toString())

        // Serialize quests
        val questsArray = JSONArray()
        for (q in quests) {
            val qObj = JSONObject()
            qObj.put("id", q.id)
            qObj.put("progress", q.progress)
            qObj.put("isClaimed", q.isClaimed)
            questsArray.put(qObj)
        }
        editor.putString(KEY_QUESTS_JSON, questsArray.toString())

        editor.apply()
    }

    fun loadCoins(default: Long = 25000L): Long = prefs.getLong(KEY_COINS, default)
    fun loadMaterials(default: Int = 12): Int = prefs.getInt(KEY_MATERIALS, default)
    fun loadEnergy(default: Int = 30): Int = prefs.getInt(KEY_ENERGY, default)
    fun loadShields(default: Int = 2): Int = prefs.getInt(KEY_SHIELDS, default)
    fun loadTileIndex(default: Int = 0): Int = prefs.getInt(KEY_TILE_INDEX, default)
    fun loadDistrictIndex(default: Int = 0): Int = prefs.getInt(KEY_DISTRICT_INDEX, default)
    fun loadTotalRolls(): Int = prefs.getInt(KEY_TOTAL_ROLLS, 0)
    fun loadTotalRaids(): Int = prefs.getInt(KEY_TOTAL_RAIDS, 0)
    fun loadTotalUpgrades(): Int = prefs.getInt(KEY_TOTAL_UPGRADES, 0)
    fun loadLastRegen(): Long = prefs.getLong(KEY_LAST_REGEN, System.currentTimeMillis())
    fun loadStreakDays(default: Int = 1): Int = prefs.getInt(KEY_STREAK_DAYS, default)
    fun loadLastLoginDay(): Long = prefs.getLong(KEY_LAST_LOGIN_DAY, 0L)
    fun loadLastClaimedDay(): Long = prefs.getLong(KEY_LAST_CLAIMED_DAY, 0L)

    fun saveStreak(streakDays: Int, lastLoginDay: Long, lastClaimedDay: Long) {
        prefs.edit()
            .putInt(KEY_STREAK_DAYS, streakDays)
            .putLong(KEY_LAST_LOGIN_DAY, lastLoginDay)
            .putLong(KEY_LAST_CLAIMED_DAY, lastClaimedDay)
            .apply()
    }

    fun restoreDistricts(baseDistricts: List<District>): List<District> {
        val jsonStr = prefs.getString(KEY_DISTRICTS_JSON, null) ?: return baseDistricts
        return try {
            val array = JSONArray(jsonStr)
            val savedMap = mutableMapOf<Int, Pair<Boolean, Map<String, Pair<Int, Boolean>>>>()
            for (i in 0 until array.length()) {
                val dObj = array.getJSONObject(i)
                val dId = dObj.getInt("id")
                val unlocked = dObj.optBoolean("unlocked", true)
                val bMap = mutableMapOf<String, Pair<Int, Boolean>>()
                val bArr = dObj.optJSONArray("buildings") ?: JSONArray()
                for (j in 0 until bArr.length()) {
                    val bObj = bArr.getJSONObject(j)
                    val bid = bObj.getString("id")
                    val tier = bObj.getInt("currentTier")
                    val damaged = bObj.optBoolean("isDamaged", false)
                    bMap[bid] = Pair(tier, damaged)
                }
                savedMap[dId] = Pair(unlocked, bMap)
            }

            baseDistricts.map { dist ->
                val savedDist = savedMap[dist.id]
                if (savedDist != null) {
                    val updatedBuildings = dist.buildings.map { b ->
                        val savedB = savedDist.second[b.id]
                        if (savedB != null) {
                            b.copy(currentTier = savedB.first, isDamaged = savedB.second)
                        } else b
                    }
                    dist.copy(buildings = updatedBuildings, isUnlocked = savedDist.first)
                } else dist
            }
        } catch (_: Exception) {
            baseDistricts
        }
    }

    fun restoreQuests(baseQuests: List<Quest>): List<Quest> {
        val jsonStr = prefs.getString(KEY_QUESTS_JSON, null) ?: return baseQuests
        return try {
            val array = JSONArray(jsonStr)
            val map = mutableMapOf<String, Pair<Int, Boolean>>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                map[obj.getString("id")] = Pair(obj.getInt("progress"), obj.getBoolean("isClaimed"))
            }
            baseQuests.map { q ->
                val saved = map[q.id]
                if (saved != null) {
                    q.copy(progress = saved.first, isClaimed = saved.second)
                } else q
            }
        } catch (_: Exception) {
            baseQuests
        }
    }
}
