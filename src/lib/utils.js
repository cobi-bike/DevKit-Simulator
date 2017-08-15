// @flow
import type {Map, List} from 'immutable'
import type {FeatureCollection, Feature} from 'geojson-flow'

const Immutable = require('immutable')
const GJV = require('geojson-validation')

/**
 * create a firebase-like path using the channel and property enum name
 * @example path("HUB", "FRONT_LIGHT_ID") -> "hub/frontLightId"
 */
function path (channel: string, property: string) {
  const ch = channel.indexOf('_') === 0 ? channel : toMixedCase(channel)
  const prop = property.indexOf('_') === 0 ? property : toMixedCase(property)

  return `${ch}/${prop}`
}

/**
 * converts an underscore separated string into a camelcase one
 * @example "FRONT_LIGHT_ID" -> "frontLightId"
 */
function toMixedCase (name: string) {
  const words = name.split('_')
                  .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
  return words[0].toLowerCase() + words.slice(1).join('')
}

/**
 * converts a log of COBI Bus events from their absolute epoch value
 * to a relative one with the lowest epoch as base.
 */
function normalize (cobiTrack: List<{t: number, message: Object}>): List<[number, Map<string, any>]> {
  const start = cobiTrack.minBy(({t}) => t).t // first timestampt
  return cobiTrack.map(({t, message}) => [t - start, Immutable.fromJS(message)])
}

/**
 * take a feature collection and returns the first linestring feature that
 * also contains timestampts (coordTimes)
 */
function fetchLineStr (geojson: FeatureCollection): ?Feature {
  return geojson.features.find(v => {
    return GJV.isFeature(v) && v.geometry && GJV.isLineString(v.geometry) &&
          Array.isArray(v.geometry.coordinates) && v.properties &&
          Array.isArray(v.properties.coordTimes) &&
          v.properties.coordTimes.length === v.geometry.coordinates.length
  })
}

/**
 * converts a geojson feature and returns a cobitrack compatible
 * js representation with relative timestamps
 */
function geoToTrack (geoTrack: Feature) { // https://github.com/facebook/flow/issues/1959
  const times = Immutable.List(geoTrack.properties.coordTimes)
              .map(Date.parse)
  const start = times.first()
  const ntimes = times.map(v => v - start)

  const msgs = Immutable.fromJS(geoTrack.geometry.coordinates)
                        .map(v => partialMobileLocation(v.get(0), v.get(1)))
  return ntimes.zip(msgs)
}

function partialMobileLocation (longitude: number, latitude: number) {
  return Immutable.Map({
    'action': 'NOTIFY',
    'path': 'mobile/location',
    'payload': Immutable.Map({
      'altitude': 0,
      'bearing': 0,
      'latitude': latitude,
      'longitude': longitude,
      'speed': 0
    })
  })
}

/**
 * check if there is any errors on the gpx file, returns null when no errors occurs
 */
function gpxErrors (oDOM: Document) {
  // print the name of the root element or error message
  if (oDOM.documentElement && oDOM.documentElement.nodeName === 'parsererror') {
    return 'parsererror reading xml file'
  }
  return null
}

/**
 * check if the raw object is a valid cobitrack object
 * Returns an error message if so, otherwise undefined
 */
function cobiTrackErrors (raw: any) {
  if (!Array.isArray(raw)) return `root element must be an Array`

  const notTuples = raw.filter(v => !(v.t && v.message))
  if (notTuples.length > 0) {
    return `Every element of the array MUST be a {t: number, msg: object} object.
    the following elements failed: ${JSON.stringify(notTuples)}`
  }

  const notTimestamps = raw.filter(({t}) => !Number.isInteger(t))
  if (notTimestamps.length > 0) {
    return `Every timestampt element MUST be an integer in milliseconds.
    the following elements failed: ${JSON.stringify(notTimestamps)}`
  }

  const notMessages = raw.filter(({message}) => !(message['action'] &&
                                                  message['path'] &&
                                                  message['payload'] != null))
  if (notMessages.length > 0) {
    return `Every message MUST contain "action", "path" and "payload".
    the following elements failed: ${JSON.stringify(notMessages)}`
  }
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
function debounce (func: () => mixed, wait?: number, immediate?: boolean) {
  const wait2 = wait || 500
  let timeout
  return function () {
    const context = this
    const args = arguments
    const later = function () {
      timeout = null
      if (!immediate) {
        func.apply(context, args)
      }
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait2)
    if (callNow) {
      func.apply(context, args)
    }
  }
};

module.exports.path = path
module.exports.normalize = normalize
module.exports.fetchLineStr = fetchLineStr
module.exports.geoToTrack = geoToTrack
module.exports.gpxErrors = gpxErrors
module.exports.partialMobileLocation = partialMobileLocation
module.exports.cobiTrackErrors = cobiTrackErrors
module.exports.debounce = debounce
