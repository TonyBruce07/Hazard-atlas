import { Lightbulb, ShieldAlert } from 'lucide-react'
import { REPORT_TIPS } from '../../data/reportOptions.js'

export default function ReportAside() {
  return (
    <aside className="report-aside" aria-label="Reporting guidance">
      <div className="aside-card">
        <h2 className="aside-card__title">
          <Lightbulb size={18} aria-hidden="true" /> Tips for a useful report
        </h2>
        <ul className="aside-list">
          {REPORT_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      <div className="aside-card aside-card--emergency">
        <h2 className="aside-card__title">
          <ShieldAlert size={18} aria-hidden="true" /> In immediate danger?
        </h2>
        <p>
          HazardAtlas is not an emergency service. If a hazard puts someone at immediate risk, contact
          your local emergency services first.
        </p>
      </div>
    </aside>
  )
}
