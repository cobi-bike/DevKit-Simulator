// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */
/* global marker:false */
/* global map:false */
/* global google: false */

import type {List, Map} from 'immutable'
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
const appTouchUi = 'app/touchInteractionEnabled'
const hubThumbControllerType = 'hub/thumbControllerInterfaceId'
const hubBellRinging = 'hub/bellRinging'
// --
const thumbControllerHTMLIds = Immutable.Map({
  'COBI': '#cobi',
  'BOSCH_NYON': '#nyon',
  'BOSCH_INTUVIA': '#intuvia',
  'BOSCH_INTUVIA_MY17': '#intuvia'
})
const ENTER = 13

/**
 * Chrome devtools panel creation. We create a panel with no drawers
 */
chrome.devtools.panels.create('COBI',
    'images/cobi-icon.png',
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
      core.on('track', (track: List<[number, Map<string, any>]>) => $('#playback').toggle(!track.isEmpty()))

      core.on('timeouts', deactivatePreviousTimeouts)
      core.on('timeouts', (timeouts: List<List<number>>) => timeouts.isEmpty() ? null : setTouchInteraction(false))
      core.on('timeouts', (timeouts: List<List<number>>) => timeouts.isEmpty() ? null : $('#touch-ui-toggle').prop('checked', false))
      core.on('timeouts', (timeouts: List<List<number>>) => $('#touch-ui-toggle').prop('disabled', !timeouts.isEmpty()))
      core.on('timeouts', (timeouts: List<List<number>>) => timeouts.isEmpty() ? $('#playback').attr('class', 'play')
                                                                               : $('#playback').attr('class', 'stop'))

      core.once('cobiVersion', welcomeUser)
      core.on('thumbControllerType', onThumbControllerTypeChanged)
      // ----
      autoDetectCobiJs()
      // ui elements setup
      // keep a reference to ui elements for later usage
      $('#input-file').on('change', (event) => {
        const file = event.target.files[0]
        if (!file) {  // cancelled input - do nothing
          return $('#fileLabel').html('No file chosen')
        }
        chrome.devtools.inspectedWindow.eval(log.info(`loading: ${file.name}`))
        const displayName = file.name.length > 14 ? file.name.substring(0, 14) + '...'
                                                  : file.name
        $('#fileLabel').html(displayName)
        if (file.type.endsWith('json')) {
          return trackReader.readAsText(file)
        } // xml otherwise
        return gpxReader.readAsText(file)
      })

      // --
      $('#touch-ui-toggle').on('click', () => setTouchInteraction($('#touch-ui-toggle').is(':checked')))
      $('#coordinates').on('keypress', (event) => event.keyCode === ENTER ? setPosition($('#coordinates'))
                                                                          : null)
      $('#tc-type').on('change', () => core.update('thumbControllerType', $('#tc-type').val()))
      $('#playback')
        .hide()
        .on('click', onPlayBackButtonPressed)

      $('#nyn-select').mouseenter(() => {
        $('#joystick').css('opacity', '1.0')
        $('#joystick').css('transition', 'opacity 0.2s ease-in-out')
      })
      $('#joystick').mouseleave(() => $('#joystick').css('opacity', '0'))
      // thumbcontrollers - COBI
      $('#tc-up').on('click', () => thumbAction('UP'))
      $('#tc-down').on('click', () => thumbAction('DOWN'))
      $('#tc-right').on('click', () => thumbAction('RIGHT'))
      $('#tc-left').on('click', () => thumbAction('LEFT'))
      $('#tc-select').on('click', () => thumbAction('SELECT'))
      $('#tc-bell').on('click', () => ringTheBell(true))
      // thumbcontrollers - nyon
      const thumbControllerActionUnavailable = () =>
        chrome.devtools.inspectedWindow.eval(log.warn(`This thumb controller button is reserved for the native app`))
      $('#nyn-plus').on('click', thumbControllerActionUnavailable)
      $('#nyn-minus').on('click', thumbControllerActionUnavailable)
      $('#nyn-home').on('click', thumbControllerActionUnavailable)
      $('#nyn-up').on('click', () => thumbAction('UP'))
      $('#nyn-down').on('click', () => thumbAction('DOWN'))
      $('#nyn-right').on('click', () => thumbAction('RIGHT'))
      $('#nyn-left').on('click', () => thumbAction('LEFT'))
      $('#nyn-select').on('click', () => thumbAction('SELECT'))
      // thumbcontrollers - bosch
      $('#iva-plus').on('click', () => thumbAction('UP'))
      $('#iva-minus').on('click', () => thumbAction('DOWN'))
      $('#iva-center').on('click', () => thumbAction('SELECT'))
    })

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
function fakeInput (track: List<[number, Map<string, any>]>) {
  const emmiters = track.map(([t, msg]) => {
    const expression = meta.emitStr(msg.get('path'), msg.get('payload'))
    return [t, () => chrome.devtools.inspectedWindow.eval(expression)]
  }).map(([t, fn]) => setTimeout(fn, t))

  core.update('timeouts', core.get('timeouts').push(emmiters))
}

