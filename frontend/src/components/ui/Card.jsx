function Card({ as: Component = 'section', className = '', children, ...props }) {
  return (
    <Component className={`cm-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}

export default Card
