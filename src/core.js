// @flow

const Immutable = require('immutable')

// A record is similar to a JS object, but enforce a specific set of allowed
// string keys, and have default values.
const Schema = Immutable.Record({
  'timeouts': Immutable.List(),
  // buttons and similar ui stuff
  'input/file': null,
  'button/activity': null,
  'select/tcType': null,
  'button/tcUp': null,
  'button/tcDown': null,
  'button/tcRight': null,
  'button/tcLeft': null,
  'button/tcSelect': null,
  'button/position': null,
  'input/latitude': null,
  'input/longitude': null
})
// the schema only allows the above keys
let state = new Schema()

/**
 * changes the value of key in the system state.
 * It might perform additional work based on internal configuration
 *
 * Throws on value === null or on unknown key
 */
function update (key: string, value: any) {
  if (!state.has(key)) throw new Error(`unknown key ${key}`)
  if (!value) throw new Error(`invalid value ${value} for key ${key}`)

  if (key === 'timeouts') {
    // Remove the previous timeouts if any exists
    state.get('timeouts').map(ids => ids.map(clearTimeout))
    // not allowed by design - cdk-60
    state.get('button/activity').disabled = !value.isEmpty()
  }
  state = state.set(key, value)
  return value
}

module.exports.update = update
module.exports.get = (key: string) => state.get(key)
