// @flow

const Immutable = require('immutable')

// A record is similar to a JS object, but enforce a specific set of allowed
// string keys, and have default values.
const Schema = Immutable.Record({
  timeouts: Immutable.List(),
  // buttons and similar ui stuff
  'input/gpxFile': null,
  'input/trackFile': null,
  'input/activity': null,
  'input/tcUp': null,
  'input/tcDown': null,
  'input/tcRight': null,
  'input/tcLeft': null
})
// the schema only allows the above keys
let state = new Schema()

const update = function (key: string, value: any) {
  if (key === 'timeouts' && state.get(key).count() !== 0) {
    // Remove the previous timeouts if any exists
    state.get('timeouts').map(ids => ids.map(clearTimeout))
    // not allowed by design - cdk-60
    state.get('input/activity').disabled = true
  }
  state = state.set(key, value)
}

module.exports.update = update
module.exports.state = () => state
