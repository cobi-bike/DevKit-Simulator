// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */
/* global marker:false */
/* global map:false */
/* global google: false */

import type {List} from 'immutable'
import type {FeatureCollection} from 'geojson-flow'
// --
const Immutable = require('immutable')
const toGeoJSON = require('togeojson')
const GJV = require('geojson-validation')
const $ = require('jquery')
// --
const core = require('./core')
const meta = require('./meta')
const log = require('./log')
const util = require('./utils')
// --
const mobileLocation = 'mobile/location'
const hubThumbControllerAction = 'hub/externalInterfaceAction'
const appTouchUi = 'app/touchUi'
const hubThumbControllerType = 'hub/thumbControllerInterfaceId'

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
      // core elements
      // set up internal event driven listeners
      core.on('track', () => core.update('timeouts', Immutable.List())) // clear old timeouts
      core.on('track', fakeInput)
      core.on('track', logFakeInput)
      core.on('track', mapMarkerFollowsFakeInput)
      core.on('timeouts', deactivatePreviousTimeouts)
      core.on('timeouts', updateUIforTimeouts)
      core.once('isCobiEnabled', welcomeUser)

      // ----
      autoDetectCobiJs()
      // ui elements setup
      // keep a reference to ui elements for later usage
      $('#input-file').on('change', (event) => {
        const file = event.target.files[0]
        if (!file) return // cancelled input - do nothing
        chrome.devtools.inspectedWindow.eval(log.info(`loading: ${file.name}`))
        if (file.type.endsWith('json')) {
          return trackReader.readAsText(file)
        } // xml otherwise
        return gpxReader.readAsText(file)
      })

      $('#tc-type').on('change', () => {
        const value = $('#tc-type').val()
        $('#tc-right').prop('disabled', value.match(/intuvia/i) !== null)
        $('#tc-left').prop('disabled', value.match(/intuvia/i) !== null)
        setThumbControllerType(value)
      })

      $('#stop-playback').on('click', () => {
        if (!core.get('timeouts').isEmpty()) {
          chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
        }
        core.update('timeouts', Immutable.List())
      })

      $('#tc-up').on('click', () => thumbAction('UP'))
      $('#tc-down').on('click', () => thumbAction('DOWN'))
      $('#tc-right').on('click', () => thumbAction('RIGHT'))
      $('#tc-left').on('click', () => thumbAction('LEFT'))
      $('#tc-select').on('click', () => thumbAction('SELECT'))
      $('#touch-ui-toggle').on('click', () => toggleTouchUI($('#touch-ui-toggle').is(':checked')))
      $('#position').on('click', () => setPosition($('#latitude').val(),
                                                   $('#longitude').val()))
    }
)

/**
 * CDK-2 mock input data to test webapps
 */
function thumbAction (value) {
  const expression = meta.emitStr(hubThumbControllerAction, value)
  chrome.devtools.inspectedWindow.eval(expression)
  chrome.devtools.inspectedWindow.eval(log.log(`${hubThumbControllerAction} = ${value}`))
}

/**
 * CDK-2 mock input data to test webapps
 */
function fakeInput (track) {
  const emmiters = track.map(([t, msg]) => {
    const expression = meta.emitStr(msg.get('path'), msg.get('payload'))
    return [t, () => chrome.devtools.inspectedWindow.eval(expression)]
  }).map(([t, fn]) => setTimeout(fn, t))

  core.update('timeouts', core.get('timeouts').push(emmiters))
}

/**
 * CDK-2 log mocked input data to test webapps
 */
function logFakeInput (track) {
  const loggers = track.map(([t, msg]) => {
    return [t, () => chrome.devtools.inspectedWindow.eval(log.log(`${msg.get('path')} = ${msg.get('payload')}`))]
  }).map(([t, fn]) => setTimeout(fn, t))

  core.update('timeouts', core.get('timeouts').push(loggers))
}

/**
 * CDK-2 move the map marker and center based on fake locations
 */
