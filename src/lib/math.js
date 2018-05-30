// @flow

// function toDegrees (radians: number) {
//   return radians * (180 / Math.PI)
// }

/**
 * convert a decimal number to radians
 */
function toRadians (degrees: number) {
  return degrees * Math.PI / 180
}

module.exports = {
  /**
   * computes the geodesic or bee line distance between two latitude longitude points in kilometers
   * https://en.wikipedia.org/wiki/Bee_line
   */
  beeLine: function (lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371 // km
    const dLat = toRadians(lat2 - lat1)
    const dLon = toRadians(lon2 - lon1)
    const rlat1 = toRadians(lat1)
    const rlat2 = toRadians(lat2)

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rlat1) * Math.cos(rlat2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c
    return d
  }

}
