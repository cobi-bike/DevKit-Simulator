// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */

import type {Map, List} from 'immutable'
import type {FeatureCollection} from 'geojson-flow'

const Immutable = require('immutable')
const core = require('./core')
const meta = require('./meta')
const log = require('./log')
const util = require('./utils')
const toGeoJSON = require('togeojson')
const GJV = require('geojson-validation')

chrome.devtools.panels.create('COBI',
    'assets/cobi-icon.png',
    'index.html',
    function (panel) {
      let trackReader = new FileReader()
      trackReader.onload = onCobiTrackFileLoaded
      let gpxReader = new FileReader()
      gpxReader.onload = onGpxFileLoaded

      // ----
      const track = document.getElementById('input-track')
      track.addEventListener('change', () => trackReader.readAsText(track.files[0]))
      const localizer = document.getElementById('input-gpx')
      localizer.addEventListener('change', () => gpxReader.readAsText(localizer.files[0]))

      let isEnabled = document.getElementById('is-cobi-supported')
      chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, result => { isEnabled.innerHTML = result })
      // ui elements setup
      let tcType = document.getElementById('tc-type')
      let tcUp = document.getElementById('tc-up')
      let tcDown = document.getElementById('tc-down')
      let tcRight = document.getElementById('tc-right')
      let tcLeft = document.getElementById('tc-left')
      let tcSelect = document.getElementById('tc-select')
      let latitude = document.getElementById('latitude')
      let longitude = document.getElementById('longitude')
      let positionButton = document.getElementById('position')
      let activityButton = document.getElementById('activity-toggle')
      if (tcType) tcType.addEventListener('change', () => setThumbControllerType(tcType.options[tcType.selectedIndex].value))
      if (tcUp) tcUp.addEventListener('click', () => thumbAction('UP'))
      if (tcDown) tcDown.addEventListener('click', () => thumbAction('DOWN'))
      if (tcLeft) tcLeft.addEventListener('click', () => thumbAction('LEFT'))
      if (tcRight) tcRight.addEventListener('click', () => thumbAction('RIGHT'))
      if (tcRight) tcRight.addEventListener('click', () => thumbAction('SELECT'))
      if (activityButton) activityButton.addEventListener('click', () => toggleActivity(activityButton))
      if (positionButton) positionButton.addEventListener('click', setPosition)
      // keep a reference to ui elements for later usage
      core.update('input/gpxFile', track)
      core.update('input/trackFile', localizer)
      core.update('input/tcType', tcType)
      core.update('input/tcUp', tcUp)
      core.update('input/tcDown', tcDown)
      core.update('input/tcRight', tcRight)
      core.update('input/tcLeft', tcLeft)
      core.update('input/tcSelect', tcSelect)
      core.update('input/activity', activityButton)
      core.update('input/latitude', latitude)
      core.update('input/longitude', longitude)
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

/**
 * cdk-2 mock input data to test webapps
 */
function onCobiTrackFileLoaded (evt) {
  const content: List<[number, Map<string, any>]> = Immutable.List(JSON.parse(evt.target.result))
  const normals = util.normalize(content)
  if (!core.state().get('timeouts').isEmpty()) {
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
  if (errors !== null) {
    return chrome.devtools.inspectedWindow.eval(log.error(`invalid GPX file passed: ${JSON.stringify(errors)}`))
  }

  const geojson: FeatureCollection = toGeoJSON.gpx(content)
  if (!GJV.valid(geojson)) {
    return chrome.devtools.inspectedWindow.eval(log.error(`invalid input file`))
  }

  const featLineStr = util.fetchLineStr(geojson)
  if (!featLineStr) {
    return chrome.devtools.inspectedWindow.eval(log.error('Deactivating previous fake events'))
  }

  if (!core.state().get('timeouts').isEmpty()) {
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
function setPosition () {
  const lat = parseInt(core.state().get('input/latitude').value)
  const lon = parseInt(core.state().get('input/longitude').value)

  const msg = util.partialMobileLocation(lat, lon)
  const path = 'mobile/location'

  chrome.devtools.inspectedWindow.eval(meta.emitStr(path, msg.get('payload')))
  chrome.devtools.inspectedWindow.eval(log.info(`'${path}' = ${msg.get('payload')}`))

  if (!core.state().get('timeouts').isEmpty()) {
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
    core.update('timeouts', Immutable.List())
  }
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
