import { useEffect, useRef } from 'react'
import { CircleCheck, FlaskConical, RotateCcw, ArrowLeft } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { HAZARD_CATEGORIES } from '../../data/reportOptions.js'

/** Clearly-labelled DEMO confirmation. Nothing has been saved or sent. */
export default function ReportSuccess({ result, report, onReset }) {
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const category = HAZARD_CATEGORIES.find((c) => c.value === report.category)?.label ?? report.category
  const hasCoords = report.latitude !== null && report.longitude !== null

  const rows = [
    ['Category', category],
    ['Location', `${report.street}, ${report.city}`],
    ...(hasCoords ? [['Coordinates', `${report.latitude}, ${report.longitude}`]] : []),
    ['Photo', report.photo ? report.photo.name : 'No photo attached'],
    ['Demo reference', result.referenceId],
  ]

  return (
    <div className="report-success">
      <span className="icon-tile icon-tile--navy icon-tile--lg"><CircleCheck size={30} aria-hidden="true" /></span>
      <span className="placeholder__badge">Demo submission</span>
      <h2 ref={headingRef} tabIndex={-1}>Demo complete: your report was validated</h2>

      <div className="alert alert--warning" role="note">
        <FlaskConical size={20} className="alert__icon" aria-hidden="true" />
        <p>
          <strong>Nothing was saved or sent.</strong> HazardAtlas does not have a backend yet, so this
          report has not been stored and no authority has received it. The reference below is a demo
          placeholder, not a tracking number.
        </p>
      </div>

      <dl className="summary">
        {rows.map(([term, detail]) => (
          <div key={term} className="summary__row">
            <dt>{term}</dt>
            <dd>{detail}</dd>
          </div>
        ))}
      </dl>

      <div className="form-actions">
        <Button variant="primary" icon={RotateCcw} iconPosition="start" onClick={onReset}>
          Submit another report
        </Button>
        <Button to="/" variant="outline" icon={ArrowLeft} iconPosition="start">
          Back to home
        </Button>
      </div>
    </div>
  )
}
