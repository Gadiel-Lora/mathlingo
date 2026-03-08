import { CURRICULUM_GRADES } from '../../curriculum/index.js'

const BASE_MASTERY_THRESHOLD = 64
const MIN_MASTERY_THRESHOLD = 60
const MAX_MASTERY_THRESHOLD = 95
const DEFAULT_DOMAIN = 'logic-discrete'

const DOMAIN_ALIASES = {
  arithmetic: 'arithmetic',
  aritmetica: 'arithmetic',
  'numeros-naturales': 'arithmetic',
  'aritmetica-fundamental': 'arithmetic',
  'aritmetica-avanzada': 'arithmetic',
  algebra: 'algebra',
  'algebra-basica': 'algebra',
  geometry: 'geometry',
  geometria: 'geometry',
  measurement: 'geometry',
  medicion: 'geometry',
  trigonometry: 'trigonometry',
  trigonometria: 'trigonometry',
  calculus: 'calculus',
  calculo: 'calculus',
  functions: 'calculus',
  funciones: 'calculus',
  probability: 'probability-stats',
  estadistica: 'probability-stats',
  probabilidad: 'probability-stats',
  'estadistica-probabilidad': 'probability-stats',
  logic: 'logic-discrete',
  discreta: 'logic-discrete',
  'logica-discreta': 'logic-discrete',
}

const clamp = (value, min, max) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

const normalizeId = (value) => String(value ?? '').trim()

const normalizeDomain = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-')

const resolveDomain = (area) => {
  const raw = normalizeDomain(area?.id || area?.name || '')
  if (!raw) return DEFAULT_DOMAIN
  if (DOMAIN_ALIASES[raw]) return DOMAIN_ALIASES[raw]
  const token = raw.split('-').filter(Boolean).find((part) => DOMAIN_ALIASES[part])
  return token ? DOMAIN_ALIASES[token] : DEFAULT_DOMAIN
}

const deriveMasteryThreshold = (difficultyLevel) => {
  const threshold = BASE_MASTERY_THRESHOLD + Number(difficultyLevel || 1) * 3
  return clamp(Math.round(threshold), MIN_MASTERY_THRESHOLD, MAX_MASTERY_THRESHOLD)
}

const deriveXpReward = ({ lesson, difficultyLevel }) => {
  const configured = Number(lesson?.xpReward)
  if (Number.isFinite(configured) && configured >= 0) return Math.floor(configured)
  const questionCount = clamp(Number(lesson?.questionCount || 4), 1, 20)
  return Math.max(12, Math.floor(8 + difficultyLevel * 5 + questionCount))
}

const toSafeSet = (items) => {
  if (!Array.isArray(items)) return new Set()
  return new Set(items.map((item) => normalizeId(item)).filter(Boolean))
}

const ensureMapArray = (map, key) => {
  if (!map.has(key)) map.set(key, [])
  return map.get(key)
}

const parseGradeFilter = (value) => {
  if (value == null) return null
  const clean = normalizeId(value)
  if (!clean) return null
  if (/^grade-\d+$/i.test(clean)) {
    const parsed = Number(clean.match(/\d+/)?.[0] || '')
    return Number.isFinite(parsed) ? { gradeNumber: Math.floor(parsed), gradeId: clean.toLowerCase() } : null
  }

  const parsed = Number(clean)
  if (Number.isFinite(parsed)) return { gradeNumber: Math.floor(parsed), gradeId: `grade-${Math.floor(parsed)}` }

  const numericMatch = clean.match(/\d+/)
  if (!numericMatch) return { gradeNumber: null, gradeId: clean.toLowerCase() }
  const fromText = Number(numericMatch[0])
  if (Number.isFinite(fromText)) {
    return { gradeNumber: Math.floor(fromText), gradeId: `grade-${Math.floor(fromText)}` }
  }
  return { gradeNumber: null, gradeId: clean.toLowerCase() }
}

