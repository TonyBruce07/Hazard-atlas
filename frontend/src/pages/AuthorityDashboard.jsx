
import AuthorityHazardMap from '../components/AuthorityHazardMap.jsx'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  ShieldAlert,
  MapPin,
  ClipboardList,
  TrendingUp,
} from 'lucide-react'

import usePageTitle from '../hooks/usePageTitle.js'
import './AuthorityDashboard.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

const API = `${API_BASE_URL}/api/authority`

const STATUS_OPTIONS = [
  ['open', 'Open'],
  ['under_review', 'Under review'],
  ['acknowledged', 'Acknowledged'],
  ['in_progress', 'In progress'],
  ['resolved', 'Resolved'],
  ['verified', 'Verified'],
]

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical']

const AUTHORITY_OPTIONS = [
  'Municipal Corporation',
  'Traffic Police',
  'Road Maintenance Department',
  'Highway Authority',
]

function formatStatus(value = '') {
  return value.replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

function formatDateTime(value) {
  if (!value) return 'Not recorded'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleString()
}

function priorityName(score = 0) {
  if (score >= 80) return 'Critical'
  if (score >= 60) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <article className={`authority-stat authority-stat--${tone}`}>
      <div className="authority-stat__top">
        <span>{label}</span>
        <span className="authority-stat__icon">
          <Icon size={19} />
        </span>
      </div>

      <strong>{value ?? 0}</strong>
      <small>{note}</small>
    </article>
  )
}

export default function AuthorityDashboard() {
  usePageTitle('Authority Dashboard')

  const [stats, setStats] = useState(null)
  const [hazards, setHazards] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState('')
  const [hazardType, setHazardType] = useState('')
  const [sort, setSort] = useState('priority')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [notice, setNotice] = useState('')
  const [expandedCaseId, setExpandedCaseId] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [statsResponse, hazardsResponse] = await Promise.all([
        axios.get(`${API}/dashboard`, {
          timeout: 15000,
        }),

        axios.get(`${API}/hazards`, {
          params: {
            limit: 500,
            search: search.trim() || undefined,
            city: city.trim() || undefined,
            status: status || undefined,
            hazard_type: hazardType || undefined,
            sort,
          },
          timeout: 15000,
        }),
      ])

      setStats(statsResponse.data)

      setHazards(
        Array.isArray(hazardsResponse.data)
          ? hazardsResponse.data
          : []
      )
            // Analytics loads independently so its failure won't break the case register.
      try {
        const analyticsResponse = await axios.get(`${API}/analytics`, {
          timeout: 15000,
        })

        setAnalytics(analyticsResponse.data)
        setAnalyticsError('')
      } catch (analyticsErr) {
        setAnalyticsError('Analytics are temporarily unavailable.')
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load authority data. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }, [search, city, status, hazardType, sort])

  useEffect(() => {
    const timer = setTimeout(loadDashboard, 250)

    return () => clearTimeout(timer)
  }, [loadDashboard])

  const cities = useMemo(
    () =>
      [...new Set(
        hazards.map(item => item.city).filter(Boolean)
      )].sort(),
    [hazards]
  )

  const verifiedCount = useMemo(
    () => hazards.filter(hazard => hazard.status === 'verified').length,
    [hazards]
  )

  const verificationRate = useMemo(() => {
    const resolvedCount = hazards.filter(
      hazard => ['resolved', 'verified'].includes(hazard.status)
    ).length

    return resolvedCount
      ? Math.round((verifiedCount / resolvedCount) * 100)
      : 0
  }, [hazards, verifiedCount])
    // Risk intelligence calculations
  const overdueHazards = useMemo(
    () => hazards.filter(hazard => hazard.is_overdue),
    [hazards]
  )

  const topRiskHazards = useMemo(
    () =>
      [...hazards]
        .sort(
          (a, b) =>
            (b.priority_score ?? 0) - (a.priority_score ?? 0)
        )
        .slice(0, 5),
    [hazards]
  )

  const handleUpdate = async (hazardId, changes) => {
    setUpdatingId(hazardId)
    setNotice('')
    setError('')

    try {
      await axios.patch(
        `${API}/hazards/${hazardId}`,
        changes,
        { timeout: 15000 }
      )

      setNotice(`Hazard #${hazardId} updated successfully.`)

      await loadDashboard()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        `Could not update hazard #${hazardId}.`
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleResolutionSubmit = async (event, hazardId) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    const resolutionNotes = formData.get('resolution_notes')?.trim()
    const resolvedBy = formData.get('resolved_by')?.trim()

    if (!resolutionNotes || !resolvedBy) {
      setError("Please enter resolution notes and the responsible person's name.")
      return
    }

    await handleUpdate(hazardId, {
      status: 'resolved',
      resolution_notes: resolutionNotes,
      resolved_by: resolvedBy,
    })
  }

  const handleVerificationSubmit = async (event, hazardId) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const verifiedBy = formData.get('verified_by')?.trim()

    if (!verifiedBy) {
      setError('Please enter the verifier’s name.')
      return
    }

    await handleUpdate(hazardId, {
      status: 'verified',
      verified_by: verifiedBy,
    })
  }

  return (
    <main className="authority-page">
      <div className="authority-container">

        {/* Dashboard heading */}

        <header className="authority-heading">
          <div>
            <div className="authority-eyebrow">
              <ShieldAlert size={15} />
              ROAD SAFETY INTELLIGENCE
            </div>

            <h1>Authority Dashboard</h1>

            <p>
              Monitor reported hazards, prioritize risks and track resolution
              across cities.
            </p>
          </div>

          <button
            className="authority-refresh"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? 'is-spinning' : ''}
            />
            Refresh data
          </button>
          <button
  type="button"
  className="authority-refresh"
  onClick={() => {
    sessionStorage.removeItem('hazardatlas_token')
    window.location.assign('/login')
  }}
