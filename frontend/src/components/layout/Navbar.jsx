import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../ui/Logo.jsx'
import { NAV_LINKS } from '../../data/siteContent.js'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the mobile menu after navigating
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Logo />

        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav
          id="primary-navigation"
          className={`navbar__menu${open ? ' is-open' : ''}`}
          aria-label="Primary"
        >
          <ul className="navbar__links">
  {NAV_LINKS.map(({ to, label, end }) => (
    <li key={to}>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `navbar__link${isActive ? ' is-active' : ''}`
        }
      >
        {label}
      </NavLink>
    </li>
  ))}

  <li>
    <NavLink
      to="/track"
      className={({ isActive }) =>
        `navbar__link${isActive ? ' is-active' : ''}`
      }
    >
      Track Report
    </NavLink>
  </li>
</ul>
        </nav>
      </div>
    </header>
  )
}
