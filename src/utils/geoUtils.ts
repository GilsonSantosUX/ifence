export const calculatePolygonArea = (coordinates: { lat: number; lng: number }[]) => {
  if (!coordinates || coordinates.length < 3) return 0;
  
  const earthRadius = 6378137; // meters
  let area = 0;

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const p1 = coordinates[i];
    const p2 = coordinates[j];

    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = (area * earthRadius * earthRadius) / 2;
  return Math.abs(area);
};

export const calculatePolygonPerimeter = (coordinates: { lat: number; lng: number }[]) => {
  if (!coordinates || coordinates.length < 2) return 0;

  let perimeter = 0;
  const earthRadius = 6371e3; // meters

  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    const lat1 = (coordinates[i].lat * Math.PI) / 180;
    const lat2 = (coordinates[j].lat * Math.PI) / 180;
    const deltaLat = ((coordinates[j].lat - coordinates[i].lat) * Math.PI) / 180;
    const deltaLng = ((coordinates[j].lng - coordinates[i].lng) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    perimeter += earthRadius * c;
  }

  return perimeter;
};

export const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

export const formatArea = (sqMeters: number) => {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  return `${Math.round(sqMeters)} m²`;
};
