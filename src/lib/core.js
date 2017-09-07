// @flow

const Immutable = require('immutable')
const Emitter = require('events')

/**
 * A schema of the allowed key/value pairs for the COBI simulator. Invalid keys
 * are ignored when set/update is called on the schema. This allows us to
 * pin-point changes more dynamically
 */
const Schema = Immutable.Record({
  'specVersion': null,
  'cobiJsToken': null,
  'panel': 'simulator',
  'containerUrl': null,
  'thumbControllerType': 'COBI',
  'track': Immutable.List(), // List<[number, Map<string, any>]>
  'track/url': null,
  'track/timeouts': Immutable.List(), // List<List<number>>
  'user/tracks': Immutable.Map(),
  'map': null,
  'position/marker': null,
  'destination/marker': null
})
// the schema only allows the above keys
let state = new Schema()
let listener = new Emitter()

module.exports = {
  /**
   * changes the value of key in the system state.
   * @throws on unknown key
   */
  update: function<T> (key: string, value: ?T) {
    if (!state.has(key)) throw new Error(`unknown key ${key}`)

    const oldValue: ?T = state.get(key)

    if (!value && !oldValue) {
      console.log(`attempt to change from undefined to null ignored for key ${key}`)
      return oldValue
    }

    if (Immutable.is(oldValue, value)) {
      return oldValue // nothing changed
    }

    state = state.set(key, value)
    console.log(`${key} updated!`, '\nbefore: ', oldValue,
                                   '\nnow: ', value)
    listener.emit(key, value, oldValue)
    return value
  },
  /**
   * get the value of 'key' from the core or throws if
   * it doesnt exists
   */
  get: function (key: string) {
    if (!state.has(key)) throw new Error(`unknown key ${key}`)
    return state.get(key)
  },

  /**
   * sets a listener for 'key' which will be triggered everytime that
   * its internal value changes
   */
  on: function<T> (key: string, callback: (value: T, oldValue: T) => any) {
    if (!state.has(key)) throw new Error(`unknown key ${key}`)
    listener.on(key, callback)
  },

  /**
   * sets a listener for 'key' which will be only ONCE when its
   * internal value changes
   */
  once: function<T> (key: string, callback: (value: T, oldValue: T) => any) {
    if (!state.has(key)) throw new Error(`unknown key ${key}`)
    listener.once(key, callback)
  },

  /**
   * remove ALL listener registered for 'key' or only the passed one
   */
  remove: function<T> (key: string, callback?: (value: T, oldValue: T) => any) {
    if (!state.has(key)) throw new Error(`unknown key ${key}`)
    if (callback) {
      return listener.removeListener(key, callback)
    }
    listener.removeAllListeners(key)
  }
}
