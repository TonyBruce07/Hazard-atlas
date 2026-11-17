import SectionHeading from '../ui/SectionHeading.jsx'
import { FEATURES } from '../../data/siteContent.js'

export default function Features() {
  return (
    <section className="section section--muted" aria-labelledby="features-title">
      <div className="container">
        <SectionHeading
          id="features-title"
          eyebrow="Platform features"
          title="Intelligence that turns reports into decisions"
          description="Raw reports are only the start. HazardAtlas helps authorities see what matters most."
        />

        <div className="features">
          {FEATURES.map(({ id, icon: Icon, title, text }) => (
            <article key={id} className="feature">
              <span className="icon-tile icon-tile--orange"><Icon size={24} aria-hidden="true" /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
