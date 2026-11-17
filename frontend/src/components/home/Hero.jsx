import { TriangleAlert, ArrowRight } from 'lucide-react'
import Button from '../ui/Button.jsx'
import HeroVisual from './HeroVisual.jsx'
import { HAZARD_TYPES } from '../../data/siteContent.js'

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__badge">
            <span className="hero__badge-dot" /> Community-powered road safety
          </p>

          <h1 id="hero-title">
            Turn road hazard reports into <span className="text-accent">safer streets.</span>
          </h1>

          <p className="hero__lead">
            HazardAtlas lets citizens report potholes, open manholes and unsafe crossings in
            moments, and gives municipal teams the evidence to fix the riskiest spots first.
          </p>

          <div className="hero__actions">
            <Button to="/report" variant="primary" icon={TriangleAlert} iconPosition="start">
              Report a Hazard
            </Button>
            <Button to="/map" variant="ghost-dark" icon={ArrowRight}>
              Explore Hazards
            </Button>
          </div>

          <div className="hero__types">
            <p className="hero__types-label">What you can report</p>
            <ul>
              {HAZARD_TYPES.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}
