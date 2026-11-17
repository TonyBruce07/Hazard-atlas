import { Link } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'
import { NAV_LINKS, PROJECT } from '../../data/siteContent.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Logo variant="light" />
          <p className="footer__desc">{PROJECT.description}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="footer__heading">Explore</h2>
          <ul className="footer__links">
            {NAV_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p>© {new Date().getFullYear()} {PROJECT.name}. Hackathon project.</p>
          <p>Safer roads start with the people who use them.</p>
        </div>
      </div>
    </footer>
  )
}
