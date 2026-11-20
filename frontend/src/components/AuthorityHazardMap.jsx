
import './AuthorityHazardMap.css'
import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const PRIORITY_COLORS = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#16a34a',
}

function getPriority(score = 0) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function getDistance(a, b) {
  const toRadians = value => (value * Math.PI) / 180
  const earthRadius = 6371000

  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLng = toRadians(b.longitude - a.longitude)

  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2

  return earthRadius * 2 * Math.atan2(
    Math.sqrt(value),
    Math.sqrt(1 - value)
  )
}

function getClusterDistance(zoom) {
  if (zoom >= 18) return 0.5
  if (zoom >= 17) return 5
  if (zoom >= 15) return 30
  return 100
}

function createHazardClusters(hazards, maxDistance) {
  const visited = new Set()
  const clusters = []

  hazards.forEach((hazard, index) => {
    if (visited.has(index)) return

    const cluster = []
    const queue = [index]
    visited.add(index)

    while (queue.length > 0) {
      const currentIndex = queue.shift()
      const current = hazards[currentIndex]

      cluster.push(current)

      hazards.forEach((other, otherIndex) => {
        if (visited.has(otherIndex)) return

        if (getDistance(current, other) <= maxDistance) {
          visited.add(otherIndex)
          queue.push(otherIndex)
        }
      })
    }

    clusters.push(cluster)
  })

  return clusters.map(cluster => ({
    hazards: cluster,
    latitude:
      cluster.reduce((sum, h) => sum + h.latitude, 0) /
      cluster.length,
    longitude:
      cluster.reduce((sum, h) => sum + h.longitude, 0) /
      cluster.length,
    count: cluster.length,
    key: cluster.map(h => h.id).sort().join('-'),
  }))
}

function MapZoomTracker({ onZoomChange }) {
  const map = useMap()

  useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom())

    updateZoom()
    map.on('zoomend', updateZoom)

    return () => {
      map.off('zoomend', updateZoom)
    }
  }, [map, onZoomChange])

  return null
}

function FitHazards({ hazards }) {
  const map = useMap()

  useEffect(() => {
    const points = hazards.map(h => [
      h.latitude,
      h.longitude,
    ])

    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      map.fitBounds(points, {
        padding: [40, 40],
        maxZoom: 14,
      })
    }
  }, [hazards, map])

  return null
}

function HazardPopup({ hazard, onViewCase }) {
  const priority = getPriority(hazard.priority_score)

  return (
    <div className="authority-geo-popup">
      <strong>Hazard #{hazard.id}</strong>

      <p>{hazard.hazard_type?.replaceAll('_', ' ')}</p>

      <p>
        {hazard.address || 'Address unavailable'}
        {hazard.city ? `, ${hazard.city}` : ''}
      </p>

      <p>
        Priority:{' '}
        <strong>
          {hazard.priority_score}/100 ({priority})
        </strong>
      </p>

      <p>Severity: {hazard.severity || 'Unknown'}</p>

      <p>
        Status: {hazard.status?.replaceAll('_', ' ') || 'Unknown'}
      </p>

      <button
        type="button"
        onClick={() => onViewCase?.(hazard.id)}
      >
        View case
      </button>
    </div>
  )
}

// Fans overlapping hazards out around their real map location.
function SpiderfiedHazards({
  cluster,
  onCollapse,
  onViewCase,
}) {
  const map = useMap()
  const zoom = map.getZoom()

  const positions = useMemo(() => {
    const center = map.project(
      [cluster.latitude, cluster.longitude],
      zoom
    )

    const count = cluster.hazards.length
    const radius = Math.max(38, Math.min(28 + count * 9, 75))

    return cluster.hazards.map((hazard, index) => {
      const angle =
        (2 * Math.PI * index) / count - Math.PI / 2

      const point = map.unproject(
        [
          center.x + Math.cos(angle) * radius,
          center.y + Math.sin(angle) * radius,
        ],
        zoom
      )

      return {
        hazard,
        position: [point.lat, point.lng],
      }
    })
  }, [cluster, map, zoom])

  return (
    <>
      {positions.map(({ hazard, position }) => (
        <Polyline
          key={`line-${hazard.id}`}
          positions={[
            [cluster.latitude, cluster.longitude],
            position,
          ]}
          pathOptions={{
            color: '#2563eb',
            weight: 1.5,
            opacity: 0.7,
            dashArray: '4 5',
          }}
        />
      ))}

      {positions.map(({ hazard, position }) => {
        const priority = getPriority(hazard.priority_score)

        return (
          <CircleMarker
            key={hazard.id}
            center={position}
            radius={11}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: PRIORITY_COLORS[priority],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <HazardPopup
                hazard={hazard}
                onViewCase={onViewCase}
              />
            </Popup>
          </CircleMarker>
        )
      })}

      <CircleMarker
        center={[cluster.latitude, cluster.longitude]}
        radius={7}
        pathOptions={{
          color: '#ffffff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 1,
        }}
      >
        <Popup>
          <strong>{cluster.count} separated hazards</strong>
          <p>
            Individual hazard markers are expanded around this location.
          </p>
          <button type="button" onClick={onCollapse}>
            Collapse cluster
          </button>
        </Popup>
      </CircleMarker>
    </>
  )
}

