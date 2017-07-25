// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */
/* global google: false */

// Can use
// chrome.devtools.*
// chrome.extension.*

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
const math = require('./math')
// --
const mobileLocation = 'mobile/location'
const hubThumbControllerAction = 'hub/externalInterfaceAction'
const appTouchUi = 'app/touchInteractionEnabled'
const hubThumbControllerType = 'hub/thumbControllerInterfaceId'
const hubBellRinging = 'hub/bellRinging'
const navigationServiceStatus = 'navigationService/status'
const navigationServiceDestination = 'navigationService/destinationLocation'
const navigationServiceETA = 'navigationService/Eta'
const navigationServiceDistanceToDestination = 'navigationService/distanceToDestination'
// --
const thumbControllerHTMLIds = Immutable.Map({
  'COBI': '#cobi',
  'BOSCH_NYON': '#nyon',
  'BOSCH_INTUVIA': '#intuvia',
  'BOSCH_INTUVIA_MY17': '#intuvia'
})
const ENTER = 13
const averageSpeed = 15 // km/h

// run intermitedly to check for COBI.js library
autoDetectCobiJs()

let trackReader = new FileReader()
trackReader.onload = onCobiTrackFileLoaded
let gpxReader = new FileReader()
gpxReader.onload = onGpxFileLoaded
// core elements
// set up internal event driven listeners
core.on('track', () => core.update('timeouts', Immutable.List())) // clear old timeouts
core.on('track', fakeInput)
core.on('track', mapMarkerFollowsFakeInput)

core.on('timeouts', deactivatePreviousTimeouts)
core.on('timeouts', (timeouts: List<any>) => timeouts.isEmpty() ? null : setTouchInteraction(false))
core.on('timeouts', (timeouts: List<any>) => timeouts.isEmpty() ? null : $('#touch-ui-toggle').prop('checked', false))
core.on('timeouts', (timeouts: List<any>) => $('#touch-ui-toggle').prop('disabled', !timeouts.isEmpty()))
core.on('timeouts', (current: List<any>) => $('#btn-play').toggle(current.isEmpty() && !core.get('track').isEmpty()))
core.on('timeouts', (current: List<any>) => $('#btn-stop').toggle(!current.isEmpty()))

core.once('cobiVersion', welcomeUser)
core.on('cobiVersion', version => $('#is-cobi-supported').html(version || 'not connected'))
core.on('thumbControllerType', onThumbControllerTypeChanged)
// ----
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

$('#coordinates').on('input', util.debounce(event => event.keyCode !== ENTER ? setPosition($('#coordinates').val()) : null))
$('#coordinates').keypress(event => event.keyCode === ENTER ? setPosition($('#coordinates').val()) : null)

$('#destination-coordinates').on('input', util.debounce(event => event.keyCode !== ENTER ? onDestinationCoordinatesChanged($('#destination-coordinates').val()) : null))
$('#destination-coordinates').keypress(event => event.keyCode === ENTER ? onDestinationCoordinatesChanged($('#destination-coordinates').val()) : null)

$('#btn-cancel').on('click', () => $('#btn-apply').show())
$('#btn-cancel').on('click', () => $('#btn-cancel').hide())
$('#btn-cancel').hide().on('click', () => chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceStatus, 'NONE')))
$('#btn-apply').on('click', () => onDestinationCoordinatesChanged($('#destination-coordinates').val()))

$('#btn-stop').hide().on('click', () => onTogglePlayBackButtonPressed(false))
$('#btn-play').hide().on('click', () => onTogglePlayBackButtonPressed(true))

$('#tc-type').on('change', () => core.update('thumbControllerType', $('#tc-type').val()))

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
const thumbControllerActionUnavailable = () => chrome.devtools.inspectedWindow.eval(log.warn(`This thumb controller button is reserved for the native app`))
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