function mapMarkerFollowsFakeInput (track) {
  const mappers = track
    .filter(([t, msg]) => msg.get('path') === mobileLocation)
    .map(([t, msg]) => {
      return [t, () => changeMarkerPosition(msg.get('payload').get('latitude'),
                                            msg.get('payload').get('longitude'))]
    })
    .map(([t, fn]) => setTimeout(fn, t))

  core.update('timeouts', core.get('timeouts').push(mappers))
}

/**
 * CDK-107 mock input data to test webapps
 */
function onCobiTrackFileLoaded (evt) {
  const raw = JSON.parse(evt.target.result)
  const errors = util.cobiTrackErrors(raw)
  if (errors) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid COBI Track file passed: ${JSON.stringify(errors)}`))
  }
  const content: List<[number, Object]> = Immutable.List(raw)
  const track = util.normalize(content)

  core.update('track', track)
}

/**
 * CDK-2 mock input data to test webapps
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

  core.update('track', util.geoToTrack(featLineStr))
}

/**
 * CDK-60 manually set the touch UI flag
 */
function toggleTouchUI (checked) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(appTouchUi, checked))
  chrome.devtools.inspectedWindow.eval(log.info(`'${appTouchUi}' = ${checked}`))
}

/**
 * CDK-61 mock the location of the user and deactivates fake events
 */
function setPosition (inputLat, inputLon) {
  const lat = parseFloat(inputLat) || 0
  const lon = parseFloat(inputLon) || 0

  changeMarkerPosition(lat, lon)

  const msg = util.partialMobileLocation(lon, lat)

  core.update('timeouts', Immutable.List())

  chrome.devtools.inspectedWindow.eval(meta.emitStr(mobileLocation, msg.get('payload')))
  chrome.devtools.inspectedWindow.eval(log.info(`'${mobileLocation}' = ${msg.get('payload')}`))
}

/**
 * CDK-59 manually set the type of Thumb controller
 */
function setThumbControllerType (value) {
  const expression = meta.emitStr(hubThumbControllerType, value)
  chrome.devtools.inspectedWindow.eval(expression)
  chrome.devtools.inspectedWindow.eval(log.log(`"${hubThumbControllerType}" = ${value}`))
}

/**
 * CDK-107 update the position of the Marker in the Embedded Google Map
 */
function changeMarkerPosition (lat: number, lon: number) {
  marker.setPosition(new google.maps.LatLng(lat, lon))
  map.setCenter(new google.maps.LatLng(lat, lon))
}

/**
 * deactivate old waiting timeouts and update the UI
 * according to the current timeouts value
 */
function deactivatePreviousTimeouts (timeouts, oldTimeouts) {
  // Remove the previous timeouts if any exists
  if (timeouts.isEmpty() && !oldTimeouts.isEmpty()) {
    oldTimeouts.map(ids => ids.map(clearTimeout))
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
  }
}

/**
 * activates/deactivates certain ui elements whenever a the timeouts
 * are updated
 */
function updateUIforTimeouts (timeouts) {
  // not allowed by design - CDK-60
  $('#touch-ui-toggle').prop('disabled', !timeouts.isEmpty())
  $('#stop-playback').prop('disabled', timeouts.isEmpty())
}

function autoDetectCobiJs () {
  chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, (result) => {
    $('#is-cobi-supported').html = result
    if (core.update('isCobiEnabled', result || false)) {
      chrome.devtools.inspectedWindow.eval(meta.fakeiOSWebkit, {}, (_, error) => {
         // show the problem in the simulator
        if (error) {
          $('#is-cobi-supported').html = error.toString()
        }
      })
    }
    // cobi.js is not included in the user website. This can have two possible
    // reasons:
    // - this is not a webapp and therefore cobi.js will never be there
    // - we evaluated this too early and thus have to retry a bit later
    setTimeout(autoDetectCobiJs, 1)
    // if (result) console.warn('COBI.js was not detected. Retrying in 1 second')
  })
}

/**
 * display an ascii version of the COBI logo once the app authentication
 * works
 */
function welcomeUser (isCobiEnabled: boolean) {
  if (isCobiEnabled) {
    chrome.devtools.inspectedWindow.eval(log.info(meta.welcome))
  }
}