/**
 * CDK-2 log mocked input data to test webapps
 */
function logFakeInput (track: List<[number, Map<string, any>]>) {
  const loggers = track.map(([t, msg]) => {
    return [t, () => chrome.devtools.inspectedWindow.eval(log.log(`${msg.get('path')} = ${msg.get('payload')}`))]
  }).map(([t, fn]) => setTimeout(fn, t))

  core.update('timeouts', core.get('timeouts').push(loggers))
}

/**
 * CDK-2 move the map marker and center based on fake locations
 */
function mapMarkerFollowsFakeInput (track: List<[number, Map<string, any>]>) {
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
function setTouchInteraction (checked) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(appTouchUi, checked))
  chrome.devtools.inspectedWindow.eval(log.info(`'${appTouchUi}' = ${checked}`))
}

/**
 * CDK-61 mock the location of the user and deactivates fake events
 */
function setPosition (jQCoordinates) {
  const inputText = jQCoordinates.val()
  const [lat, lon] = inputText.split(',')
                              .map(text => text.trim())
                              .map(parseFloat)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid coordinates
      - expected: latitude, longitude
      - instead got: ${inputText || 'null'}`))
  }

  changeMarkerPosition(lat, lon)

  const msg = util.partialMobileLocation(lon, lat)

  core.update('timeouts', Immutable.List())

  chrome.devtools.inspectedWindow.eval(meta.emitStr(mobileLocation, msg.get('payload')))
  chrome.devtools.inspectedWindow.eval(log.info(`'${mobileLocation}' = ${msg.get('payload')}`))
}

/**
 * CDK-59 manually set the type of Thumb controller
 */
function onThumbControllerTypeChanged (currentValue: string, oldValue: string) {
  let newId = thumbControllerHTMLIds.get(currentValue)
  let oldId = thumbControllerHTMLIds.get(oldValue)
  if (newId === oldId) return

  $(newId).show()
  $(oldId).hide()

  const expression = meta.emitStr(hubThumbControllerType, currentValue)
  chrome.devtools.inspectedWindow.eval(expression)
  chrome.devtools.inspectedWindow.eval(log.log(`"${hubThumbControllerType}" = ${currentValue}`))
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
function deactivatePreviousTimeouts (timeouts: List<List<number>>, oldTimeouts: List<List<number>>) {
  // Remove the previous timeouts if any exists
  if (timeouts.isEmpty() && !oldTimeouts.isEmpty()) {
    oldTimeouts.map(ids => ids.map(clearTimeout))
    chrome.devtools.inspectedWindow.eval(log.warn('Deactivating previous fake events'))
  }
}

function autoDetectCobiJs () {
  chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, (result) => {
    $('#is-cobi-supported').html(result || 'not connected')
    if (core.update('cobiVersion', result || false)) {
      chrome.devtools.inspectedWindow.eval(meta.fakeiOSWebkit)
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
function welcomeUser (cobiVersion: boolean) {
  if (cobiVersion) {
    chrome.devtools.inspectedWindow.eval(log.info(meta.welcome))
  }
}

/**
 * fake ringing the Hub Bell and sets a timeout to deactivate it
 * at a random point between 0 - 500 ms
 */
function ringTheBell (value: boolean) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(hubBellRinging, value))
  chrome.devtools.inspectedWindow.eval(log.log(`${hubBellRinging} = ${value.toString()}`))
  if (value) {
    setTimeout(() => ringTheBell(false), 500 * Math.random()) // ms
  }
}

/**
 * Stop the current running track file or reset a new cobitrack
 * according to the class assigned to the button: stop button or play button
 */
function onPlayBackButtonPressed () {
  var buttonClass = $(this).attr('class')
  if (buttonClass === 'stop') {
    return core.update('timeouts', Immutable.List())
  } else if (buttonClass === 'play') {
    core.update('track', core.get('track')) // fake track input event
  }
}