function ClusterMarker({
  cluster,
  onExpand,
  onViewCase,
}) {
  const isCluster = cluster.count > 1

  const highestPriority = Math.max(
    ...cluster.hazards.map(h => Number(h.priority_score) || 0)
  )

  const color = PRIORITY_COLORS[getPriority(highestPriority)]

  return (
    <CircleMarker
      center={[cluster.latitude, cluster.longitude]}
      radius={isCluster ? Math.min(13 + cluster.count * 2, 23) : 9}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: isCluster ? '#2563eb' : color,
        fillOpacity: 0.95,
      }}
      eventHandlers={{
        click: isCluster ? onExpand : undefined,
      }}
    >
      <Popup>
        {isCluster ? (
          <div className="authority-geo-popup">
            <strong>{cluster.count} nearby hazards</strong>

            <p>Within a connected nearby hazard cluster.</p>

            <button type="button" onClick={onExpand}>
              Separate individual hazards
            </button>

            <hr />

            {cluster.hazards.map(hazard => (
              <div key={hazard.id}>
                <HazardPopup
                  hazard={hazard}
                  onViewCase={onViewCase}
                />
                <hr />
              </div>
            ))}
          </div>
        ) : (
          <HazardPopup
            hazard={cluster.hazards[0]}
            onViewCase={onViewCase}
          />
        )}
      </Popup>
    </CircleMarker>
  )
}

export default function AuthorityHazardMap({
  hazards = [],
  loading = false,
  error = '',
  onViewCase,
}) {
  const [zoom, setZoom] = useState(5)
  const [expandedCluster, setExpandedCluster] = useState(null)

  const mappedHazards = useMemo(() => {
    return hazards
      .filter(hazard => {
        if (hazard.latitude == null || hazard.longitude == null) {
          return false
        }

        const lat = Number(hazard.latitude)
        const lng = Number(hazard.longitude)

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        )
      })
      .map(hazard => ({
        ...hazard,
        latitude: Number(hazard.latitude),
        longitude: Number(hazard.longitude),
      }))
  }, [hazards])

  const clusters = useMemo(
    () => createHazardClusters(
      mappedHazards,
      getClusterDistance(zoom)
    ),
    [mappedHazards, zoom]
  )

  useEffect(() => {
    if (
      expandedCluster &&
      !clusters.some(cluster => cluster.key === expandedCluster)
    ) {
      setExpandedCluster(null)
    }
  }, [clusters, expandedCluster])

  return (
    <section className="authority-geo">
      <div className="authority-geo__heading">
        <div>
          <span className="authority-eyebrow">
            GEOGRAPHIC INTELLIGENCE
          </span>

          <h2>Hazard locations</h2>

          <p>
            Explore reported road hazards and nearby hotspots.
          </p>
        </div>

        <span className="authority-result-count">
          {mappedHazards.length} mapped
        </span>
      </div>

      {loading && (
        <p className="authority-geo__message">
          Updating hazard locations...
        </p>
      )}

      {error && (
        <p className="authority-geo__message authority-geo__error">
          Could not load map data: {error}
        </p>
      )}

      <div className="authority-geo__map">
        <MapContainer
          center={[22.5, 79]}
          zoom={5}
          className="authority-leaflet-map"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapZoomTracker onZoomChange={setZoom} />

          <FitHazards hazards={mappedHazards} />

          {clusters.map(cluster => {
            if (
              expandedCluster === cluster.key &&
              cluster.count > 1
            ) {
              return (
                <SpiderfiedHazards
                  key={`expanded-${cluster.key}`}
                  cluster={cluster}
                  onCollapse={() => setExpandedCluster(null)}
                  onViewCase={onViewCase}
                />
              )
            }

            return (
              <ClusterMarker
                key={cluster.key}
                cluster={cluster}
                onExpand={() => setExpandedCluster(cluster.key)}
                onViewCase={onViewCase}
              />
            )
          })}
        </MapContainer>
      </div>

      <div className="authority-geo__legend">
        {Object.entries(PRIORITY_COLORS).map(([level, color]) => (
          <div key={level}>
            <span style={{ backgroundColor: color }} />
            {level.charAt(0).toUpperCase() + level.slice(1)} priority
          </div>
        ))}

        <div>
          <span style={{ backgroundColor: '#2563eb' }} />
          Nearby hazard cluster
        </div>
      </div>

      {!loading && mappedHazards.length === 0 && (
        <p className="authority-geo__message">
          {hazards.length === 0
            ? 'No hazards match the current dashboard filters.'
            : 'No hazards with valid coordinates are available.'}
        </p>
      )}
    </section>
  )
}
