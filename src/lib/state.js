
const Emitter = require('events')
const lodash = require('lodash')

// TODO: refactor this later on to not be so obscure
let state = {
  'specVersion': null,
  'cobiJsToken': null,
  'panel': 'simulator',
  'containerUrl': null,
  'thumbControllerType': 'COBI',
  'track': [], // List<[number, Map<string, any>]>
  'track/url': null,
  'track/timeouts': [], // List<List<number>>
  'user/tracks': {},
  'map': null,
  'position/marker': null,
  'destination/marker': null
}
let listener = new Emitter()

module.exports = {
  /**
   * changes the value of key in the system state.
   * @param {String} key the value to change
   * @param {*} value the new value
   * @returns {*} the new value if it changed
   * @throws on unknown key
   */
  update: function (key, value) {
    if (!lodash.has(state, key)) {
      throw new Error(`unknown key ${key}`)
    }

    const oldValue = state[key]

    if (!value && !oldValue) {
      console.log(`attempt to change from undefined to null ignored for key ${key}`)
      return oldValue
    }

    if (lodash.isEqual(oldValue, value)) {
      return oldValue // nothing changed
    }

    state = {...state, [key]: value}
    console.log(`${key} updated!`, '\nbefore: ', oldValue,
      '\nnow: ', value)
    listener.emit(key, value, oldValue)
    return value
  },
  /**
   * get the value of 'key' from the core or throws if
   * it doesnt exists
   * @param {String} key
   * @throws on unknown key
   */
  get: function (key) {
    if (!lodash.has(state, key)) {
      throw new Error(`unknown key ${key}`)
    }
    return state[key]
  },

  /**
   * sets a listener for 'key' which will be triggered every time that
   * its internal value changes
   * @param {String} key
   * @param {Function} callback will receive the current and old value
   * @throws on unknown key
   */
  on: function (key, callback) {
    if (!lodash.has(state, key)) {
      throw new Error(`unknown key ${key}`)
    }
    listener.on(key, callback)
  },

  /**
   * sets a listener for 'key' which will be only ONCE when its
   * internal value changes
   * @param {String} key
   * @param {Function} callback will receive the current and old value
   * @throws on unknown key
   */
  once: function (key, callback) {
    if (!lodash.has(state, key)) {
      throw new Error(`unknown key ${key}`)
    }
    listener.once(key, callback)
  },

  /**
   * remove ALL listener registered for 'key' or only the passed one
   * @param {String} key
   * @param {Function} [callback] will receive the current and old value
   * @throws on unknown key
   */
  remove: function (key, callback) {
    if (!lodash.has(state, key)) {
      throw new Error(`unknown key ${key}`)
    }
    if (callback) {
      return listener.removeListener(key, callback)
    }
    listener.removeAllListeners(key)
  }
}
