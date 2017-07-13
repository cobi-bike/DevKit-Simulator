// @flow

const Immutable = require('immutable')
const Emitter = require('events')

/**
 * A schema of the allowed key/value pairs for the COBI simulator. Invalid keys
 * are ignored when set/update is called on the schema. This allows us to
 * pin-point changes more dynamically
 */
const Schema = Immutable.Record({
  'cobiVersion': null,
  'thumbControllerType': 'COBI',
  'track': Immutable.List(), // List<[number, Map<string, any>]>
  'timeouts': Immutable.List() // List<List<number>>
})
// the schema only allows the above keys
let state = new Schema()
let listener = new Emitter()

/**
 * changes the value of key in the system state.
 *
 * Throws on `value === null` and on unknown key
 */
function update (key: string, value: any) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  if (value === null || value === undefined) throw new Error(`invalid value ${value} for key ${key}`)

  const oldValue = state.get(key)
  state = state.set(key, value)
  listener.emit(key, value, oldValue)
  return value
}

function get (key: string) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  return state.get(key)
}

function listen (key: string, callback: (value: any, oldValue: any) => any) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  listener.on(key, callback)
}

function listenOnce (key: string, callback: (value: any, oldValue: any) => any) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  listener.once(key, callback)
}

function remove (key: string, callback?: (value: any, oldValue: any) => any) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  if (callback) {
    return listener.removeListener(key, callback)
  }
  listener.removeAllListeners(key)
}

module.exports.update = update
module.exports.get = get
module.exports.on = listen
module.exports.once = listenOnce
module.exports.remove = remove
