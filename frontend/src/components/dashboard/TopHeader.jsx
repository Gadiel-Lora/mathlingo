function TopHeader({ title, subtitle }) {
  return (
    <header className="ml-header">
      <div className="ml-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="ml-header-chips">
        <span className="ml-chip">2° Secundaria</span>
        <span className="ml-chip">UI Demo</span>
      </div>
    </header>
  )
}

export default TopHeader
