import { deriveFlowState } from './questionStateFlow.js'

const attemptStateStore = new Map()
const questionStore = new Map()
const blockedFingerprintStore = new Map()

const normalizeKeyPart = (value) => String(value ?? '').trim()

const getAttemptKey = (userId, questionHash) => {
  return `${normalizeKeyPart(userId)}::${normalizeKeyPart(questionHash)}`
}

const buildQuestionState = (question, examMode = false) => ({
  attempts: 0,
  assisted: false,
  locked: false,
  helpClicks: 0,
  completed: false,
  examMode: Boolean(examMode),
  questionType: question?.type || 'multiple-choice',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const getOrCreateBlockedSet = (userId) => {
  const key = normalizeKeyPart(userId)
  if (!blockedFingerprintStore.has(key)) {
    blockedFingerprintStore.set(key, new Set())
  }
  return blockedFingerprintStore.get(key)
}

const blockFingerprint = (userId, question) => {
  if (!question?.fingerprint) return
  const blocked = getOrCreateBlockedSet(userId)
  blocked.add(question.fingerprint)
}

export const registerGeneratedQuestion = ({ userId, question, examMode = false }) => {
  const safeUser = normalizeKeyPart(userId)
  if (!safeUser) throw new Error('userId es obligatorio para registrar la pregunta.')
  if (!question?.hash) throw new Error('question.hash es obligatorio para registrar la pregunta.')

  const key = getAttemptKey(safeUser, question.hash)
  questionStore.set(key, {
    ...question,
    examMode: Boolean(examMode),
  })

  if (!attemptStateStore.has(key)) {
    attemptStateStore.set(key, buildQuestionState(question, examMode))
  }

  return {
    question: questionStore.get(key),
    state: attemptStateStore.get(key),
  }
}

export const getStoredQuestion = ({ userId, questionHash }) => {
  const key = getAttemptKey(userId, questionHash)
  return questionStore.get(key) || null
}

export const getQuestionState = ({ userId, questionHash }) => {
  const key = getAttemptKey(userId, questionHash)
  return attemptStateStore.get(key) || null
}

export const getPublicQuestionState = (state) => {
  if (!state) return null
  return {
    attempts: Number(state.attempts || 0),
    assisted: Boolean(state.assisted),
    locked: Boolean(state.locked),
    helpClicks: Number(state.helpClicks || 0),
    completed: Boolean(state.completed),
    examMode: Boolean(state.examMode),
    questionType: state.questionType || 'multiple-choice',
    flowState: deriveFlowState(state),
  }
}

export const getBlockedFingerprints = (userId) => {
  const blocked = blockedFingerprintStore.get(normalizeKeyPart(userId))
  if (!blocked) return new Set()
  return new Set(blocked)
}

const markUpdated = (state) => {
  state.updatedAt = new Date().toISOString()
  return state
}

const lockByAssistance = ({ userId, questionHash }) => {
  const key = getAttemptKey(userId, questionHash)
  const state = attemptStateStore.get(key)
  const question = questionStore.get(key)

  if (!state) return null

  state.assisted = true
  state.locked = true
  state.completed = true
  state.helpClicks = Math.max(state.helpClicks, 2)
  markUpdated(state)
  blockFingerprint(userId, question)
  return state
}

export const submitAttempt = ({ userId, questionHash, isCorrect, maxAttempts = 3 }) => {
  const key = getAttemptKey(userId, questionHash)
  const state = attemptStateStore.get(key)
  if (!state) throw new Error('No existe estado de intentos para esta pregunta.')

  if (state.locked) {
    return {
      event: 'locked',
      state,
    }
  }

  state.attempts += 1
  markUpdated(state)

  if (Boolean(isCorrect)) {
    state.completed = true
    state.locked = true
    markUpdated(state)
    return {
      event: 'correct',
      state,
    }
  }

  if (state.attempts < Number(maxAttempts || 3)) {
    return {
      event: 'retry',
      state,
    }
  }

  const lockedState = lockByAssistance({ userId, questionHash })
  return {
    event: 'max-attempts',
    state: lockedState,
  }
}

export const registerHelpRequest = ({ userId, questionHash, requestedMode = 'hint' }) => {
  const key = getAttemptKey(userId, questionHash)
  const state = attemptStateStore.get(key)
  if (!state) throw new Error('No existe estado de intentos para esta pregunta.')

  if (state.locked) {
    return {
      event: 'locked',
      mode: state.assisted ? 'full' : 'hint',
      state,
    }
  }

  const normalizedMode = String(requestedMode || '').trim().toLowerCase() === 'full' ? 'full' : 'hint'
  const shouldForceFull = normalizedMode === 'full' || state.helpClicks >= 1

  if (!shouldForceFull) {
    state.helpClicks += 1
    markUpdated(state)
    return {
      event: 'hint',
      mode: 'hint',
      state,
    }
  }

  const lockedState = lockByAssistance({ userId, questionHash })
  return {
    event: 'full',
    mode: 'full',
    state: lockedState,
  }
}

export const resetQuestionState = ({ userId, questionHash }) => {
  const key = getAttemptKey(userId, questionHash)
  attemptStateStore.delete(key)
  questionStore.delete(key)
}

export const resetUserSession = ({ userId }) => {
  const safeUser = normalizeKeyPart(userId)
  if (!safeUser) return

  for (const key of [...attemptStateStore.keys()]) {
    if (key.startsWith(`${safeUser}::`)) {
      attemptStateStore.delete(key)
      questionStore.delete(key)
    }
  }
}