// -- reflect values shown in the UI - initilization
$(document).ready(() => {
  const position = {lat: 50.119496, lng: 8.6377155}
  const destination = {lat: 50.104286, lng: 8.674835}
  core.update('map', new google.maps.Map(document.getElementById('map'), {
    zoom: 17,
    center: position
  }))
  core.update('position/marker', new google.maps.Marker({
    position: position,
    map: core.get('map')
  }))
  core.update('destination/marker', new google.maps.Marker({
    position: destination,
    map: core.get('map'),
    icon: 'images/beachflag.png'
  }))
  setTouchInteraction($('#touch-ui-toggle').is(':checked'))
  setPosition($('#coordinates').val())
  onDestinationCoordinatesChanged($('#destination-coordinates').val())
})

/**
 * CDK-2 mock input data to test webapps
 */
function thumbAction (value) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(hubThumbControllerAction, value))
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
}

/**
 * CDK-61 mock the location of the user and deactivates fake events
 */
function setPosition (inputText: string) {
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
}

/**
 * CDK-107 update the position of the Marker in the Embedded Google Map
 */
function changeMarkerPosition (lat: number, lon: number) {
  core.get('position/marker').setPosition(new google.maps.LatLng(lat, lon))
  core.get('map').setCenter(new google.maps.LatLng(lat, lon))
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

/**
 * It is possible that the user reloaded the website without actually re-opening
 * the simulator so we need to retry every once in a while to check that
 * all necessary elements are there.
 */
function autoDetectCobiJs () {
  chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, (result) => {
    if (result) {
      core.update('cobiVersion', result)
    }
    // setTimeout(autoDetectCobiJs, 60000)
    // if (result) console.warn('COBI.js was not detected. Retrying in 1 second')
  })
}

/**
 * display an ascii version of the COBI logo once the app authentication
 * works
 */
function welcomeUser (current: boolean, previous: boolean) {
  if (!previous && current) {
    chrome.devtools.inspectedWindow.eval(log.info(meta.welcome))
  }
}

/**
 * fake ringing the Hub Bell and sets a timeout to deactivate it
 * at a random point between 0 - 500 ms
 */
function ringTheBell (value: boolean) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(hubBellRinging, value))
  if (value) {
    setTimeout(() => ringTheBell(false), 500 * Math.random()) // ms
  }
}

/**
 * Stop the current running track file or reset a new cobitrack
 * according to the class assigned to the button: stop button or play button
 */
function onTogglePlayBackButtonPressed (play) {
  if (!play) {
    return core.update('timeouts', Immutable.List())
  } else {
    core.update('track', core.get('track')) // fake track input event
  }
}

function onDestinationCoordinatesChanged (inputText: string) {
  if (inputText.length === 0) {
    return chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceStatus, 'NONE'))
  }
  const [lat, lon] = inputText.split(',')
                              .map(text => text.trim())
                              .map(parseFloat)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return chrome.devtools.inspectedWindow.eval(log.error(`Invalid coordinates
      - expected: latitude, longitude
      - instead got: ${inputText}`))
  }

  chrome.devtools.inspectedWindow.eval(meta.fetch(mobileLocation), {}, (location) => {
    if (!location) {
      const error = `destination triggers navigation events which require the current position but
      none was found. Please set the current position and try again.`
      return chrome.devtools.inspectedWindow.eval(log.error(error))
    }
    const destination = util.partialMobileLocation(lon, lat)
    const distanceToDestination = math.beeLine(lat, lon, location.latitude, location.longitude)
    // 3600 = hours -> seconds, 1000 = seconds -> milliseconds
    const eta = Math.round((distanceToDestination / averageSpeed) * 3600 * 1000) + Date.now()
    // in meters according to COBI Spec: https://github.com/cobi-bike/COBI-Spec#navigation-service-channel
    const dTDmeters = distanceToDestination * 1000

    chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceDestination, destination.get('payload')))
    chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceDistanceToDestination, dTDmeters))
    chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceETA, eta))
    chrome.devtools.inspectedWindow.eval(meta.emitStr(navigationServiceStatus, 'NAVIGATING'))

    $('#btn-apply').hide()
    $('#btn-cancel').show()
  })
}
