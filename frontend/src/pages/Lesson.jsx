import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import brainLogo from '../assets/brain-logo.png'
import QuestionCard from '../components/questions/QuestionCard'
import { useAuth } from '../context/AuthContext'
import { useProgress } from '../context/ProgressContext'
import { decodeLessonRouteId, findLessonContext } from '../lib/academicCurriculum'
import { academicApi } from '../services/academicApi'

const PRACTICE_QUESTION_COUNT = Number(import.meta.env.VITE_PRACTICE_QUESTION_COUNT || 6)
const EXAM_QUESTION_COUNT = Number(import.meta.env.VITE_EXAM_QUESTION_COUNT || 10)

const getQuestionTypeByDifficulty = (difficulty) => {
  return Number(difficulty) >= 3 ? 'input' : 'multiple-choice'
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
  const { completeLesson, xp, level } = useProgress()

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

  const questionStartedAtRef = useRef(Date.now())
  const lessonStatsRef = useRef({
    answered: 0,
    correct: 0,
    totalTimeMs: 0,
    streak: 0,
  })
  const resolvedQuestionsRef = useRef(new Set())

  const isExamLesson = lessonContext?.lessonType === 'exam'

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
      return Math.max(1, Math.min(5, nextDifficulty))
    } catch (error) {
      console.error('Error updating adaptive difficulty:', error?.message || error)
      return recommendedDifficulty
    }
  }

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
    async (difficultyOverride = null) => {
      if (!lessonContext) return false

      setLoadingNextQuestion(true)
      setAiError('')

      const targetDifficulty = Math.max(
        1,
        Math.min(5, Number(difficultyOverride || recommendedDifficulty || lessonContext.difficulty || 1)),
      )

      try {
        const payload = await academicApi.generateQuestion({
          userId: learnerId,
          grade: lessonContext.gradeNumber,
          topic: lessonContext.topicId,
          lessonId: lessonContext.lessonId,
          lessonTitle: lessonContext.lessonTitle,
          lessonSkills: Array.isArray(lessonContext.skills) ? lessonContext.skills : [],
          difficulty: targetDifficulty,
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
    [isExamLesson, learnerId, lessonContext, recommendedDifficulty, resetQuestionUi],
  )

  useEffect(() => {
    let isMounted = true

    const loadLessonContext = async () => {
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

        const payload = await academicApi.getCurriculum(decoded.gradeId)
        if (!isMounted) return

        const grade = payload?.grade || null
        if (!grade) {
          setLessonContext(null)
          setLessonError('No se encontro el grado para la leccion.')
          return
        }

        if (decoded.topicId === 'final-exam' && decoded.lessonId === 'final-exam') {
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
          setRecommendedDifficulty(Math.max(1, Math.min(5, Number(examQuestions[0]?.difficulty || 4))))
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

        setLessonContext({
          ...found,
          isFinalGradeExam: false,
        })
        const questionsToResolve = found.lessonType === 'exam' ? EXAM_QUESTION_COUNT : PRACTICE_QUESTION_COUNT
        setTotalQuestions(Math.max(1, questionsToResolve))
        setRecommendedDifficulty(Math.max(1, Math.min(5, Number(found.difficulty || 1))))
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
  }, [id, learnerId, level, loadExistingQuestionState, resetQuestionUi])

  useEffect(() => {
    if (!lessonContext || loadingLesson || lessonError || completed) return
    if (lessonContext.isFinalGradeExam) return
    if (question) return

    void generateNewQuestion(lessonContext.difficulty)
  }, [completed, generateNewQuestion, lessonContext, lessonError, loadingLesson, question])

  useEffect(() => {
    if (!completed || completionSynced || !lessonContext) return

    let isMounted = true

    const syncLessonCompletion = async () => {
      try {
        let xpToAward = sessionEarnedXp
        let examOutcome = null

        if (lessonContext.isFinalGradeExam) {
          const answered = Math.max(1, Number(lessonStatsRef.current.answered || totalQuestions || 1))
          const score = lessonStatsRef.current.correct / answered
          const passingScore = Number(finalExamRules?.passingScore || 0.7)
          const xpMultiplier = Math.max(1, Number(finalExamRules?.xpMultiplier || 2))
          const passed = score >= passingScore

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

        await completeLesson({
          lessonId: lessonContext.progressId,
          xpEarned: xpToAward,
          incrementStreak: lessonContext.isFinalGradeExam ? Boolean(examOutcome?.passed) : true,
        })

        if (isMounted) {
          setCompletionAwardXp(xpToAward)
          setFinalExamOutcome(examOutcome)
        }
      } catch (error) {
        console.error('Error syncing dynamic lesson completion:', error?.message || error)
      } finally {
        if (isMounted) setCompletionSynced(true)
      }
    }

    void syncLessonCompletion()

    return () => {
      isMounted = false
    }
  }, [completeLesson, completed, completionSynced, finalExamRules, lessonContext, sessionEarnedXp, totalQuestions])

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
      setCompleted(true)
      return
    }

    if (lessonContext?.isFinalGradeExam) {
      const nextQuestion = finalExamQuestions[currentQuestionNumber]
      if (!nextQuestion) {
        setCompleted(true)
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
    setRecommendedDifficulty(adaptiveDifficulty)
    setCurrentQuestionNumber((prev) => prev + 1)
    setQuestion(null)
    await generateNewQuestion(adaptiveDifficulty)
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
  const canLevelUpPreview = completed && level > levelBeforeLesson

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
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-coastal-mist">Leccion completada</h2>
            <p className="text-2xl font-semibold text-coastal-neon">+{completionAwardXp || sessionEarnedXp} XP</p>
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
              </div>
            )}
            {canLevelUpPreview && (
              <p className="text-3xl font-semibold tracking-tight text-verdant-accent">
                Subiste a Nivel {level}
              </p>
            )}
            {!completionSynced && <p className="text-sm text-coastal-mist/75">Sincronizando progreso...</p>}
            <div className="space-x-3">
              <button type="button" onClick={() => navigate(`/course/${lessonContext.gradeId}`)} className="cm-btn-secondary">
                Volver al grado
              </button>
              <Link to="/dashboard" className="cm-btn-primary">
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