const buildGraphCache = () => {
  const nodes = []
  const edges = []
  const nodesById = new Map()
  const domainIndex = new Map()
  const prerequisitesById = new Map()
  const dependentsById = new Map()

  let previousGradeTailNodeId = null

  for (const grade of CURRICULUM_GRADES) {
    let previousAreaTailNodeId = previousGradeTailNodeId
    let lastNodeIdInGrade = previousGradeTailNodeId

    for (const area of grade?.areas || []) {
      const domain = resolveDomain(area)
      let previousTopicTailNodeId = previousAreaTailNodeId

      for (const topic of area?.topics || []) {
        let previousLessonNodeId = previousTopicTailNodeId

        for (const lesson of topic?.lessons || []) {
          const nodeId = `${grade.id}:${topic.id}:${lesson.id}`
          const prereqIds = previousLessonNodeId ? [previousLessonNodeId] : []
          const difficultyLevel = clamp(Number(lesson?.difficulty || 1), 1, 10)
          const masteryThreshold = deriveMasteryThreshold(difficultyLevel)
          const xpReward = deriveXpReward({ lesson, difficultyLevel })
          const questionCount = clamp(Number(lesson?.questionCount || 4), 1, 40)
          const complexityWeight = Number(
            (
              difficultyLevel * 0.72 +
              questionCount * 0.18 +
              (lesson?.problemMix === 'advanced-modeling' ? 1.1 : lesson?.problemMix === 'contextualized' ? 0.45 : 0.2)
            ).toFixed(2),
          )

          const node = {
            id: nodeId,
            name: lesson?.title || lesson?.id || nodeId,
            description: `Habilidad ${lesson?.title || lesson?.id || nodeId} en ${topic?.name || topic?.id || 'tema'}.`,
            difficulty_level: difficultyLevel,
            domain,
            prerequisites: [...prereqIds],
            unlocks: [],
            exercises_pool: `pool:${grade.id}:${topic.id}:${lesson.id}`,
            xp_reward: xpReward,
            mastery_threshold: masteryThreshold,
            gradeId: grade.id,
            gradeNumber: Number(grade?.gradeNumber || 0),
            gradeName: grade?.name || grade.id,
            areaId: area.id,
            areaName: area?.name || area.id,
            topicId: topic.id,
            topicName: topic?.name || topic.id,
            lessonId: lesson.id,
            lessonTitle: lesson?.title || lesson.id,
            lessonType: lesson?.type || 'practice',
            lessonRouteId: lesson?.routeId || `${grade.id}~${topic.id}~${lesson.id}`,
            lessonProgressId: lesson?.progressId || `${grade.id}:${topic.id}:${lesson.id}`,
            questionCount,
            problemMix: String(lesson?.problemMix || topic?.problemMix || 'mixed'),
            complexityWeight,
          }

          nodes.push(node)
          nodesById.set(node.id, node)
          prerequisitesById.set(node.id, [...node.prerequisites])
          ensureMapArray(domainIndex, domain).push(node.id)

          for (const prereqId of prereqIds) {
            edges.push({
              from: prereqId,
              to: node.id,
              type: 'prerequisite',
            })
            ensureMapArray(dependentsById, prereqId).push(node.id)
          }

          previousLessonNodeId = node.id
          previousTopicTailNodeId = node.id
          lastNodeIdInGrade = node.id
        }
      }

      previousAreaTailNodeId = previousTopicTailNodeId
    }

    if (lastNodeIdInGrade) previousGradeTailNodeId = lastNodeIdInGrade
  }

  for (const node of nodes) {
    node.unlocks = [...(dependentsById.get(node.id) || [])]
  }

  return {
    nodes,
    edges,
    nodesById,
    domainIndex,
    prerequisitesById,
    dependentsById,
  }
}

const validateAcyclicGraph = (graphCache) => {
  const visitState = new Map()
  const visitStack = []

  const visitNode = (nodeId) => {
    const currentState = visitState.get(nodeId) || 0
    if (currentState === 2) return
    if (currentState === 1) {
      const cycleStart = visitStack.indexOf(nodeId)
      const cycle = cycleStart >= 0 ? [...visitStack.slice(cycleStart), nodeId] : [...visitStack, nodeId]
      throw new Error(`[domainGraph] cycle detected: ${cycle.join(' -> ')}`)
    }

    visitState.set(nodeId, 1)
    visitStack.push(nodeId)

    const dependents = graphCache.dependentsById.get(nodeId) || []
    for (const dependentId of dependents) {
      if (!graphCache.nodesById.has(dependentId)) {
        throw new Error(`[domainGraph] invalid dependent reference: ${nodeId} -> ${dependentId}`)
      }
      visitNode(dependentId)
    }

    visitStack.pop()
    visitState.set(nodeId, 2)
  }

  for (const node of graphCache.nodes) {
    if (!graphCache.nodesById.has(node.id)) {
      throw new Error(`[domainGraph] invalid node index for ${node.id}`)
    }
    for (const prereqId of node.prerequisites) {
      if (!graphCache.nodesById.has(prereqId)) {
        throw new Error(`[domainGraph] invalid prerequisite reference: ${node.id} requires ${prereqId}`)
      }
    }
  }

  for (const node of graphCache.nodes) {
    visitNode(node.id)
  }
}

