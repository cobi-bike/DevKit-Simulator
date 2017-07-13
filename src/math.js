// @flow

/**
 * computes the geodesic or bee line distance between two latitude longitude points
 * https://en.wikipedia.org/wiki/Bee_line
 */
function computeDistance (lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371 // km
  var dLat = toRadians(lat2 - lat1)
  var dLon = toRadians(lon2 - lon1)
  var lat1 = toRadians(lat1)
  var lat2 = toRadians(lat2)

  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  var d = R * c
  return d
}

// function toDegrees (radians: number) {
//   return radians * (180 / Math.PI)
// }

/**
 * convert a decimal number to radians
 */
function toRadians (degrees: number) {
  return degrees * Math.PI / 180
}

module.exports.beeLine = computeDistance
