import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        d="M16 2C10.5 2 6 6.4 6 11.8 6 19 16 30 16 30s10-11 10-18.2C26 6.4 21.5 2 16 2z"
        fill="#FF6B1A"
      />
      <rect x="14.6" y="7" width="2.8" height="7.2" rx="1.4" fill="#0B1F3A" />
      <circle cx="16" cy="18.2" r="1.7" fill="#0B1F3A" />
    </svg>
  )
}

export default function Logo({ variant = 'dark' }) {
  return (
    <Link to="/" className={`logo logo--${variant}`} aria-label="HazardAtlas home">
      <LogoMark />
      <span className="logo__text">
        <span className="logo__strong">Hazard</span>
        <span className="logo__light">Atlas</span>
      </span>
    </Link>
  )
}
