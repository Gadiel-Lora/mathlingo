import { useParams } from 'react-router-dom'
import LessonView from '../components/lesson/LessonView'

export default function Lesson() {
  const { id } = useParams()
  return <LessonView lessonRouteId={id} />
}
