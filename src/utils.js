// @flow
import type {Map} from 'immutable'

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

module.exports.path = path
module.exports.toMixedCase = toMixedCase
module.exports.normalize = normalize
