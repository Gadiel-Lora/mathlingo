import { supabase } from './supabase'

const normalizeOptions = (options) => {
  if (Array.isArray(options)) return options.map((item) => String(item))
  return []
}

export async function getCourses() {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description')
    .order('id', { ascending: true })

  if (coursesError) throw coursesError

  const { data: lessons, error: lessonsError } = await supabase.from('lessons').select('id, course_id')
  if (lessonsError) throw lessonsError

  const lessonCountByCourse = lessons.reduce((acc, lesson) => {
    const courseId = Number(lesson.course_id)
    if (!Number.isFinite(courseId)) return acc
    acc.set(courseId, (acc.get(courseId) || 0) + 1)
    return acc
  }, new Map())

  return (courses || []).map((course) => ({
    id: Number(course.id),
    title: course.title || 'Curso',
    description: course.description || '',
    lessonCount: lessonCountByCourse.get(Number(course.id)) || 0,
  }))
}

export async function getLessonsByCourseId(courseId) {
  const normalizedCourseId = Number(courseId)
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, course_id, order_index')
    .eq('course_id', normalizedCourseId)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).map((lesson) => ({
    id: Number(lesson.id),
    courseId: Number(lesson.course_id),
    title: lesson.title || `Leccion ${lesson.id}`,
    orderIndex: Number(lesson.order_index) || 0,
  }))
}

export async function getQuestionsByLessonId(lessonId) {
  const normalizedLessonId = Number(lessonId)
  const { data, error } = await supabase
    .from('questions')
    .select('id, lesson_id, question, options, correct_index, order_index')
    .eq('lesson_id', normalizedLessonId)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true })

  if (error) throw error

  return (data || []).map((question) => ({
    id: Number(question.id),
    lessonId: Number(question.lesson_id),
    question: question.question || '',
    options: normalizeOptions(question.options),
    correctIndex: Number(question.correct_index),
    orderIndex: Number(question.order_index) || 0,
  }))
}

export async function getLessonById(lessonId) {
  const normalizedLessonId = Number(lessonId)
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, course_id, order_index')
    .eq('id', normalizedLessonId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: Number(data.id),
    title: data.title || `Leccion ${data.id}`,
    courseId: Number(data.course_id),
    orderIndex: Number(data.order_index) || 0,
  }
}
