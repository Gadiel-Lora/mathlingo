import { useMemo, useState } from 'react'

import RightPanel from './RightPanel'
import SidebarNav from './SidebarNav'
import TopHeader from './TopHeader'
import { SIDEBAR_ITEMS, VIEW_META } from './constants'
import AchievementsView from './views/AchievementsView'
import AutonomousView from './views/AutonomousView'
import JourneyView from './views/JourneyView'
import ProfileView from './views/ProfileView'
import ProgressView from './views/ProgressView'
import ReviewsView from './views/ReviewsView'
import './mathlingo-dashboard.css'

const VIEW_COMPONENTS = {
  recorrido: JourneyView,
  autonomo: AutonomousView,
  repasos: ReviewsView,
  logros: AchievementsView,
  progreso: ProgressView,
  perfil: ProfileView,
}

function MathLingoDashboard() {
  const [activeView, setActiveView] = useState('recorrido')
  const meta = VIEW_META[activeView] || VIEW_META.recorrido
  const ActiveComponent = useMemo(() => VIEW_COMPONENTS[activeView] || JourneyView, [activeView])
  const activeLabel = SIDEBAR_ITEMS.find((item) => item.id === activeView)?.label || 'Recorrido'

  return (
    <div className="ml-app">
      <aside className="ml-sidebar">
        <SidebarNav activeView={activeView} onChangeView={setActiveView} />
      </aside>

      <div className="ml-main-column">
        <TopHeader title={meta.title} subtitle={meta.subtitle} />
        <main className="ml-main-panel" aria-label={`Vista ${activeLabel}`}>
          <ActiveComponent />
        </main>
      </div>

      <RightPanel activeView={activeView} />
    </div>
  )
}

export default MathLingoDashboard
