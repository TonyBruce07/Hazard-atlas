import { Link } from 'react-router-dom'

/**
 * Router-aware button.
 * variant: 'primary' | 'ghost-dark' | 'outline'
 * iconPosition: 'start' | 'end'
 */
export default function Button({
  to,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'end',
  children,
  ...rest
}) {
  const icon = Icon ? (
    <Icon className={`btn__icon btn__icon--${iconPosition}`} size={18} aria-hidden="true" />
  ) : null

  return (
    <Link to={to} className={`btn btn--${variant}`} {...rest}>
      {iconPosition === 'start' && icon}
      {children}
      {iconPosition === 'end' && icon}
    </Link>
  )
}
