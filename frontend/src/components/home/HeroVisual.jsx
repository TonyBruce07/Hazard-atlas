import { MapPin, Copy } from 'lucide-react'

const PINS = [
  { left: 30, top: 29, delay: '0s' },
  { left: 63, top: 62, delay: '0.9s' },
  { left: 44, top: 71, delay: '1.6s' },
  { left: 82, top: 72, delay: '0.4s' },
  { left: 65, top: 33, delay: '0.2s', hotspot: true },
]

/** Decorative, CSS/SVG-only map preview. No external assets. */
export default function HeroVisual() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="map-card">
        <div className="map-card__bar">
          <span className="map-card__title">
            <MapPin size={14} /> Hazard map
          </span>
          <span className="map-card__chip">Illustrative preview</span>
        </div>

        <div className="map-card__canvas">
          <svg viewBox="0 0 500 440" preserveAspectRatio="xMidYMid slice" focusable="false">
            <defs>
              <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="500" height="440" fill="url(#map-grid)" />

            <g fill="#163459">
              <rect x="24" y="24" width="120" height="70" rx="8" />
              <rect x="170" y="30" width="130" height="64" rx="8" />
              <rect x="352" y="20" width="126" height="80" rx="8" />
              <rect x="30" y="178" width="140" height="110" rx="8" />
              <rect x="200" y="182" width="90" height="100" rx="8" />
              <rect x="352" y="205" width="120" height="90" rx="8" />
              <rect x="40" y="396" width="150" height="34" rx="8" />
              <rect x="210" y="360" width="80" height="60" rx="8" />
              <rect x="352" y="366" width="120" height="56" rx="8" />
            </g>

            <g fill="none" strokeLinecap="round">
              <g stroke="#234B7C">
                <path d="M-10 120 L510 150" strokeWidth="18" />
                <path d="M330 -10 L310 450" strokeWidth="18" />
                <path d="M-10 380 C140 340 260 300 520 330" strokeWidth="14" />
              </g>
              <g stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="6 8">
                <path d="M-10 120 L510 150" />
                <path d="M330 -10 L310 450" />
                <path d="M-10 380 C140 340 260 300 520 330" />
              </g>
            </g>
          </svg>

          {PINS.map(({ left, top, delay, hotspot }) => (
            <span key={`${left}-${top}`}>
              {hotspot && <span className="heat" style={{ left: `${left}%`, top: `${top}%` }} />}
              <span
                className={`pin${hotspot ? ' pin--hotspot' : ''}`}
                style={{ left: `${left}%`, top: `${top}%`, '--delay': delay }}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="float-card float-card--report">
        <span className="float-card__icon"><Copy size={16} /></span>
        <div>
          <strong>Duplicate detected</strong>
          <span>Merged with 3 nearby reports</span>
        </div>
      </div>

      <div className="float-card float-card--risk">
        <div className="float-card__risk">
          <div className="float-card__risk-head">
            <strong>Risk score</strong>
            <span>87 · High</span>
          </div>
          <div className="risk-bar"><div className="risk-bar__fill" style={{ width: '87%' }} /></div>
        </div>
      </div>
    </div>
  )
}
