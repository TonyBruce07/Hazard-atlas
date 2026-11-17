import { ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function PlaceholderPage({ icon: Icon, title, description, badge = 'Coming soon' }) {
  usePageTitle(title)
  return (
    <section className="placeholder">
      <div className="container placeholder__inner">
        {Icon && (
          <span className="icon-tile icon-tile--navy icon-tile--lg">
            <Icon size={30} aria-hidden="true" />
          </span>
        )}
        <span className="placeholder__badge">{badge}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <Button to="/" variant="outline" icon={ArrowLeft} iconPosition="start">
          Back to home
        </Button>
      </div>
    </section>
  )
}
