import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import QuestionCard from '../components/questions/QuestionCard'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import {
  decodeLessonRouteId,
  findLessonContext,
  getUnlockedGradeIds,
  isFinalExamUnlockedInGrade,
  isLessonUnlockedInGrade,
} from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

const PRACTICE_QUESTION_COUNT = Number(import.meta.env.VITE_PRACTICE_QUESTION_COUNT || 6)
const EXAM_QUESTION_COUNT = Number(import.meta.env.VITE_EXAM_QUESTION_COUNT || 10)
const PRACTICE_PASS_RATE = Number(import.meta.env.VITE_PRACTICE_PASS_RATE || 0.7)
const EXAM_PASS_RATE = Number(import.meta.env.VITE_EXAM_PASS_RATE || 0.75)

const clampPassRate = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0.5, Math.min(1, parsed))
}

const getQuestionTypeByDifficulty = (difficulty) => {
  return Number(difficulty) >= 4 ? 'input' : 'multiple-choice'
}

const createFallbackQuestionState = (difficulty) => ({
  attempts: 0,
  assisted: false,
  locked: false,
  helpClicks: 0,
  questionType: getQuestionTypeByDifficulty(difficulty),
})

const toSafeInt = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

function Lesson() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const { completeLesson, completedLessons, loadingProgress, xp, level } = useProgress()

  const learnerId = useMemo(() => {
    if (user?.id) return String(user.id)
    return `guest-${String(id || 'lesson')}`
  }, [id, user?.id])

  const [lessonContext, setLessonContext] = useState(null)
  const [loadingLesson, setLoadingLesson] = useState(true)
  const [lessonError, setLessonError] = useState('')

  const [question, setQuestion] = useState(null)
  const [questionState, setQuestionState] = useState(createFallbackQuestionState(1))

  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(PRACTICE_QUESTION_COUNT)
  const [recommendedDifficulty, setRecommendedDifficulty] = useState(1)

  const [selectedOption, setSelectedOption] = useState(null)
  const [freeResponse, setFreeResponse] = useState('')
  const [revealedAnswer, setRevealedAnswer] = useState('')

  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackTone, setFeedbackTone] = useState('neutral')
  const [aiMessage, setAiMessage] = useState('')
  const [aiError, setAiError] = useState('')

  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [loadingHelp, setLoadingHelp] = useState(false)
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false)

  const [sessionEarnedXp, setSessionEarnedXp] = useState(0)
  const [completionAwardXp, setCompletionAwardXp] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [completionSynced, setCompletionSynced] = useState(false)
  const [levelBeforeLesson, setLevelBeforeLesson] = useState(level)
  const [finalExamQuestions, setFinalExamQuestions] = useState([])
  const [finalExamRules, setFinalExamRules] = useState(null)
  const [finalExamOutcome, setFinalExamOutcome] = useState(null)
  const [lessonOutcome, setLessonOutcome] = useState(null)

  const questionStartedAtRef = useRef(Date.now())
  const lessonStatsRef = useRef({
    answered: 0,
    correct: 0,
    totalTimeMs: 0,
    streak: 0,
  })
  const resolvedQuestionsRef = useRef(new Set())
  const completedLessonsRef = useRef(completedLessons)

  const isExamLesson = lessonContext?.lessonType === 'exam'

  useEffect(() => {
    completedLessonsRef.current = completedLessons
  }, [completedLessons])

  const resetQuestionUi = useCallback(() => {
    setSelectedOption(null)
    setFreeResponse('')
    setRevealedAnswer('')
    setFeedbackMessage('')
    setFeedbackTone('neutral')
    setAiMessage('')
    setAiError('')
    questionStartedAtRef.current = Date.now()
  }, [])

  const recordResolvedQuestion = ({ correct, elapsedMs, questionHash }) => {
    if (!questionHash || resolvedQuestionsRef.current.has(questionHash)) return
    resolvedQuestionsRef.current.add(questionHash)

    const stats = lessonStatsRef.current
    stats.answered += 1
    stats.totalTimeMs += Math.max(0, Number(elapsedMs) || 0)

    if (correct) {
      stats.correct += 1
      stats.streak += 1
    } else {
      stats.streak = 0
    }
  }

  const getAdaptiveDifficulty = async () => {
    const stats = lessonStatsRef.current
    if (stats.answered <= 0) return recommendedDifficulty

    try {
      const accuracyRate = stats.correct / stats.answered
      const averageTimeMs = stats.totalTimeMs / stats.answered
      const levelPayload = await academicApi.updateLevel({
        currentDifficulty: recommendedDifficulty,
        accuracyRate,
        averageTimeMs,
        streak: stats.streak,
      })
      const nextDifficulty = toSafeInt(levelPayload?.nextDifficulty || recommendedDifficulty) || recommendedDifficulty
      return Math.max(1, Math.min(9, nextDifficulty))
    } catch (error) {
      console.error('Error updating adaptive difficulty:', error?.message || error)
      return recommendedDifficulty
    }
  }

  const resolveProgressiveDifficultyFloor = useCallback(
    (questionNumber, total) => {
      const safeTotal = Math.max(1, Number(total || totalQuestions || 1))
      const safeNumber = Math.max(1, Number(questionNumber || currentQuestionNumber || 1))
      const progressRatio = safeNumber / safeTotal
      const baseDifficulty = Math.max(2, Number(lessonContext?.difficulty || 1))

      if (progressRatio <= 0.34) return Math.max(2, baseDifficulty)
      if (progressRatio <= 0.67) return Math.max(3, baseDifficulty)
      return Math.max(4, baseDifficulty)
    },
    [currentQuestionNumber, lessonContext?.difficulty, totalQuestions],
  )

  const resolveLessonPassThreshold = useCallback(() => {
    if (lessonContext?.isFinalGradeExam) {
      return clampPassRate(finalExamRules?.passingScore, 0.7)
    }
    if (isExamLesson) {
      return clampPassRate(EXAM_PASS_RATE, 0.75)
    }
    return clampPassRate(PRACTICE_PASS_RATE, 0.7)
  }, [finalExamRules?.passingScore, isExamLesson, lessonContext?.isFinalGradeExam])

  const buildLessonOutcome = useCallback(() => {
    const answered = Math.max(1, Number(lessonStatsRef.current.answered || totalQuestions || 1))
    const correct = Math.max(0, Number(lessonStatsRef.current.correct || 0))
    const score = correct / answered
    const requiredScore = resolveLessonPassThreshold()

    return {
      answered,
      correct,
      score,
      requiredScore,
      passed: score >= requiredScore,
    }
  }, [resolveLessonPassThreshold, totalQuestions])

  const finalizeLessonCompletion = useCallback(async () => {
    if (!lessonContext) return

    const outcome = buildLessonOutcome()
    setLessonOutcome(outcome)
    setCompleted(true)
    setCompletionSynced(false)

    let xpToAward = outcome.passed ? sessionEarnedXp : 0
    let examOutcome = null

    if (lessonContext.isFinalGradeExam) {
      const score = outcome.score
      const passingScore = outcome.requiredScore
      const xpMultiplier = Math.max(1, Number(finalExamRules?.xpMultiplier || 2))
      const passed = outcome.passed

      if (passed && xpMultiplier > 1) {
        xpToAward = Math.floor(sessionEarnedXp * xpMultiplier)
      }

      examOutcome = {
        passed,
        score,
        passingScore,
        xpMultiplier,
        baseXp: sessionEarnedXp,
        awardedXp: xpToAward,
        bonusXp: Math.max(0, xpToAward - sessionEarnedXp),
      }
    }

    try {
      if (outcome.passed) {
        await completeLesson({
          lessonId: lessonContext.progressId,
          xpEarned: xpToAward,
          incrementStreak: lessonContext.isFinalGradeExam ? Boolean(examOutcome?.passed) : true,
        })
      }
    } catch (error) {
      console.error('Error syncing dynamic lesson completion:', error?.message || error)
    } finally {
      setCompletionAwardXp(xpToAward)
      setFinalExamOutcome(examOutcome)
      setCompletionSynced(true)
    }
  }, [buildLessonOutcome, completeLesson, finalExamRules?.xpMultiplier, lessonContext, sessionEarnedXp])

  const loadExistingQuestionState = useCallback(
    async (questionHash, fallbackDifficulty = 1) => {
      if (!questionHash) {
        setQuestionState(createFallbackQuestionState(fallbackDifficulty))
        return
      }

      try {
        const payload = await academicApi.getQuestionState({
          userId: learnerId,
          questionHash,
        })

        setQuestionState({
          ...createFallbackQuestionState(fallbackDifficulty),
          ...(payload?.state || {}),
        })
      } catch (error) {
        console.error('Error loading existing question state:', error?.message || error)
        setQuestionState(createFallbackQuestionState(fallbackDifficulty))
      }
    },
    [learnerId],
  )

  const generateNewQuestion = useCallback(
    async (difficultyOverride = null, questionNumberOverride = null) => {
      if (!lessonContext) return false

      setLoadingNextQuestion(true)
      setAiError('')

      const targetQuestionNumber = Math.max(
        1,
        Number(questionNumberOverride || currentQuestionNumber || 1),
      )
      const progressiveFloor = resolveProgressiveDifficultyFloor(targetQuestionNumber, totalQuestions)
      const targetDifficulty = Math.max(
        1,
          Math.min(
            9,
            Math.max(
              progressiveFloor,
              Number(difficultyOverride || recommendedDifficulty || lessonContext.difficulty || 1),
          ),
        ),
      )

      try {
        const payload = await academicApi.generateQuestion({
          userId: learnerId,
          grade: lessonContext.gradeNumber,
          topic: lessonContext.topicId,
          lessonId: lessonContext.lessonId,
          lessonTitle: lessonContext.lessonTitle,
          lessonSkills: Array.isArray(lessonContext.skills) ? lessonContext.skills : [],
          lessonSubtopics: Array.isArray(lessonContext.lessonSubtopics)
            ? lessonContext.lessonSubtopics
            : Array.isArray(lessonContext.topicSubtopics)
              ? lessonContext.topicSubtopics
              : [],
          problemMix: lessonContext.problemMix || 'mixed',
          questionCount: Number(lessonContext.questionCount || totalQuestions || 0),
          difficulty: targetDifficulty,
          questionNumber: targetQuestionNumber,
          totalQuestions,
          examMode: isExamLesson,
        })

        const generatedQuestion = payload?.question || null
        const generatedState =
          payload?.state || createFallbackQuestionState(generatedQuestion?.difficulty || targetDifficulty)

        setQuestion(generatedQuestion)
        setQuestionState({
          ...createFallbackQuestionState(generatedQuestion?.difficulty || targetDifficulty),
          ...generatedState,
        })
        setRecommendedDifficulty(toSafeInt(generatedQuestion?.difficulty || targetDifficulty) || targetDifficulty)
        resetQuestionUi()
        return true
      } catch (error) {
        setAiError(error?.message || 'No se pudo generar una pregunta.')
        return false
      } finally {
        setLoadingNextQuestion(false)
      }
    },
    [
      currentQuestionNumber,
      isExamLesson,
      learnerId,
      lessonContext,
      recommendedDifficulty,
      resetQuestionUi,
      resolveProgressiveDifficultyFloor,
      totalQuestions,
    ],
  )

  useEffect(() => {
    let isMounted = true

    const loadLessonContext = async () => {
      if (loadingProgress) return

      const decoded = decodeLessonRouteId(id)
      if (!decoded.gradeId || !decoded.topicId || !decoded.lessonId) {
        if (!isMounted) return
        setLessonError('Identificador de leccion invalido.')
        setLoadingLesson(false)
        return
      }

      try {
        setLoadingLesson(true)
        setLessonError('')
        setCompleted(false)
        setCompletionSynced(false)
        setSessionEarnedXp(0)
        setCompletionAwardXp(0)
        setLessonOutcome(null)
        setCurrentQuestionNumber(1)
        setLevelBeforeLesson(level)
        setQuestion(null)
        setQuestionState(createFallbackQuestionState(1))
        setFinalExamQuestions([])
        setFinalExamRules(null)
        setFinalExamOutcome(null)
        resolvedQuestionsRef.current = new Set()
        lessonStatsRef.current = {
          answered: 0,
          correct: 0,
          totalTimeMs: 0,
          streak: 0,
        }

        const payload = await academicApi.getCurriculum()
        if (!isMounted) return

        const allGrades = (payload?.grades || []).slice().sort((left, right) => {
          return Number(left?.gradeNumber || 0) - Number(right?.gradeNumber || 0)
        })
        const grade = allGrades.find((gradeItem) => String(gradeItem.id) === String(decoded.gradeId)) || null
        const unlockedGradeIds = new Set(
          getUnlockedGradeIds({
            grades: allGrades,
            completedLessons: completedLessonsRef.current,
          }),
        )

        if (!grade) {
          setLessonContext(null)
          setLessonError('No se encontro el grado para la leccion.')
          return
        }
        if (!unlockedGradeIds.has(String(grade.id))) {
          setLessonContext(null)
          setLessonError('Este grado esta bloqueado. Completa academicamente el grado anterior.')
          return
        }

        if (decoded.topicId === 'final-exam' && decoded.lessonId === 'final-exam') {
          if (
            !isFinalExamUnlockedInGrade({
              grade,
              completedLessons: completedLessonsRef.current,
            })
          ) {
            setLessonContext(null)
            setLessonError('Examen final bloqueado. Debes completar todas las lecciones del grado.')
            return
          }

          const examPayload = await academicApi.generateFinalExam({
            grade: decoded.gradeId,
            userId: learnerId,
          })

          if (!isMounted) return

          const exam = examPayload?.exam || null
          const examQuestions = Array.isArray(exam?.questions) ? exam.questions : []
          if (examQuestions.length === 0) {
            setLessonContext(null)
            setLessonError('No se pudo generar el examen final.')
            return
          }

          const finalLessonContext = {
            gradeId: grade.id,
            gradeNumber: Number(grade.gradeNumber || 0),
            gradeName: grade.name || grade.id,
            areaId: 'final-exam',
            areaName: 'Evaluacion Final',
            topicId: 'final-exam',
            topicName: 'Examen Integrador',
            lessonId: 'final-exam',
            lessonTitle: exam?.title || `Examen Final ${grade.name || grade.id}`,
            lessonType: 'exam',
            difficulty: 4,
            progressId: `${grade.id}:final-exam`,
            isFinalGradeExam: true,
          }

          setLessonContext(finalLessonContext)
          setFinalExamQuestions(examQuestions)
          setFinalExamRules(exam?.rules || null)
          setTotalQuestions(Math.max(1, Number(exam?.questionCount || examQuestions.length)))
          setRecommendedDifficulty(Math.max(1, Math.min(9, Number(examQuestions[0]?.difficulty || 4))))
          setQuestion(examQuestions[0])
          resetQuestionUi()
          await loadExistingQuestionState(examQuestions[0]?.hash, Number(examQuestions[0]?.difficulty || 4))
          return
        }

        const found = findLessonContext({
          grade,
          topicId: decoded.topicId,
          lessonId: decoded.lessonId,
        })

          if (!found) {
            setLessonContext(null)
            setLessonError('Leccion no encontrada en el plan academico.')
            return
          }
          if (
            !isLessonUnlockedInGrade({
              grade,
              lessonProgressId: found.progressId,
              completedLessons: completedLessonsRef.current,
            })
          ) {
            setLessonContext(null)
            setLessonError('Leccion bloqueada. Completa las lecciones previas para continuar.')
            return
          }

          setLessonContext({
            ...found,
            isFinalGradeExam: false,
          })
        const configuredQuestionCount = Number(found.questionCount || 0)
        const fallbackQuestionCount = found.lessonType === 'exam' ? EXAM_QUESTION_COUNT : PRACTICE_QUESTION_COUNT
        const questionsToResolve =
          Number.isFinite(configuredQuestionCount) && configuredQuestionCount > 0
            ? Math.floor(configuredQuestionCount)
            : fallbackQuestionCount
        setTotalQuestions(Math.max(1, questionsToResolve))
        setRecommendedDifficulty(Math.max(1, Math.min(9, Number(found.difficulty || 1))))
      } catch (error) {
        if (!isMounted) return
        setLessonError(error?.message || 'No se pudo cargar la leccion.')
      } finally {
        if (isMounted) setLoadingLesson(false)
      }
    }

    void loadLessonContext()

    return () => {
      isMounted = false
    }
  }, [id, learnerId, loadExistingQuestionState, loadingProgress, resetQuestionUi])

  useEffect(() => {
    if (!lessonContext || loadingLesson || lessonError || completed) return
    if (lessonContext.isFinalGradeExam) return
    if (question) return

    void generateNewQuestion(lessonContext.difficulty)
  }, [completed, generateNewQuestion, lessonContext, lessonError, loadingLesson, question])

  const submitAnswer = async () => {
    if (!question || questionState.locked || loadingSubmit || loadingNextQuestion) return

    const answer =
      question.type === 'multiple-choice'
        ? selectedOption
        : freeResponse

    if (question.type === 'multiple-choice' && selectedOption === null) return
    if (question.type === 'input' && !String(freeResponse || '').trim()) return

    setLoadingSubmit(true)
    setAiError('')

    try {
      const elapsedMs = Date.now() - questionStartedAtRef.current
      const payload = await academicApi.submitAnswer({
        userId: learnerId,
        questionHash: question.hash,
        answer,
      })

      const nextState = payload?.state || questionState
      setQuestionState({
        ...createFallbackQuestionState(question.difficulty),
        ...nextState,
      })

      if (payload?.correct) {
        const earnedXp = toSafeInt(payload?.xpAwarded)
        if (earnedXp > 0) {
          setSessionEarnedXp((prev) => prev + earnedXp)
        }
        setFeedbackTone('success')
        setFeedbackMessage(payload?.message || (earnedXp > 0 ? `Correcto. +${earnedXp} XP` : 'Correcto. XP = 0'))
        setAiMessage('')
      } else if (payload?.maxAttemptsReached) {
        setFeedbackTone('warning')
        setFeedbackMessage(payload?.message || 'Se alcanzo el maximo de intentos. XP = 0')
        setAiMessage(String(payload?.answer || '').trim())
        setRevealedAnswer(String(payload?.correctAnswer || '').trim())
      } else {
        setFeedbackTone('error')
        setFeedbackMessage(payload?.message || 'Respuesta incorrecta. Intenta nuevamente.')
        setAiMessage('')
      }

      if (nextState?.locked) {
        recordResolvedQuestion({
          correct: Boolean(payload?.correct),
          elapsedMs,
          questionHash: question.hash,
        })
      }
    } catch (error) {
      setAiError(error?.message || 'No se pudo validar la respuesta.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const requestHelp = async (mode) => {
    if (!question || questionState.locked || loadingHelp || loadingSubmit || loadingNextQuestion) return
    if (isExamLesson) return

    const safeMode = mode === 'full' ? 'full' : 'hint'
    setLoadingHelp(true)
    setAiError('')

    try {
      const elapsedMs = Date.now() - questionStartedAtRef.current
      const payload = await academicApi.requestHelp({
        userId: learnerId,
        questionHash: question.hash,
        mode: safeMode,
      })

      const nextState = payload?.state || questionState
      setQuestionState({
        ...createFallbackQuestionState(question.difficulty),
        ...nextState,
      })

      setAiMessage(String(payload?.answer || '').trim())

      if (payload?.mode === 'full') {
        setFeedbackTone('warning')
        setFeedbackMessage('Resuelto con ayuda. XP = 0')
        setRevealedAnswer(String(payload?.correctAnswer || '').trim())
      } else {
        setFeedbackTone('neutral')
        setFeedbackMessage('Pista cargada.')
      }

      if (nextState?.locked) {
        recordResolvedQuestion({
          correct: false,
          elapsedMs,
          questionHash: question.hash,
        })
      }
    } catch (error) {
      setAiError(error?.message || 'No se pudo solicitar ayuda.')
    } finally {
      setLoadingHelp(false)
    }
  }

  const handleNext = async () => {
    if (!questionState.locked || loadingNextQuestion) return

    const isLast = currentQuestionNumber >= totalQuestions
    if (isLast) {
      await finalizeLessonCompletion()
      return
    }

    if (lessonContext?.isFinalGradeExam) {
      const nextQuestion = finalExamQuestions[currentQuestionNumber]
      if (!nextQuestion) {
        await finalizeLessonCompletion()
        return
      }

      setLoadingNextQuestion(true)
      try {
        setCurrentQuestionNumber((prev) => prev + 1)
        setQuestion(nextQuestion)
        setRecommendedDifficulty(toSafeInt(nextQuestion?.difficulty || recommendedDifficulty) || recommendedDifficulty)
        resetQuestionUi()
        await loadExistingQuestionState(nextQuestion?.hash, Number(nextQuestion?.difficulty || recommendedDifficulty))
      } finally {
        setLoadingNextQuestion(false)
      }
      return
    }

    const adaptiveDifficulty = await getAdaptiveDifficulty()
    const nextQuestionNumber = currentQuestionNumber + 1
    const progressiveFloor = resolveProgressiveDifficultyFloor(nextQuestionNumber, totalQuestions)
    const nextDifficulty = Math.max(adaptiveDifficulty, progressiveFloor)

    setRecommendedDifficulty(nextDifficulty)
    setCurrentQuestionNumber(nextQuestionNumber)
    setQuestion(null)
    await generateNewQuestion(nextDifficulty, nextQuestionNumber)
  }

  if (loadingLesson) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-3xl p-8 text-center">
          <p className="text-coastal-mist/75">Cargando leccion...</p>
        </div>
      </div>
    )
  }

  if (!lessonContext || lessonError) {
    return (
      <div className="cm-shell px-6 pt-20 pb-16">
        <div className="cm-card mx-auto max-w-3xl space-y-6 p-8 text-center">
          <h1 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-coastal-mist">Leccion no disponible</h1>
          <p className="text-coastal-mist/75">{lessonError || 'No se pudo cargar la leccion.'}</p>
          <Link to="/dashboard" className="cm-btn-primary">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  const overallProgress = Math.round(((currentQuestionNumber - 1) / totalQuestions) * 100)
  const questionOrPlaceholder = question || {
    id: 'placeholder',
    question: loadingNextQuestion ? 'Generando pregunta...' : 'Pregunta no disponible',
    difficulty: recommendedDifficulty,
    type: getQuestionTypeByDifficulty(recommendedDifficulty),
    options: [],
  }
  const lessonPassed = Boolean(lessonOutcome?.passed)
  const canLevelUpPreview = completed && lessonPassed && level > levelBeforeLesson

  return (
    <div className="cm-shell px-6 pt-20 pb-16">
      <div className="mx-auto max-w-3xl">
        <img src={brainLogo} alt="Mathlingo brain logo" className="mx-auto w-full max-w-24 drop-shadow-2xl" />

        {!completed ? (
          <section className="mt-12 space-y-6">
            <div className="cm-card space-y-5 p-6">
              <h1 className="text-3xl font-semibold tracking-tight text-coastal-mist">{lessonContext.lessonTitle}</h1>
              <p className="text-sm text-coastal-mist/70">
                {lessonContext.gradeName} · {lessonContext.areaName} · {lessonContext.topicName}
                {isExamLesson ? ' · EXAMEN' : ''}
              </p>

              <div className="space-y-3">
                <p className="text-sm text-coastal-mist/75">
                  Pregunta {currentQuestionNumber} de {totalQuestions}
                </p>
                <div className="h-4 w-full rounded-full bg-coastal-steel">
                  <div className="h-4 rounded-full bg-coastal-wave transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            </div>

            {aiError && (
              <p className="rounded-2xl border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm text-red-200">{aiError}</p>
            )}

            <QuestionCard
              question={questionOrPlaceholder}
              state={questionState}
              selectedOption={selectedOption}
              freeResponse={freeResponse}
              aiMessage={aiMessage}
              feedbackMessage={feedbackMessage}
              feedbackTone={feedbackTone}
              loadingHelp={loadingHelp || loadingNextQuestion}
              loadingSubmit={loadingSubmit || loadingNextQuestion}
              helpDisabled={isExamLesson}
              onSelectOption={(index) => {
                if (questionState.locked || loadingNextQuestion) return
                setSelectedOption(index)
              }}
              onChangeFreeResponse={(value) => {
                if (questionState.locked || loadingNextQuestion) return
                setFreeResponse(value)
              }}
              onSubmit={submitAnswer}
              onRequestHint={() => requestHelp('hint')}
              onRequestSolution={() => requestHelp('full')}
              onNext={handleNext}
            />

            {isExamLesson && (
              <p className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Ayuda IA bloqueada en esta leccion de examen.
              </p>
            )}

            {revealedAnswer && (
              <p className="rounded-2xl border border-coastal-neon/40 bg-coastal-steel/60 px-4 py-3 text-sm text-coastal-mist">
                Respuesta correcta: <strong>{revealedAnswer}</strong>
              </p>
            )}
          </section>
        ) : (
          <section className="cm-card mt-12 space-y-6 p-8 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">
              {lessonPassed ? 'Leccion completada' : 'Leccion finalizada (no aprobada)'}
            </h2>
            <p className="text-2xl font-semibold text-coastal-neon">+{completionAwardXp} XP</p>
            {lessonOutcome && !finalExamOutcome && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  lessonPassed
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border border-red-600/40 bg-red-600/10 text-red-200'
                }`}
              >
                <p>
                  Resultado: {(lessonOutcome.score * 100).toFixed(0)}% / objetivo {(lessonOutcome.requiredScore * 100).toFixed(0)}%
                </p>
                {!lessonPassed && <p className="mt-1">No se registro esta leccion como completada. Debes reintentarla.</p>}
              </div>
            )}
            {finalExamOutcome && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  finalExamOutcome.passed
                    ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border border-red-600/40 bg-red-600/10 text-red-200'
                }`}
              >
                <p>
                  {finalExamOutcome.passed ? 'Examen final aprobado' : 'Examen final no aprobado'} (
                  {(finalExamOutcome.score * 100).toFixed(0)}% / objetivo {(finalExamOutcome.passingScore * 100).toFixed(0)}%)
                </p>
                <p className="mt-1">
                  XP base: {finalExamOutcome.baseXp}
                  {finalExamOutcome.bonusXp > 0 ? ` + bono x${finalExamOutcome.xpMultiplier}: ${finalExamOutcome.bonusXp}` : ''}
                </p>
                {!finalExamOutcome.passed && <p className="mt-1">El grado no se desbloquea hasta aprobar este examen final.</p>}
              </div>
            )}
            {canLevelUpPreview && (
              <p className="text-3xl font-semibold tracking-tight text-verdant-accent">
                Subiste a Nivel {level}
              </p>
            )}
            {!completionSynced && <p className="text-sm text-coastal-mist/75">Sincronizando progreso...</p>}
            <div className="space-x-3">
              {!lessonPassed && (
                <button
                  type="button"
                  onClick={() => navigate(`/lesson/${id}`, { replace: true })}
                  className="cm-btn-secondary"
                  disabled={!completionSynced}
                >
                  Reintentar leccion
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/course/${lessonContext.gradeId}`)}
                className="cm-btn-secondary"
                disabled={!completionSynced}
              >
                Volver al grado
              </button>
              <Link
                to="/dashboard"
                className={`cm-btn-primary ${!completionSynced ? 'pointer-events-none opacity-60' : ''}`}
                aria-disabled={!completionSynced}
              >
                Ir al dashboard
              </Link>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-coastal-mist/60">XP actual: {xp} - Nivel {level}</p>
      </div>
    </div>
  )
}

export default Lesson
