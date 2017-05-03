// @flow
/* global FileReader:false */
/* global DOMParser:false */
import type {Map, List} from 'immutable'
const Immutable = require('immutable')

// holds current timeouts ids. Needed in case a user loads a new file
// while already playing another one
let timeouts: List<List<number>> = Immutable.List()

const path = function (channel: string, property: string) {
  const ch = channel.indexOf('_') === 0 ? channel : toMixedCase(channel)
  const prop = property.indexOf('_') === 0 ? property : toMixedCase(property)

  return `${ch}/${prop}`
}

const toMixedCase = function (name: string) {
  const words = name.split('_')
                  .map(w => w[0].toUpperCase() + w.substr(1).toLowerCase())
  return words[0].toLowerCase() + words.slice(1).join('')
}

const normalize = function (cobiTrack: Map<string, Map<string, any>>) {
  const input = cobiTrack.mapKeys(Number.parseInt)
  const start = input.keySeq().min()
  return input.mapKeys(k => k - start)
}

// check if there is any errors, returns null when no errors occurs
// FIXME: see issue #2
function gpxErrors (content: string) {
  let oParser = new DOMParser()
  let oDOM = oParser.parseFromString(content, 'text/xml')
  // print the name of the root element or error message
  if (oDOM.documentElement.nodeName === 'parsererror') {
    return { 'msg': 'Input doesnt conforms with neither v1.1 nor v1.0 gpx schemas'
      // v10: gpxV10Res,
      // v11: gpxV11Res
    }
  }
  return null
}

const updateTimeouts = function (...ids) {
  if (timeouts.count() !== 0) {
    timeouts.map(l => l.map(clearTimeout))
  }
  timeouts = Immutable.List().push(ids)
}

const waitingTimeouts = function () {
  return timeouts.count() !== 0
}

module.exports.path = path
module.exports.toMixedCase = toMixedCase
module.exports.normalize = normalize
module.exports.gpxErrors = gpxErrors
module.exports.updateTimeouts = updateTimeouts
module.exports.waitingTimeouts = waitingTimeouts
