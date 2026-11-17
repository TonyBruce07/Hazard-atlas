import { useEffect, useRef } from 'react'
import { CircleCheck, Info, RotateCcw, ArrowLeft } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { HAZARD_CATEGORIES, HAZARD_STATUS_LABELS } from '../../data/reportOptions.js'

function formatDateTime(isoString) {
  const date = new Date(isoString)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString()
}

/** Confirmation built from the backend's real 201 response. */
export default function ReportSuccess({ result, onReset }) {
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const hazard = result.hazard
  const category =
    HAZARD_CATEGORIES.find((c) => c.value === hazard?.hazard_type)?.label ?? hazard?.hazard_type ?? 'Unknown'
  const location = hazard ? [hazard.address, hazard.city].filter(Boolean).join(', ') : 'Not available'
  const hasCoordinates = hazard && hazard.latitude !== null && hazard.longitude !== null
  const status = HAZARD_STATUS_LABELS[hazard?.status] ?? hazard?.status ?? 'Unknown'
  const submittedAt = formatDateTime(result.created_at)

  const rows = [
    ['Report ID', String(result.id)],
    ['Hazard ID', result.hazard_id !== null && result.hazard_id !== undefined ? String(result.hazard_id) : 'Not linked yet'],
    ['Hazard category', category],
    ['Location', location],
    ...(hasCoordinates ? [['Coordinates', `${hazard.latitude}, ${hazard.longitude}`]] : []),
    ['Current status', status],
    ['Photo', result.photo_path ? 'Attached' : 'No photo attached'],
    ...(submittedAt ? [['Submitted', submittedAt]] : []),
  ]

  return (
    <div className="report-success">
      <span className="icon-tile icon-tile--navy icon-tile--lg"><CircleCheck size={30} aria-hidden="true" /></span>
      <span className="placeholder__badge">Submitted</span>
      <h2 ref={headingRef} tabIndex={-1}>Your report was submitted</h2>

      <div className="alert alert--info" role="status">
        <Info size={20} className="alert__icon" aria-hidden="true" />
        <p>
          <strong>Your report was successfully submitted to the local HazardAtlas system.</strong> It has
          been saved. No municipality or authority has been notified yet.
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
