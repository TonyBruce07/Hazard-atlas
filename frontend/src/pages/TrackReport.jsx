import { useState } from 'react'
import { Search, ClipboardList, MapPin, Calendar, CheckCircle2 } from 'lucide-react'
import usePageTitle from '../hooks/usePageTitle.js'
import { trackHazardReport } from '../services/reportService.js'
import { HAZARD_CATEGORIES, HAZARD_STATUS_LABELS } from '../data/reportOptions.js'
import './TrackReport.css'

const STATUS_STEPS = [
  'open',
  'under_review',
  'acknowledged',
  'in_progress',
  'resolved',
  'verified',
]

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString()
}

function formatStatus(status) {
  return HAZARD_STATUS_LABELS[status] ||
    status?.replaceAll('_', ' ') ||
    'Unknown'
}

export default function TrackReport() {
  usePageTitle('Track Report')

  const [code, setCode] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!code.trim() || loading) return

    setLoading(true)
    setError('')
    setReport(null)

    try {
      const result = await trackHazardReport(code)
      setReport(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hazard = report?.hazard
  const currentStatus = hazard?.status?.toLowerCase() || 'open'
  const currentIndex = STATUS_STEPS.indexOf(currentStatus)
  const location = hazard
    ? [hazard.address, hazard.city].filter(Boolean).join(', ')
    : 'Location unavailable'

  const category =
    HAZARD_CATEGORIES.find(
      (item) => item.value === hazard?.hazard_type
    )?.label || hazard?.hazard_type || 'Unknown'

  return (
    <section className="track-page">
      <div className="container track-page__container">
        <div className="track-page__header">
          <span className="track-page__eyebrow">Citizen services</span>
          <h1>Track your report</h1>
          <p>
            Enter the tracking code you received after submitting
            your road hazard report.
          </p>
        </div>

        <form className="track-form" onSubmit={handleSubmit}>
          <label htmlFor="tracking-code">Report tracking code</label>

          <div className="track-form__controls">
            <input
              id="tracking-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter your tracking code"
              maxLength={32}
              required
              autoComplete="off"
            />

            <button type="submit" disabled={loading || !code.trim()}>
              <Search size={18} />
              {loading ? 'Searching...' : 'Track report'}
            </button>
          </div>
        </form>

        {error && (
          <div className="track-error" role="alert">
            {error}
          </div>
        )}

        {report && (
          <div className="track-result">
            <div className="track-result__heading">
              <div>
                <span className="track-page__eyebrow">
                  Report found
                </span>
                <h2>Report progress</h2>
              </div>

              <span className="track-status">
                {formatStatus(currentStatus)}
              </span>
            </div>

            <div className="track-details">
              <div className="track-detail">
                <ClipboardList size={19} />
                <div>
                  <span>Tracking code</span>
                  <strong>{report.tracking_code}</strong>
                </div>
              </div>

              <div className="track-detail">
                <ClipboardList size={19} />
                <div>
                  <span>Hazard category</span>
                  <strong>{category}</strong>
                </div>
              </div>

              <div className="track-detail">
                <MapPin size={19} />
                <div>
                  <span>Location</span>
                  <strong>{location}</strong>
                </div>
              </div>

              <div className="track-detail">
                <Calendar size={19} />
                <div>
                  <span>Submitted</span>
                  <strong>{formatDate(report.created_at)}</strong>
                </div>
              </div>
            </div>

            <div className="track-description">
              <h3>Report description</h3>
              <p>{report.description}</p>
            </div>

            <div className="track-progress">
              <h3>Status progress</h3>

              {STATUS_STEPS.map((step, index) => {
                const completed =
                  currentIndex >= 0 && index <= currentIndex

                return (
                  <div
                    className={`track-progress__step ${
                      completed ? 'is-complete' : ''
                    }`}
                    key={step}
                  >
                    <span className="track-progress__icon">
                      <CheckCircle2 size={20} />
                    </span>

                    <div>
                      <strong>{formatStatus(step)}</strong>
                      {index === currentIndex && (
                        <span className="track-progress__current">
                          Current status
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {hazard?.resolved_at && (
              <p className="track-result__date">
                Resolved: {formatDate(hazard.resolved_at)}
              </p>
            )}

            {hazard?.verified_at && (
              <p className="track-result__date">
                Verified: {formatDate(hazard.verified_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}