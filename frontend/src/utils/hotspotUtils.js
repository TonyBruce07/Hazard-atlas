
const EARTH_RADIUS_METERS = 6371000;

function getCoordinates(report) {
  const hazard = report.hazard || report;

  const latitude = report.latitude ?? hazard.latitude;
  const longitude = report.longitude ?? hazard.longitude;

  if (latitude == null || longitude == null) return null;

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export function getDistanceMeters(point1, point2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function detectHotspots(reports, radiusMeters = 100) {
  const validReports = reports
    .map((report) => ({
      report,
      coordinates: getCoordinates(report),
    }))
    .filter((item) => item.coordinates !== null);

  const parent = validReports.map((_, index) => index);

  function find(index) {
    if (parent[index] !== index) {
      parent[index] = find(parent[index]);
    }

    return parent[index];
  }

  function union(index1, index2) {
    const root1 = find(index1);
    const root2 = find(index2);

    if (root1 !== root2) {
      parent[root2] = root1;
    }
  }

  // Group reports connected by proximity.
  for (let i = 0; i < validReports.length; i++) {
    for (let j = i + 1; j < validReports.length; j++) {
      const distance = getDistanceMeters(
        validReports[i].coordinates,
        validReports[j].coordinates
      );

      if (distance <= radiusMeters) {
        union(i, j);
      }
    }
  }

  const clusters = new Map();

  validReports.forEach((item, index) => {
    const root = find(index);

    if (!clusters.has(root)) {
      clusters.set(root, []);
    }

    clusters.get(root).push(item);
  });

  return Array.from(clusters.values())
    .filter((cluster) => cluster.length >= 2)
    .map((cluster) => {
      const latitude =
        cluster.reduce((sum, item) => sum + item.coordinates.lat, 0) /
        cluster.length;

      const longitude =
        cluster.reduce((sum, item) => sum + item.coordinates.lng, 0) /
        cluster.length;

      return {
        id: cluster.map((item) => item.report.id).sort().join("-"),
        count: cluster.length,
        center: { lat: latitude, lng: longitude },
        reports: cluster.map((item) => item.report),
      };
    })
    .sort((a, b) => b.count - a.count);
}