>
  Sign out
</button>
        </header>

        {/* Notifications */}

        {error && (
          <div
            className="authority-alert authority-alert--error"
            role="alert"
          >
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {notice && (
          <div
            className="authority-alert authority-alert--success"
            role="status"
          >
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {/* Dashboard statistics */}

        <section
          className="authority-stats"
          aria-label="Dashboard statistics"
        >
          <StatCard
            icon={ClipboardList}
            label="Total hazards"
            value={stats?.total_hazards}
            note="All submitted hazard records"
            tone="blue"
          />

          <StatCard
            icon={Clock3}
            label="Unresolved"
            value={stats?.open_hazards}
            note="Awaiting completion"
            tone="amber"
          />

          <StatCard
            icon={Activity}
            label="In progress"
            value={stats?.in_progress_hazards}
            note="Currently being addressed"
            tone="purple"
          />

          <StatCard
            icon={CheckCircle2}
            label="Resolved"
            value={stats?.resolved_hazards}
            note="Resolved or verified"
            tone="green"
          />

          <StatCard
            icon={ShieldAlert}
            label="Critical priority"
            value={stats?.critical_hazards}
            note="Priority score 80–100"
            tone="red"
          />

          <StatCard
            icon={TrendingUp}
            label="Average priority"
            value={stats?.average_priority ?? 0}
            note="Across all hazards"
            tone="slate"
          />

          <StatCard
            icon={CheckCircle2}
            label="Verified hazards"
            value={verifiedCount}
            note={`${verificationRate}% of resolved records verified`}
            tone="green"
          />
        </section>

        {/* Geographic intelligence map */}

        {/* Risk Intelligence Overview */}
                {/* Analytics and Insights */}
        <section className="analytics-section">
          <div className="analytics-heading">
            <div>
              <span className="authority-eyebrow">
                DATA-DRIVEN INSIGHTS
              </span>
              <h2>Road Safety Analytics</h2>
              <p>
                Understand reporting patterns and measure hazard-resolution
                performance.
              </p>
            </div>
          </div>

          {analyticsError && (
            <p className="analytics-error" role="status">
              {analyticsError}
            </p>
          )}

          <div className="analytics-summary-grid">
            <article className="analytics-summary-card">
              <span>Total reports</span>
              <strong>{analytics?.total_hazards ?? 0}</strong>
              <small>All recorded hazards</small>
            </article>

            <article className="analytics-summary-card">
              <span>Resolution rate</span>
              <strong>{analytics?.resolution_rate ?? 0}%</strong>
              <small>Resolved or verified</small>
            </article>

            <article className="analytics-summary-card">
              <span>Average resolution time</span>
              <strong>
                {analytics?.average_resolution_days ?? 0}
                <small className="analytics-unit"> days</small>
              </strong>
              <small>Among records with resolution dates</small>
            </article>

            <article className="analytics-summary-card">
              <span>Resolved records</span>
              <strong>{analytics?.resolved_hazards ?? 0}</strong>
              <small>Resolved or verified hazards</small>
            </article>
          </div>

          <div className="analytics-charts-grid">
            {/* Category distribution */}
            <article className="analytics-panel">
              <h3>Hazards by category</h3>
              <p className="analytics-panel__description">
                Most frequently reported hazard types.
              </p>

              {analytics?.category_distribution?.length ? (
                <div className="analytics-bars">
                  {analytics.category_distribution.map(item => {
                    const maximum = Math.max(
                      ...analytics.category_distribution.map(
                        entry => entry.count
                      ),
                      1
                    )

                    return (
                      <div className="analytics-bar-row" key={item.category}>
                        <div className="analytics-bar-label">
                          <span>{formatStatus(item.category)}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill analytics-bar-fill--category"
                            style={{
                              width: `${(item.count / maximum) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="analytics-empty">No category data available yet.</p>
              )}
            </article>

            {/* Severity distribution */}
            <article className="analytics-panel">
              <h3>Hazards by severity</h3>
              <p className="analytics-panel__description">
                Distribution of reported risk levels.
              </p>

              <div className="analytics-bars">
                {(analytics?.severity_distribution || []).map(item => {
                  const maximum = Math.max(
                    ...(analytics?.severity_distribution || []).map(
                      entry => entry.count
                    ),
                    1
                  )

                  return (
                    <div className="analytics-bar-row" key={item.severity}>
                      <div className="analytics-bar-label">
                        <span>{formatStatus(item.severity)}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="analytics-bar-track">
                        <div
                          className={`analytics-bar-fill analytics-bar-fill--${item.severity}`}
                          style={{
                            width: `${(item.count / maximum) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Monthly reporting trend */}
            <article className="analytics-panel analytics-panel--wide">
              <h3>Monthly reporting trend</h3>
              <p className="analytics-panel__description">
                Number of hazards reported in the last six calendar months.
              </p>

              <div className="monthly-trend">
                {(analytics?.monthly_trend || []).map(item => {
                  const maximum = Math.max(
                    ...(analytics?.monthly_trend || []).map(
                      entry => entry.count
                    ),
                    1
                  )

                  const monthLabel = new Date(
                    `${item.month}-01T00:00:00`
                  ).toLocaleDateString(undefined, {
                    month: 'short',
                    year: '2-digit',
                  })

                  return (
                    <div className="monthly-trend__item" key={item.month}>
                      <strong>{item.count}</strong>
                      <div className="monthly-trend__track">
                        <div
                          className="monthly-trend__bar"
                          style={{
                            height: `${Math.max(
                              (item.count / maximum) * 100,
                              item.count > 0 ? 5 : 0
                            )}%`,
                          }}
                        />
                      </div>
                      <span>{monthLabel}</span>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Status distribution */}
            <article className="analytics-panel">
              <h3>Case status distribution</h3>
              <p className="analytics-panel__description">
                Current state of recorded hazards.
              </p>

              {analytics?.status_distribution?.length ? (
                <div className="analytics-status-list">
                  {analytics.status_distribution.map(item => (
                    <div className="analytics-status-row" key={item.status}>
                      <span>{formatStatus(item.status)}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-empty">No status data available yet.</p>
              )}
            </article>
          </div>

          <p className="analytics-footnote">
            Analytics are calculated from recorded hazard data. Resolution
            time includes only resolved records with both submission and
            resolution timestamps.
          </p>
        </section>
        <section className="risk-overview">
          <div className="risk-overview__header">
            <div>
              <span className="authority-eyebrow">
                RISK INTELLIGENCE
              </span>
              <h2>Priority and overdue monitoring</h2>
              <p>
                Highest-risk hazards ranked using severity, report
                concentration, hazard type and age.
              </p>
            </div>

            <div className={`risk-overview__count ${
              overdueHazards.length > 0 ? 'has-overdue' : ''
            }`}>
              {overdueHazards.length} overdue
            </div>
          </div>

          {overdueHazards.length > 0 && (
            <div className="risk-overview__alert" role="alert">
              <AlertTriangle size={18} />
              <span>
                {overdueHazards.length} unresolved hazard(s) have
                remained open for at least 7 days. Review these cases.
              </span>
            </div>
          )}

          {topRiskHazards.length === 0 ? (
            <p className="risk-overview__empty">
              No hazard records are available for risk ranking.
            </p>
          ) : (
            <div className="risk-overview__grid">
              {topRiskHazards.map((hazard, index) => (
                <article className="risk-card" key={hazard.id}>
                  <div className="risk-card__top">
                    <strong>
                      #{index + 1} · Hazard {hazard.id}
                    </strong>
                    <span className="risk-card__score">
                      {hazard.priority_score ?? 0}/100
                    </span>
                  </div>

                  <h3>{formatStatus(hazard.hazard_type || 'Unknown')}</h3>

                  <p>
                    {hazard.city || 'Location unavailable'}
                  </p>

                  <div className="risk-card__bottom">
                    <span>
                      {priorityName(hazard.priority_score ?? 0)} priority
                    </span>

                    {hazard.is_overdue && (
                      <span className="risk-card__overdue">
                        Overdue {hazard.overdue_days ?? 0} day(s)
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="risk-overview__note">
            Risk scores are decision-support estimates, not predictions
            of accidents. Overdue means unresolved for at least 7 days.
          </p>
        </section>

        {/* Geographic intelligence map */}

       <AuthorityHazardMap
          hazards={hazards}
          loading={loading}
          error={error}
       />

        {/* Live case register */}

        <section className="authority-workspace">

          <div className="authority-section-heading">
            <div>
              <span className="authority-eyebrow">
                LIVE CASE REGISTER
              </span>

              <h2>Reported road hazards</h2>

              <p>
                Search, filter, assign authorities and update hazard records.
              </p>
            </div>

            <span className="authority-result-count">
              {hazards.length} results
            </span>
          </div>

          {/* Search and filters */}

          <div className="authority-filters">

            <label className="authority-search">
              <Search size={17} />

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search city, street, type or ID..."
              />
            </label>

            <select
              value={city}
              onChange={event => setCity(event.target.value)}
            >
              <option value="">All cities</option>

              {cities.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>

              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={hazardType}
              onChange={event => setHazardType(event.target.value)}
            >
              <option value="">All categories</option>
              <option value="pothole">Pothole</option>
              <option value="damaged_surface">Damaged surface</option>
              <option value="uncovered_manhole">Uncovered manhole</option>
              <option value="road_obstruction">Road obstruction</option>
              <option value="unsafe_crossing">Unsafe crossing</option>
              <option value="other">Other</option>
            </select>

            <select
              value={sort}
              onChange={event => setSort(event.target.value)}
            >
              <option value="priority">Highest priority</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>

          </div>

          {/* Hazard records table */}

          <div className="authority-table-wrap">
            <table className="authority-table">

              <thead>
                <tr>
                  <th>Hazard</th>
                  <th>Location</th>
                  <th>Priority</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Assigned authority</th>
                  <th>Update status</th>
                  <th>Resolution & verification</th>
                </tr>
              </thead>

              <tbody>

                {loading && hazards.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="authority-empty">
                      Loading hazard records...
                    </td>
                  </tr>
                ) : hazards.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="authority-empty">
                      No hazards match these filters.
                    </td>
                  </tr>
                ) : (
                  hazards.map(hazard => (
  <>

                    <tr key={hazard.id}>

                      {/* Hazard information */}

                      <td>
                        <strong>
                          #{hazard.id} · {formatStatus(hazard.hazard_type)}
                        </strong>

                        <small>{hazard.address}</small>
                      </td>

                      {/* Location */}

                      <td>
                        <span className="authority-location">
                          <MapPin size={14} />
                          {hazard.city}
                        </span>
                      </td>

                      {/* Priority */}

                      <td>
                        <span
                          className={`authority-priority authority-priority--${priorityName(
                            hazard.priority_score
                          ).toLowerCase()}`}
                        >
                          {hazard.priority_score ?? 0} ·{' '}
                          {priorityName(hazard.priority_score)}
                        </span>
                            {hazard.is_overdue && (
                            <small className="risk-overdue-label">
                              <AlertTriangle size={12} />
                              Overdue
                            </small>
                          )}
                      </td>

                      {/* Severity update */}

                      <td>
                        <select
                          aria-label={`Severity for hazard ${hazard.id}`}
                          value={hazard.severity || 'medium'}
                          disabled={updatingId === hazard.id}
                          onChange={event =>
                            handleUpdate(hazard.id, {
                              severity: event.target.value,
                            })
                          }
                        >
                          {SEVERITY_OPTIONS.map(value => (
                            <option key={value} value={value}>
                              {value.charAt(0).toUpperCase() + value.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Current status */}

                      <td>
                        <span
                          className={`authority-status authority-status--${hazard.status}`}
                        >
                          {formatStatus(hazard.status)}
                        </span>
                      </td>

                      {/* Reported date */}

                      <td>
                        {formatDate(hazard.created_at)}
                      </td>

                      {/* Authority assignment */}

                      <td>
                        <select
                          aria-label={`Assigned authority for hazard ${hazard.id}`}
                          value={hazard.assigned_authority || ''}
                          disabled={updatingId === hazard.id}
                          onChange={event =>
                            handleUpdate(hazard.id, {
                              assigned_authority: event.target.value || null,
                            })
                          }
                        >
                          <option value="">Unassigned</option>

                          {AUTHORITY_OPTIONS.map(authority => (
                            <option key={authority} value={authority}>
                              {authority}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Status update */}

                      <td>
                        <select
                          aria-label={`Status for hazard ${hazard.id}`}
                          value={hazard.status}
                          disabled={updatingId === hazard.id}
                          onChange={event =>
                            handleUpdate(hazard.id, {
                              status: event.target.value,
                            })
                          }
                        >
                          {STATUS_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Resolution and verification */}

                      <td>
  <button
    type="button"
    className="authority-case-toggle"
    onClick={() =>
      setExpandedCaseId(
        expandedCaseId === hazard.id ? null : hazard.id
      )
    }
  >
    {expandedCaseId === hazard.id ? 'Close case' : 'Manage case'}
  </button>
</td>

                    </tr>
                    {expandedCaseId === hazard.id && (
  <tr className="authority-case-expanded-row">
    <td colSpan={9}>
      <div className="authority-case-workspace">
        <div className="authority-case-heading">
          <div>
            <span className="authority-eyebrow">CASE MANAGEMENT</span>
            <h3>Hazard #{hazard.id} — {formatStatus(hazard.hazard_type)}</h3>
            <p>{hazard.address}, {hazard.city}</p>
          </div>

          <button
            type="button"
            className="authority-case-close"
            onClick={() => setExpandedCaseId(null)}
          >
            Close case
          </button>
        </div>

             
        {/* Citizen-submitted photo */}
<section
  style={{
    marginBottom: '24px',
    padding: '18px',
    border: '1px solid #dce4ef',
    borderRadius: '12px',
    background: '#f8fafc',
    minWidth: 0,
  }}
>
  <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
    Citizen-submitted photo
  </h3>

  {hazard.photo_path ? (
    <>
      <img
        src={hazard.photo_path}
        alt={`Citizen-submitted photo for hazard ${hazard.id}`}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '520px',
          height: '260px',
          objectFit: 'contain',
          objectPosition: 'left center',
          borderRadius: '8px',
          background: '#eef2f7',
        }}
      />

      <a
        href={hazard.photo_path}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: '10px',
          color: '#2563eb',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        View full image ↗
      </a>
    </>
  ) : (
    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
      No photo attached to this report.
    </p>
  )}
</section>
        <div className="authority-case-forms">
          <section className="authority-case-panel">
            <h3>Resolution details</h3>
            <p>Record the repair work and responsible person.</p>

            
<form onSubmit={event => handleResolutionSubmit(event, hazard.id)}>
  <label>
    Resolution notes
    <textarea
      name="resolution_notes"
      defaultValue={hazard.resolution_notes || ''}
      placeholder="Describe the repair work and corrective action..."
      required
      minLength={5}
    />
  </label>

  <label>
    Resolved by
    <input
      type="text"
      name="resolved_by"
      defaultValue={hazard.resolved_by || ''}
      placeholder="Responsible person's name"
      required
    />
  </label>

  <button
    type="submit"
    disabled={updatingId === hazard.id}
  >
    {updatingId === hazard.id ? 'Saving...' : 'Save resolution'}
  </button>
</form>

<div className="authority-resolution__record">
  <strong>Resolution record</strong>
  <p>Resolved: {formatDateTime(hazard.resolved_at)}</p>
  <p>Resolved by: {hazard.resolved_by || 'Not recorded'}</p>
  <p>Notes: {hazard.resolution_notes || 'Not recorded'}</p>
</div>

          </section>

          <section className="authority-case-panel">
            <h3>Repair verification</h3>
            <p>Confirm the repair has been completed.</p>

           
<form onSubmit={event => handleVerificationSubmit(event, hazard.id)}>
  <label>
    Verified by
    <input
      type="text"
      name="verified_by"
      defaultValue={hazard.verified_by || ''}
      placeholder="Inspector's name"
      required
    />
  </label>

  <button
    type="submit"
    disabled={
      updatingId === hazard.id ||
      !['resolved', 'verified'].includes(hazard.status)
    }
  >
    {updatingId === hazard.id ? 'Verifying...' : 'Verify repair'}
  </button>
</form>

{!['resolved', 'verified'].includes(hazard.status) && (
  <p className="analytics-footnote">
    This hazard must be marked as resolved before verification.
  </p>
)}

<div className="authority-resolution__record">
  <strong>Verification record</strong>
  <p>Verified: {formatDateTime(hazard.verified_at)}</p>
  <p>Verified by: {hazard.verified_by || 'Not recorded'}</p>
</div>

          </section>
        </div>
      </div>
    </td>
    </tr>
)}
  </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}

          <div className="authority-table-footer">
            <span>
              Priority scores are decision-support indicators, not predictions
              of accidents.
            </span>

            {loading && <span>Refreshing...</span>}
          </div>

        </section>
      </div>
    </main>
  )
}
