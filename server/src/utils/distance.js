/**
 * Calculates great-circle distance between two points on the earth using the Haversine formula
 * @param {[number, number]} coords1 - [longitude, latitude]
 * @param {[number, number]} coords2 - [longitude, latitude]
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
export function calculateDistanceKm(coords1, coords2) {
  if (!coords1 || !coords2) return 0;
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371; // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 100) / 100;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts kilometers to radians for MongoDB $centerSphere queries
 * 1 radian = approx 6378.1 km
 */
export function kmToRadians(km) {
  return km / 6378.1;
}

export default { calculateDistanceKm, kmToRadians };
