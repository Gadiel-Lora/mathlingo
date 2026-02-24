import { createElement } from 'react'

function Button({ as = 'button', variant = 'primary', className = '', children, ...props }) {
  const variantClass = variant === 'secondary' ? 'cm-btn-secondary' : 'cm-btn-primary'
  return createElement(as, { className: `${variantClass} ${className}`.trim(), ...props }, children)
}

export default Button
