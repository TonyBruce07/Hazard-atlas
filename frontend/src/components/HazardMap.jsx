
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./HazardMap.css";
import { detectHotspots } from "../utils/hotspotUtils.js";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const CATEGORY_COLORS = {
  pothole: "#ef4444",
  damaged_surface: "#f97316",
  uncovered_manhole: "#a855f7",
  road_obstruction: "#eab308",
  unsafe_crossing: "#06b6d4",
  other: "#64748b",
};

function getHazard(report) {
  return report.hazard || report;
}

function getCoordinates(report) {
  const hazard = getHazard(report);
  const latitude = report.latitude ?? hazard.latitude;
  const longitude = report.longitude ?? hazard.longitude;

  if (latitude == null || longitude == null) return null;

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return [lat, lng];
}

function getCategory(report) {
  const hazard = getHazard(report);
  return report.hazard_type || hazard.hazard_type || "other";
}

function getColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function FitReports({ reports }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = reports.map(getCoordinates).filter(Boolean);

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
    } else if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [40, 40], maxZoom: 15 });
    }
  }, [reports, map]);

  return null;
}
function SpiderfiedHotspot({ hotspot, expanded, onToggle }) {
  const map = useMap();
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!expanded) {
      setPositions([]);
      return;
    }

    const updatePositions = () => {
      const center = map.latLngToLayerPoint([
        hotspot.center.lat,
        hotspot.center.lng,
      ]);

      const radius = 42;

      const nextPositions = hotspot.reports.map((_, index) => {
        const angle =
          (2 * Math.PI * index) / hotspot.reports.length -
          Math.PI / 2;

        const point = map.layerPointToLatLng([
          center.x + Math.cos(angle) * radius,
          center.y + Math.sin(angle) * radius,
        ]);

        return [point.lat, point.lng];
      });

      setPositions(nextPositions);
    };

    updatePositions();

    map.on("zoomend", updatePositions);
    map.on("moveend", updatePositions);

    return () => {
      map.off("zoomend", updatePositions);
      map.off("moveend", updatePositions);
    };
  }, [expanded, hotspot, map]);

  return (
    <>
      {expanded &&
        positions.map((position, index) => {
          const report = hotspot.reports[index];
          const hazard = getHazard(report);
          const category = getCategory(report);

          return (
            <Polyline
              key={`spider-leg-${report.id}`}
              positions={[
                [hotspot.center.lat, hotspot.center.lng],
                position,
              ]}
              pathOptions={{
                color: "#7c3aed",
                weight: 1.5,
                opacity: 0.7,
              }}
            />
          );
        })}

      {expanded &&
        positions.map((position, index) => {
          const report = hotspot.reports[index];
          const hazard = getHazard(report);
          const category = getCategory(report);

          return (
            <CircleMarker
              key={`spider-report-${report.id}`}
              center={position}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: getColor(category),
                fillOpacity: 1,
              }}
             
            >
              <Popup>
                <div className="hazard-popup">
                  <strong>{category.replaceAll("_", " ")}</strong>
                  <p>
                    {report.description ||
                      hazard.description ||
                      "No description provided."}
                  </p>
                  <p>
                    {report.street || hazard.address || "Unknown street"}
                    {report.city || hazard.city
                      ? `, ${report.city || hazard.city}`
                      : ""}
                  </p>
                  <span>
                    Status: {report.status || hazard.status || "Reported"}
                  </span>
                  <br />
                  <span>Report ID: #{report.id}</span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      <CircleMarker
        center={[hotspot.center.lat, hotspot.center.lng]}
        radius={expanded ? 12 : 18}
        pathOptions={{
          color: "#ffffff",
          weight: 3,
          fillColor: "#7c3aed",
          fillOpacity: 1,
        }}
        eventHandlers={{
          click: () => onToggle(expanded ? null : hotspot.id),
        }}
      >
        <Popup>
          <div className="hazard-popup">
            <strong>🔥 Hazard Hotspot</strong>
            <p>
              <strong>{hotspot.count}</strong> reports within a connected
              100 m cluster
            </p>
            <span>
              Reports:{" "}
              {hotspot.reports
                .map(report => `#${report.id}`)
                .join(", ")}
            </span>
            <p>
              {expanded
                ? "Click the hotspot again to collapse the markers."
                : "Click the purple hotspot marker to spread out individual reports."}
            </p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}
export default function HazardMap() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedHotspotId, setExpandedHotspotId] = useState(null);
  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch(`${API_URL}/api/reports`);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        setReports(Array.isArray(data) ? data : data.reports || []);
      } catch (err) {
        setError(err.message || "Could not load reports.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const mappedReports = reports.filter(getCoordinates);

  const filteredReports =
    selectedCategory === "all"
        ? mappedReports
        : mappedReports.filter(
            (report) => getCategory(report) === selectedCategory
        );
    const hotspots = detectHotspots(filteredReports, 100);    

  return (
    <div className="hazard-map-wrapper">
      <div className="hazard-map-header">
        <div>
          <h2>Hazard Map</h2>
          <p>Community-reported road hazards across the city</p>
        </div>
        <div className="hazard-map-count">
         {filteredReports.length} mapped report{filteredReports.length !== 1 ? "s" : ""}
        </div>
      </div>

      {loading && <div className="map-message">Loading reports...</div>}

      {error && (
        <div className="map-message map-error">
          Could not connect to the reports API: {error}
        </div>
      )}
    
<div className="hazard-map-filters">
  {[
    ["all", "All"],
    ["pothole", "Potholes"],
    ["damaged_surface", "Damaged Roads"],
    ["uncovered_manhole", "Manholes"],
    ["road_obstruction", "Obstructions"],
    ["unsafe_crossing", "Unsafe Crossings"],
  ].map(([value, label]) => (
    <button
      key={value}
      className={`hazard-filter ${
        selectedCategory === value ? "active" : ""
      }`}
      onClick={() => setSelectedCategory(value)}
    >
      {label}
    </button>
  ))}
</div>

      <MapContainer
        center={[21.1702, 72.8311]}
        zoom={12}
        className="hazard-map"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitReports reports={filteredReports} />
        

                {filteredReports
          .filter(report => {
            const expandedHotspot = hotspots.find(
              hotspot => hotspot.id === expandedHotspotId
            );

            return !expandedHotspot?.reports.some(
              item => item.id === report.id
            );
          })
          .map(report => {
            const coordinates = getCoordinates(report);
            const category = getCategory(report);
            const hazard = getHazard(report);

            return (
              <CircleMarker
                key={report.id}
                center={coordinates}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: getColor(category),
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="hazard-popup">
                    <strong>{category.replaceAll("_", " ")}</strong>
                    <p>
                      {report.description ||
                        hazard.description ||
                        "No description provided."}
                    </p>
                    <p>
                      {report.street || hazard.address || "Unknown street"}
                      {report.city || hazard.city
                        ? `, ${report.city || hazard.city}`
                        : ""}
                    </p>
                    <span>
                      Status: {report.status || hazard.status || "Reported"}
                    </span>
                    <br />
                    <span>Report ID: #{report.id}</span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
                {hotspots.map(hotspot => (
          <SpiderfiedHotspot
            key={hotspot.id}
            hotspot={hotspot}
            expanded={expandedHotspotId === hotspot.id}
            onToggle={setExpandedHotspotId}
          />
        ))}
      </MapContainer>

      <div className="hazard-map-legend">
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
          <div key={category} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }} />
            {category.replaceAll("_", " ")}
          </div>
        ))}
      </div>
    </div>
  );
}
