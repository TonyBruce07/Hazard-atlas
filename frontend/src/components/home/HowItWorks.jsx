import SectionHeading from '../ui/SectionHeading.jsx'
import { STEPS } from '../../data/siteContent.js'

export default function HowItWorks() {
  return (
    <section className="section" aria-labelledby="how-title">
      <div className="container">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From a citizen's report to a repaired road"
          description="Three simple steps connect the people who see hazards with the teams who fix them."
        />

        <ol className="steps">
          {STEPS.map(({ id, number, icon: Icon, title, text }) => (
            <li key={id} className="step">
              <div className="step__top">
                <span className="icon-tile icon-tile--navy"><Icon size={24} aria-hidden="true" /></span>
                <span className="step__number" aria-hidden="true">{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
