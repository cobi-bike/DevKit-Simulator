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
function normalize (cobiTrack: List<[number, Object]>): List<[number, Map<string, any>]> {
  const start = cobiTrack.minBy(([time]) => time)[0] // first timestampt
  return cobiTrack.map(([t, msg]) => [t - start, Immutable.fromJS(msg)])
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
 * converts a geojson FeatureCollection into
 */
function geoToTrack (geoTrack: Feature) { // https://github.com/facebook/flow/issues/1959
  // get the first linestring inside the feature collection
  const times = Immutable.List(geoTrack.properties.coordTimes)
              .map(Date.parse)
  const start = times.first()
  const ntimes = times.map(v => v - start)

  const msgs = Immutable.fromJS(geoTrack.geometry.coordinates)
                        .map(v => partialMobileLocation(v.get(0), v.get(1)))
  return ntimes.zip(msgs)
}

function partialMobileLocation (latitude: number, longitude: number) {
  return Immutable.Map({
    'action': 'NOTIFY',
    'channel': 'MOBILE',
    'property': 'LOCATION',
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

function cobiTrackErrors (raw: any) {
  if (!Array.isArray(raw)) return `root element must be an Array`

  if (!raw.every(v => Array.isArray(v) && v.length === 2)) return `Every element of the array MUST be a [t, msg] tuple`

  if (!raw.every(([t]) => Number.isInteger(t))) return `Every timestampt element MUST be an integer in milliseconds`

  if (!raw.every(([msg]) => msg['action'] && msg['channel'] && msg['property'] && msg['payload'])) {
    return `Every message MUST contain "action", "channel", "property" and "payload"`
  }
}
module.exports.path = path
module.exports.normalize = normalize
module.exports.fetchLineStr = fetchLineStr
module.exports.geoToTrack = geoToTrack
module.exports.gpxErrors = gpxErrors
module.exports.partialMobileLocation = partialMobileLocation
module.exports.cobiTrackErrors = cobiTrackErrors
