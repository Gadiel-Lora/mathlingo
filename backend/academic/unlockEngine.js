import { getRecommendedSkills, getSkill, getUnlockFrontier } from './domainGraph.js'
import { getUserMasteryMap } from './masteryEngine.js'

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const normalizeId = (value) => String(value ?? '').trim()

const normalizeMasteryMap = (value) => {
  if (!value) return {}
  if (value instanceof Map) {
    const mapped = {}
    for (const [skillId, mastery] of value.entries()) {
      const safeSkillId = normalizeId(skillId)
      if (!safeSkillId) continue
      mapped[safeSkillId] = clamp(Number(mastery), 0, 100)
    }
    return mapped
  }
  if (Array.isArray(value)) {
    const mapped = {}
    for (const item of value) {
      const safeSkillId = normalizeId(item?.skillId || item?.id)
      if (!safeSkillId) continue
      const mastery = Number(item?.mastery_score ?? item?.mastery ?? item?.score ?? 0)
      mapped[safeSkillId] = clamp(mastery, 0, 100)
    }
    return mapped
  }

  const mapped = {}
  for (const [skillId, mastery] of Object.entries(value || {})) {
    const safeSkillId = normalizeId(skillId)
    if (!safeSkillId) continue
    mapped[safeSkillId] = clamp(Number(mastery), 0, 100)
  }
  return mapped
}

const resolveMastery = (masteryMap, skillId) => clamp(Number(masteryMap?.[skillId] || 0), 0, 100)

export const isUnlocked = (skill, masteryMap = {}) => {
  if (!skill) return false
  if (!Array.isArray(skill.prerequisites) || skill.prerequisites.length === 0) return true
  const normalizedMastery = normalizeMasteryMap(masteryMap)
  return skill.prerequisites.every((prereqId) => {
    const prereqSkill = getSkill(prereqId)
    const threshold = Number(prereqSkill?.mastery_threshold || 70)
    return resolveMastery(normalizedMastery, prereqId) >= threshold
  })
}

export const getUnlockedSkills = (userId, options = {}) => {
  const masteryMap = normalizeMasteryMap(options?.masteryMap || getUserMasteryMap(userId))
  const includeMastered = Boolean(options?.includeMastered ?? true)
  const frontier = getUnlockFrontier(masteryMap, {
    domain: options?.domain || null,
    grade: options?.grade || null,
    includeMastered,
  })

  return frontier.map((skill) => ({
    ...skill,
    unlocked: true,
  }))
}

export const getNextSkills = (userId, domain = null, options = {}) => {
  const masteryMap = normalizeMasteryMap(options?.masteryMap || getUserMasteryMap(userId))
  const limit = Math.max(1, Math.floor(Number(options?.limit || 8)))
  return getRecommendedSkills(masteryMap, {
    domain: domain || options?.domain || null,
    grade: options?.grade || null,
    limit,
  })
}

export const getUnlockSnapshot = (userId, options = {}) => {
  const masteryMap = normalizeMasteryMap(options?.masteryMap || getUserMasteryMap(userId))
  const unlocked = getUnlockedSkills(userId, {
    ...options,
    masteryMap,
    includeMastered: true,
  })
  const next = getNextSkills(userId, options?.domain || null, {
    ...options,
    masteryMap,
    limit: options?.limit || 8,
  })

  return {
    masteryTrackedSkills: Object.keys(masteryMap).length,
    unlocked,
    next,
  }
}