const GRAPH_CACHE = buildGraphCache()
validateAcyclicGraph(GRAPH_CACHE)

const masteryValueFromMap = (masteryMap, skillId) => {
  if (!masteryMap || typeof masteryMap !== 'object') return 0
  const raw = masteryMap[skillId]
  if (raw == null) return 0
  if (typeof raw === 'number') return clamp(raw, 0, 100)
  if (typeof raw === 'object') {
    if (Number.isFinite(Number(raw.mastery_score))) return clamp(Number(raw.mastery_score), 0, 100)
    if (Number.isFinite(Number(raw.mastery))) return clamp(Number(raw.mastery), 0, 100)
    if (Number.isFinite(Number(raw.score))) return clamp(Number(raw.score), 0, 100)
  }
  return 0
}

const normalizeMasteryMap = (userMastery = {}) => {
  if (userMastery instanceof Map) {
    const mapped = {}
    for (const [skillId, value] of userMastery.entries()) {
      mapped[normalizeId(skillId)] = masteryValueFromMap({ [skillId]: value }, skillId)
    }
    return mapped
  }
  if (Array.isArray(userMastery)) {
    const mapped = {}
    for (const item of userMastery) {
      const skillId = normalizeId(item?.skillId || item?.id)
      if (!skillId) continue
      mapped[skillId] = masteryValueFromMap({ [skillId]: item }, skillId)
    }
    return mapped
  }

  const mapped = {}
  for (const [key, value] of Object.entries(userMastery || {})) {
    const skillId = normalizeId(key)
    if (!skillId) continue
    mapped[skillId] = masteryValueFromMap({ [skillId]: value }, skillId)
  }
  return mapped
}

const matchesOptionalFilters = (skill, { domain, grade } = {}) => {
  if (domain && skill.domain !== normalizeDomain(domain)) return false
  if (!grade) return true
  const parsedGrade = parseGradeFilter(grade)
  if (!parsedGrade) return true
  if (parsedGrade.gradeNumber && Number(skill.gradeNumber) === Number(parsedGrade.gradeNumber)) return true
  return normalizeId(skill.gradeId).toLowerCase() === normalizeId(parsedGrade.gradeId).toLowerCase()
}

const resolveNodeState = (node, completedSet) => {
  const completed = completedSet.has(node.id)
  if (completed) return 'completed'
  const unlocked = node.prerequisites.every((prereqId) => completedSet.has(prereqId))
  return unlocked ? 'unlocked' : 'locked'
}

export const getAllSkills = () => [...GRAPH_CACHE.nodes]

export const getSkill = (id) => {
  const key = normalizeId(id)
  if (!key) return null
  return GRAPH_CACHE.nodesById.get(key) || null
}

export const getPrerequisites = (id) => {
  const skill = getSkill(id)
  if (!skill) return []
  return (GRAPH_CACHE.prerequisitesById.get(skill.id) || []).map((skillId) => getSkill(skillId)).filter(Boolean)
}

export const getDependents = (id) => {
  const skill = getSkill(id)
  if (!skill) return []
  return (GRAPH_CACHE.dependentsById.get(skill.id) || []).map((skillId) => getSkill(skillId)).filter(Boolean)
}

export const getDomainSkills = (domain) => {
  const domainKey = normalizeDomain(domain)
  if (!domainKey) return []
  const ids = GRAPH_CACHE.domainIndex.get(domainKey) || []
  return ids.map((id) => getSkill(id)).filter(Boolean)
}

export const isSkillMastered = (skill, userMastery = {}) => {
  if (!skill) return false
  const masteryMap = normalizeMasteryMap(userMastery)
  return masteryValueFromMap(masteryMap, skill.id) >= Number(skill.mastery_threshold || MIN_MASTERY_THRESHOLD)
}

const arePrerequisitesMastered = (skill, masteryMap = {}) => {
  if (!skill) return false
  if (!Array.isArray(skill.prerequisites) || skill.prerequisites.length === 0) return true
  return skill.prerequisites.every((prereqId) => {
    const prereqSkill = getSkill(prereqId)
    const threshold = Number(prereqSkill?.mastery_threshold || MIN_MASTERY_THRESHOLD)
    return masteryValueFromMap(masteryMap, prereqId) >= threshold
  })
}

