import { Link } from 'react-router-dom'

function Layout({ brandHref = '/', brandLabel = 'Mathlingo', rightAction = null, children, className = '' }) {
  return (
    <div className="cm-shell">
      <header className="cm-navbar">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to={brandHref} className="math-brand-lockup">
            <span className="math-brand-mark">x2</span>
            <span className="text-lg sm:text-xl">{brandLabel}</span>
          </Link>
          {rightAction}
        </nav>
      </header>
      <main className={`mx-auto max-w-5xl px-6 pt-20 pb-16 ${className}`.trim()}>{children}</main>
    </div>
  )
}

export default Layout
