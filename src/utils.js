// @flow
import type {Map, List} from 'immutable'
import type {FeatureCollection, Feature} from 'geojson-flow'

const Immutable = require('immutable')
const GJV = require('geojson-validation')

// holds current timeouts ids. Needed in case a user loads a new file
// while already playing another one
let timeouts: List<List<number>> = Immutable.List()

/**
 * create a firebase-like path using the channel and property enum name
 * @example path("HUB", "FRONT_LIGHT_ID") -> "hub/frontLightId"
 */
const path = function (channel: string, property: string) {
  const ch = channel.indexOf('_') === 0 ? channel : toMixedCase(channel)
  const prop = property.indexOf('_') === 0 ? property : toMixedCase(property)

  return `${ch}/${prop}`
}

/**
 * converts an underscore separated string into a camelcase onEvalError
 * @example "FRONT_LIGHT_ID" -> "frontLightId"
 */
const toMixedCase = function (name: string) {
  const words = name.split('_')
                  .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
  return words[0].toLowerCase() + words.slice(1).join('')
}

/**
 * converts a log of COBI Bus events from their absolute epoch value
 * to a relative one with the lowest epoch as base.
 */
const normalize = function (cobiTrack: Map<string, Map<string, any>>) {
  const input = cobiTrack.mapKeys(Number.parseInt)
  const start = input.keySeq().min()
  return input.mapKeys(k => k - start)
}

const fetchLineStr = function (geojson: FeatureCollection): ?Feature {
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
const geoToTrack = function (geoTrack: Feature) { // https://github.com/facebook/flow/issues/1959
  // get the first linestring inside the feature collection
  const times = Immutable.List(geoTrack.properties.coordTimes)
              .map(Date.parse)
  const start = times.first()
  const ntimes = times.map(v => v - start)

  const msgs = Immutable.fromJS(geoTrack.geometry.coordinates)
                        .map(v => partialMobileLocation(v.get(0), v.get(1)))
  const logs = ntimes.zipWith((t, m) => Immutable.Map({[t]: m}), msgs)
  return logs.reduce((r, v) => r.merge(v))
}

const partialMobileLocation = function (latitude: number, longitude: number) {
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
 * FIXME: see issue #2
 */
function gpxErrors (oDOM: Document) {
  // print the name of the root element or error message
  if (oDOM.documentElement && oDOM.documentElement.nodeName === 'parsererror') {
    return { 'msg': 'Input doesnt conforms with neither v1.1 nor v1.0 gpx schemas'
      // v10: gpxV10Res,
      // v11: gpxV11Res
    }
  }
  return null
}

/**
 * Adds the timeouts ids to the list of current running timeouts.
 * Remove the previous timeouts if any exists
 */
const updateTimeouts = function (...ids: Array<Map<number, number>>) {
  if (timeouts.count() !== 0) {
    timeouts.map(l => l.map(clearTimeout))
  }
  timeouts = Immutable.List(ids)
          .map(m => m.toList())
}

/**
 * are there any timeouts currently running?
 */
const waitingTimeouts = function () {
  return !timeouts.isEmpty()
}

module.exports.path = path
module.exports.toMixedCase = toMixedCase
module.exports.normalize = normalize
module.exports.fetchLineStr = fetchLineStr
module.exports.geoToTrack = geoToTrack
module.exports.gpxErrors = gpxErrors
module.exports.updateTimeouts = updateTimeouts
module.exports.waitingTimeouts = waitingTimeouts
