// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */

import type {List} from 'immutable'
import type {FeatureCollection} from 'geojson-flow'

const Immutable = require('immutable')
const core = require('./core')
const meta = require('./meta')
const log = require('./log')
const util = require('./utils')
const toGeoJSON = require('togeojson')
const GJV = require('geojson-validation')

/**
 * Chrome devtools panel creation. We create a panel with no drawers. Set intelligenceService
 * icon and index page. The panel is named COBI
 */
chrome.devtools.panels.create('COBI',
    'assets/cobi-icon.png',
    'index.html',
    function (panel) {
      let trackReader = new FileReader()
      trackReader.onload = onCobiTrackFileLoaded
      let gpxReader = new FileReader()
      gpxReader.onload = onGpxFileLoaded

      core.update('text/cobiSupported?', document.getElementById('is-cobi-supported'))
      chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, result => {
        core.get('text/cobiSupported?').innerHTML = result.toString()
      })
      // ui elements setup
      // keep a reference to ui elements for later usage
      core.update('input/file', document.getElementById('input-file'))
          .onchange = (evt) => {
            const file = evt.target.files[0]
            if (!file) return // cancelled input - do nothing
            chrome.devtools.inspectedWindow.eval(log.info(`loading: ${file.name}`))
            if (file.type.endsWith('json')) {
              return trackReader.readAsText(file)
            } // xml otherwise
            return gpxReader.readAsText(file)
          }
      core.update('select/tcType', document.getElementById('tc-type'))
          .onchange = () => {
            const tcType = core.get('select/tcType')
            const value = tcType.options[tcType.selectedIndex].value
            core.get('button/tcRight').disabled = value.match(/intuvia/i) !== null
            core.get('button/tcRight').disabled = value.match(/intuvia/i) !== null
            setThumbControllerType(value)
          }
      core.update('button/stopPlayback', document.getElementById('stop-playback'))
          .onclick = () => {
            if (!core.get('timeouts').isEmpty()) {
              chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
            }
            core.update('timeouts', Immutable.List())
          }
      core.update('button/tcUp', document.getElementById('tc-up'))
          .onclick = () => thumbAction('UP')
      core.update('button/tcDown', document.getElementById('tc-down'))
          .onclick = () => thumbAction('DOWN')
      core.update('button/tcRight', document.getElementById('tc-right'))
          .onclick = () => thumbAction('RIGHT')
      core.update('button/tcLeft', document.getElementById('tc-left'))
          .onclick = () => thumbAction('LEFT')
      core.update('button/tcSelect', document.getElementById('tc-select'))
          .onclick = () => thumbAction('SELECT')
      core.update('button/activity', document.getElementById('activity-toggle'))
          .onclick = () => toggleActivity(core.get('button/activity'))
      core.update('button/position', document.getElementById('position'))
          .onclick = () => setPosition(core.get('input/latitude'),
                                       core.get('input/longitude'))
      core.update('input/latitude', document.getElementById('latitude'))
      core.update('input/longitude', document.getElementById('longitude'))
    }
)

/**
 * cdk-2 mock input data to test webapps
 */
function thumbAction (value) {
  const expression = meta.emitStr('hub/externalInterfaceAction', value)
  chrome.devtools.inspectedWindow.eval(expression)
  chrome.devtools.inspectedWindow.eval(log.log(`"hub/externalInterfaceAction" = ${value}`))
}

/**
 * cdk-2 mock input data to test webapps
 */
function fakeInput (normals) {
  const emmiters = normals.map(([t, msg]) => {
    const path = util.path(msg.get('channel'), msg.get('property'))
    const expression = meta.emitStr(path, msg.get('payload'))
    return [() => chrome.devtools.inspectedWindow.eval(expression), t]
  }).map(([fn, t]) => setTimeout(fn, t))

  const loggers = normals.map(([t, msg]) => {
    const path = util.path(msg.get('channel'), msg.get('property'))
    return [() => chrome.devtools.inspectedWindow.eval(log.log(`${path} = ${msg.get('payload')}`)), t]
  }).map(([fn, t]) => setTimeout(fn, t))

  core.update('timeouts', Immutable.List([emmiters, loggers]))
}

// TODO: validate the input and display an error if it doesnt conform to the cobi track schema
/**
 * cdk-2 mock input data to test webapps
 */
function onCobiTrackFileLoaded (evt) {
  const raw = JSON.parse(evt.target.result)
  const errors = util.cobiTrackErrors(raw)
  if (errors) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid COBI Track file passed: ${JSON.stringify(errors)}`))
  }
  const content: List<[number, Object]> = Immutable.List(raw)
  const normals = util.normalize(content)
  if (!core.get('timeouts').isEmpty()) {
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
  }
  fakeInput(normals)
}

/**
 * cdk-2 mock input data to test webapps
 */
function onGpxFileLoaded (evt) {
  const parser = new DOMParser()
  const content = parser.parseFromString(evt.target.result, 'application/xml')

  let errors = util.gpxErrors(content)
  if (errors) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid GPX file passed: ${JSON.stringify(errors)}`))
  }

  const geojson: FeatureCollection = toGeoJSON.gpx(content)
  if (!GJV.valid(geojson)) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid input file`))
  }

  const featLineStr = util.fetchLineStr(geojson)
  if (!featLineStr) {
    return chrome.devtools.inspectedWindow.eval(log.error('Invalid input file data'))
  }

  if (!core.get('timeouts').isEmpty()) {
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
  }

  fakeInput(util.geoToTrack(featLineStr))
}

/**
 * cdk-60 manually set the activity type
 */
function toggleActivity (button) {
  const path = 'intelligenceService/activity'
  chrome.devtools.inspectedWindow.eval(meta.emitStr(path, button.checked))
  chrome.devtools.inspectedWindow.eval(log.info(`'${path}' = ${button.checked}`))
}

/**
 * cdk-61 mock the location of the user and deactivates fake events
 */
function setPosition (inputLat, inputLon) {
  const lat = parseInt(inputLat.value)
  const lon = parseInt(inputLon.value)

  const msg = util.partialMobileLocation(lat, lon)
  const path = 'mobile/location'

  if (!core.get('timeouts').isEmpty()) {
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
    core.update('timeouts', Immutable.List())
  }

  chrome.devtools.inspectedWindow.eval(meta.emitStr(path, msg.get('payload')))
  chrome.devtools.inspectedWindow.eval(log.info(`'${path}' = ${msg.get('payload')}`))
}

/**
 * cdk-59 manually set the type of Thumb controller
 */
function setThumbControllerType (value) {
  const path = 'hub/thumbControllerInterfaceId'
  const expression = meta.emitStr(path, value)
  chrome.devtools.inspectedWindow.eval(expression)
  chrome.devtools.inspectedWindow.eval(log.log(`"${path}" = ${value}`))
}
