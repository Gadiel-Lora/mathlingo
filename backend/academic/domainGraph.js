import { CURRICULUM_GRADES } from '../../curriculum/index.js'

const normalizeId = (value) => String(value ?? '').trim()

const toSafeSet = (items) => {
  if (!Array.isArray(items)) return new Set()
  return new Set(items.map((item) => normalizeId(item)).filter(Boolean))
}

const buildGraphCache = () => {
  const nodes = []
  const edges = []
  const nodesById = new Map()
  const topicToBranch = new Map()

  let previousGradeTailNodeId = null

  for (const grade of CURRICULUM_GRADES) {
    for (const area of grade?.areas || []) {
      for (const topic of area?.topics || []) {
        topicToBranch.set(topic.id, area.id)
      }
    }
  }

  for (const grade of CURRICULUM_GRADES) {
    let previousAreaTailNodeId = previousGradeTailNodeId
    let lastNodeIdInGrade = previousGradeTailNodeId

    for (const area of grade?.areas || []) {
      let previousTopicTailNodeId = previousAreaTailNodeId

      for (const topic of area?.topics || []) {
        let previousLessonNodeId = previousTopicTailNodeId

        for (const lesson of topic?.lessons || []) {
          const nodeId = `${grade.id}:${topic.id}:${lesson.id}`
          const prereqIds = previousLessonNodeId ? [previousLessonNodeId] : []
          const complexityWeight = Number(
            (
              Number(lesson?.difficulty || 1) * 0.7 +
              Number(lesson?.questionCount || 4) * 0.2 +
              (lesson?.problemMix === 'advanced-modeling' ? 1.2 : lesson?.problemMix === 'contextualized' ? 0.5 : 0)
            ).toFixed(2),
          )

          const node = {
            id: nodeId,
            gradeId: grade.id,
            gradeNumber: Number(grade?.gradeNumber || 0),
            gradeName: grade?.name || grade.id,
            areaId: area.id,
            areaName: area?.name || area.id,
            branchId: topicToBranch.get(topic.id) || area.id,
            topicId: topic.id,
            topicName: topic?.name || topic.id,
            lessonId: lesson.id,
            lessonTitle: lesson?.title || lesson.id,
            lessonType: lesson?.type || 'practice',
            difficulty: Number(lesson?.difficulty || 1),
            questionCount: Number(lesson?.questionCount || 4),
            problemMix: String(lesson?.problemMix || topic?.problemMix || 'mixed'),
            complexityWeight,
            prerequisites: prereqIds,
          }

          nodes.push(node)
          nodesById.set(nodeId, node)

          for (const prereqId of prereqIds) {
            edges.push({
              from: prereqId,
              to: nodeId,
              type: 'prerequisite',
            })
          }

          previousLessonNodeId = nodeId
          previousTopicTailNodeId = nodeId
          lastNodeIdInGrade = nodeId
        }
      }

      previousAreaTailNodeId = previousTopicTailNodeId
    }

    if (lastNodeIdInGrade) {
      previousGradeTailNodeId = lastNodeIdInGrade
    }
  }

  return {
    nodes,
    edges,
    nodesById,
  }
}

const GRAPH_CACHE = buildGraphCache()

const resolveNodeState = (node, completedSet) => {
  const completed = completedSet.has(node.id)
  if (completed) return 'completed'

  const unlocked = node.prerequisites.every((prereqId) => completedSet.has(prereqId))
  return unlocked ? 'unlocked' : 'locked'
}

export const getDomainGraph = ({ grade = null, completedSkills = [], revealAll = false } = {}) => {
  const parsedGrade = Number(grade)
  const gradeFilter = Number.isFinite(parsedGrade) ? Math.floor(parsedGrade) : null
  const completedSet = toSafeSet(completedSkills)

  const selectedNodes = gradeFilter
    ? GRAPH_CACHE.nodes.filter((node) => Number(node.gradeNumber) === gradeFilter)
    : GRAPH_CACHE.nodes

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
    grade: gradeFilter,
    revealAll: Boolean(revealAll),
    totals: {
      nodes: selectedNodes.length,
      visibleNodes: visibleNodes.length,
      hiddenNodes: Math.max(0, selectedNodes.length - visibleNodes.length),
      edges: visibleEdges.length,
    },
    nodes: visibleNodes.map((node) => ({
      ...node,
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

export const toSkillId = ({ gradeNumber, topicId, lessonId }) => {
  const safeGrade = Number.isFinite(Number(gradeNumber)) ? Math.floor(Number(gradeNumber)) : normalizeId(gradeNumber)
  return [safeGrade, normalizeId(topicId), normalizeId(lessonId)].join(':')
}