export const getUnlockFrontier = (userMastery = {}, options = {}) => {
  const masteryMap = normalizeMasteryMap(userMastery)
  const includeMastered = Boolean(options?.includeMastered)
  const selectedNodes = GRAPH_CACHE.nodes.filter((skill) => matchesOptionalFilters(skill, options))

  const frontier = []
  for (const skill of selectedNodes) {
    if (!arePrerequisitesMastered(skill, masteryMap)) continue
    const mastery = masteryValueFromMap(masteryMap, skill.id)
    const mastered = mastery >= Number(skill.mastery_threshold || MIN_MASTERY_THRESHOLD)
    if (!includeMastered && mastered) continue
    frontier.push({
      ...skill,
      mastery,
      mastered,
      masteryGap: Math.max(0, Number(skill.mastery_threshold || MIN_MASTERY_THRESHOLD) - mastery),
    })
  }

  return frontier.sort((left, right) => {
    if (left.mastered !== right.mastered) return left.mastered ? 1 : -1
    if (left.masteryGap !== right.masteryGap) return right.masteryGap - left.masteryGap
    if (left.difficulty_level !== right.difficulty_level) return left.difficulty_level - right.difficulty_level
    return left.id.localeCompare(right.id)
  })
}

export const getRecommendedSkills = (userMastery = {}, options = {}) => {
  const limit = Math.max(1, Math.floor(Number(options?.limit || 5)))
  const frontier = getUnlockFrontier(userMastery, options).filter((skill) => !skill.mastered)

  const ranked = frontier
    .map((skill) => {
      const masteryGap = Number(skill.masteryGap || 0)
      const score = Number((masteryGap * 1.8 + skill.difficulty_level * 1.5 + skill.prerequisites.length * 2).toFixed(4))
      return {
        ...skill,
        recommendationScore: score,
      }
    })
    .sort((left, right) => {
      if (left.recommendationScore !== right.recommendationScore) {
        return right.recommendationScore - left.recommendationScore
      }
      if (left.difficulty_level !== right.difficulty_level) return left.difficulty_level - right.difficulty_level
      return left.id.localeCompare(right.id)
    })

  return ranked.slice(0, limit)
}

export const getDomainGraph = ({ grade = null, completedSkills = [], revealAll = false } = {}) => {
  const gradeFilter = parseGradeFilter(grade)
  const completedSet = toSafeSet(completedSkills)

  const selectedNodes = GRAPH_CACHE.nodes.filter((node) => {
    if (!gradeFilter) return true
    if (gradeFilter.gradeNumber && Number(node.gradeNumber) === Number(gradeFilter.gradeNumber)) return true
    return normalizeId(node.gradeId).toLowerCase() === normalizeId(gradeFilter.gradeId).toLowerCase()
  })

  const nodeStateById = new Map()
  for (const node of selectedNodes) {
    nodeStateById.set(node.id, resolveNodeState(node, completedSet))
  }

  const visibleNodes = selectedNodes.filter((node) => {
    if (revealAll) return true
    const state = nodeStateById.get(node.id)
    if (state === 'completed' || state === 'unlocked') return true
    return node.prerequisites.some((prereqId) => completedSet.has(prereqId))
  })

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id))
  const visibleEdges = GRAPH_CACHE.edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))

  return {
    grade: gradeFilter?.gradeNumber || gradeFilter?.gradeId || null,
    revealAll: Boolean(revealAll),
    totals: {
      nodes: selectedNodes.length,
      visibleNodes: visibleNodes.length,
      hiddenNodes: Math.max(0, selectedNodes.length - visibleNodes.length),
      edges: visibleEdges.length,
    },
    nodes: visibleNodes.map((node) => ({
      ...node,
      difficulty: node.difficulty_level,
      branchId: node.domain,
      branchName: node.domain,
      state: nodeStateById.get(node.id) || 'locked',
    })),
    edges: visibleEdges,
  }
}

export const getAvailableSkills = ({ grade = null, completedSkills = [] } = {}) => {
  const graph = getDomainGraph({
    grade,
    completedSkills,
    revealAll: true,
  })

  return graph.nodes.filter((node) => node.state === 'unlocked' || node.state === 'completed')
}

export const toSkillId = ({ gradeNumber, gradeId, topicId, lessonId }) => {
  const safeGradeNumber = Number(gradeNumber)
  const safeGrade = Number.isFinite(safeGradeNumber)
    ? `grade-${Math.floor(safeGradeNumber)}`
    : normalizeId(gradeId || gradeNumber)
  return [safeGrade, normalizeId(topicId), normalizeId(lessonId)].filter(Boolean).join(':')
}

export const getSkillGraphMetadata = () => {
  return {
    totals: {
      skills: GRAPH_CACHE.nodes.length,
      edges: GRAPH_CACHE.edges.length,
      domains: GRAPH_CACHE.domainIndex.size,
      grades: CURRICULUM_GRADES.length,
    },
    domains: [...GRAPH_CACHE.domainIndex.keys()].sort(),
  }
}
