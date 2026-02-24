function Button({ as: Component = 'button', variant = 'primary', className = '', children, ...props }) {
  const variantClass = variant === 'secondary' ? 'cm-btn-secondary' : 'cm-btn-primary'
  return (
    <Component className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}

export default Button
