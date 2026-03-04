import { SIDEBAR_ITEMS } from './constants'

function SidebarNav({ activeView, onChangeView }) {
  return (
    <div className="ml-sidebar-shell">
      <div className="ml-brand">
        <span className="ml-brand-mark">ML</span>
        <div>
          <p className="ml-brand-title">MathLingo</p>
          <p className="ml-brand-subtitle">Secundaria</p>
        </div>
      </div>

      <nav className="ml-nav" aria-label="Navegacion principal">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.id === activeView
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`ml-nav-item ${isActive ? 'is-active' : ''}`.trim()}
            >
              <span className="ml-nav-indicator" aria-hidden="true" />
              <span className="ml-nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="ml-nav-label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default SidebarNav
