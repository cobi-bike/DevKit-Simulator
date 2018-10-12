/**
 * convert a decimal number to radians
 * @param {number} degrees
 * @return {number} the same angle in radians
 */
function toRadians (degrees) {
  return degrees * Math.PI / 180
}

/**
 * computes the geodesic or bee line distance between two latitude longitude points in kilometers
 * https://en.wikipedia.org/wiki/Bee_line
 * @param {number} lat1 point 1
 * @param {number} lon1 point 1
 * @param {number} lat2 point 2
 * @param {number} lon2 point 2
 */
module.exports.beeLine = function (lat1, lon1, lat2, lon2) {
  const R = 6371 // km
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const rlat1 = toRadians(lat1)
  const rlat2 = toRadians(lat2)

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rlat1) * Math.cos(rlat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
