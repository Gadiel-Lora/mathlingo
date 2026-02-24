import { createElement } from 'react'

function Card({ as = 'section', className = '', children, ...props }) {
  return createElement(as, { className: `cm-card ${className}`.trim(), ...props }, children)
}

export default Card
