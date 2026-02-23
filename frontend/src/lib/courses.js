import { supabase } from '../supabase/client'

const normalizeOptions = (options) => {
  if (Array.isArray(options)) return options.map((item) => String(item))
  return []
}

const toSafeInt = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

const toIdString = (value) => String(value ?? '')

export async function getCourses() {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description')
    .order('id', { ascending: true })

  if (coursesError) throw coursesError

  const { data: lessons, error: lessonsError } = await supabase.from('lessons').select('id, course_id')
  if (lessonsError) throw lessonsError

  const lessonCountByCourse = lessons.reduce((acc, lesson) => {
    const courseId = String(lesson.course_id ?? '')
    if (!courseId) return acc
    acc.set(courseId, (acc.get(courseId) || 0) + 1)
    return acc
  }, new Map())

  return (courses || []).map((course) => ({
    id: String(course.id),
    title: course.title || 'Curso',
    description: course.description || '',
    lessonCount: lessonCountByCourse.get(String(course.id)) || 0,
  }))
}

export async function getLessonsByCourseId(id) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, course_id, order_index')
    .eq('course_id', id)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).map((lesson) => ({
    id: toIdString(lesson.id),
    courseId: toIdString(lesson.course_id),
    title: lesson.title || `Leccion ${lesson.id}`,
    orderIndex: toSafeInt(lesson.order_index),
  }))
}

export async function getQuestionsByLessonId(lessonId) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, lesson_id, question, options, correct_index, order_index')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).map((question) => ({
    id: toIdString(question.id),
    lessonId: toIdString(question.lesson_id),
    question: question.question || '',
    options: normalizeOptions(question.options),
    correctIndex: Number(question.correct_index),
    orderIndex: toSafeInt(question.order_index),
  }))
}

export async function getLessonById(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, course_id, order_index')
    .eq('id', lessonId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: toIdString(data.id),
    title: data.title || `Leccion ${data.id}`,
    courseId: toIdString(data.course_id),
    orderIndex: toSafeInt(data.order_index),
  }
}
