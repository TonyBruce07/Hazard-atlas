import { Link } from 'react-router-dom'

/**
 * Button that renders a router <Link> when `to` is given, otherwise a real <button>.
 * variant: 'primary' | 'ghost-dark' | 'outline'
 * size: 'sm' (optional)
 * iconPosition: 'start' | 'end'
 */
export default function Button({
  to,
  variant = 'primary',
  size,
  icon: Icon,
  iconPosition = 'end',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, className].filter(Boolean).join(' ')
  const icon = Icon ? (
    <Icon className={`btn__icon btn__icon--${iconPosition}`} size={18} aria-hidden="true" />
  ) : null

  const content = (
    <>
      {iconPosition === 'start' && icon}
      {children}
      {iconPosition === 'end' && icon}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}
