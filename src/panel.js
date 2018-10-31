
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */
/* global google:false */

// Can use
// chrome.devtools.inspectedWindow
// chrome.devtools.network
// chrome.devtools.panels

// .....................................
const toGeoJSON = require('togeojson')
const semver = require('semver')
const GJV = require('geojson-validation')
const $ = require('jquery')
const lodash = require('lodash')
// --
const state = require('./lib/state')
const meta = require('./lib/browser')
const log = require('./lib/log')
const util = require('./lib/utils')
const math = require('./lib/math')
const spec = require('./lib/spec')

// ......................................
const thumbControllerHTMLIds = {
  'COBI': '#cobi',
  'BOSCH_NYON': '#nyon',
  'BOSCH_INTUVIA': '#intuvia',
  'BOSCH_INTUVIA_MY17': '#intuvia'
}
const ENTER = 13 // key code on a keyboard
const averageSpeed = 15 // km/h
const minCobiJsSupported = '0.44.0'
const dom = {
  defaultTracks: $('#default-tracks'),
  buttonPlay: $('#btn-play'),
  touchUiToggle: $('#touch-ui-toggle'),
  infinityLoader: $('#infinity_loader'),
  coordinates: $('#coordinates'),
  inputFile: $('#input-file'),
  destinationCoordinates: $('#destination-coordinates'),
  buttonApply: $('#btn-apply'),
  buttonCancel: $('#btn-cancel'),
  tcType: $('#tc-type'), // thumb controller type
  joystick: $('#joystick'),
  nyonSelect: $('#nyn-select'),
  linkDemo: $('#link-demo')
}

// Create a connection to the background page
const backgroundPageConnection = chrome.runtime.connect({
  name: 'panel'
})
// initialize a double direction connection by sending the tabId
backgroundPageConnection.postMessage({
  name: 'panel',
  tabId: chrome.devtools.inspectedWindow.tabId,
  track: dom.defaultTracks.val()
})
// receive messages from the devtools page forwarded through the backgroundPageConnection
backgroundPageConnection.onMessage.addListener((message, sender, sendResponse) => {
  console.log('message received: ', message)
  if (message.name !== 'panel') { // ignore reply messages
    state.update('specVersion', message.specVersion)
    state.update('containerUrl', message.containerUrl)
  } else {
    state.update('track/url', message.trackUrl)
  }
})

// check for COBI.js library
autoDetectCobiJs()
setInterval(autoDetectCobiJs, 1000) // 1 seconds

// state elements
// set up internal event driven listeners
state.once('track', () => dom.buttonPlay.toggle())
state.on('track', () => state.update('track/timeouts', []))
state.on('track/url', onTrackUrlChanged)
state.on('track/timeouts', onTrackTimeoutsChanged)

/**
 * By default the simulator is disabled. So depending on the presence of
 * COBI.js library we display one of these options:
 * - an error panel if the current cobi.js version is not compatible with the simulator
 * - the simulator panel otherwise
 */
state.on('panel', (current, previous) => {
  if (current !== previous) {
    $(`#${current}`).show()
    $(`#${previous}`).hide()
  }
})

state.on('specVersion', version => $('#is-cobi-supported').html(version || 'not connected')
  .toggleClass('webapp-warning', version === null))
state.on('specVersion', version => $('#simulator').toggleClass('is-disabled', version === null))
state.once('specVersion', version => dom.linkDemo.toggle(version === null))
state.on('specVersion', version => dom.infinityLoader.toggle(version === null))
state.on('specVersion', version => {
  if (semver.valid(version) && semver.lt(version, minCobiJsSupported)) {
    return state.update('panel', 'error')
  }
  state.update('panel', 'simulator')
})
state.on('thumbControllerType', onThumbControllerTypeChanged)
state.on('cobiJsToken', onCobiJsTokenChanged)

// .............................................................................................
// ui elements initialization
$(document).ready(() => {
  const map = new google.maps.Map(document.getElementById('map'), {
    zoom: 17,
    center: {lat: 50.119496, lng: 8.6377155}
  })

  const marker = new google.maps.Marker({
    position: {lat: 50.119496, lng: 8.6377155},
    map: map,
    draggable: true
  })
  google.maps.event.addListener(marker,
    'dragend',
    (event) => {
      let position = marker.getPosition()
      dom.coordinates.val(`${position.lat().toPrecision(7)}, ${position.lng().toPrecision(7)}`)
      setPosition(`${position.lat()}, ${position.lng()}`)
    })
  google.maps.event.addListener(marker,
    'position_changed',
    (event) => {
      const position = marker.getPosition()
      if (dom.coordinates.val() !== `${position.lat()}, ${position.lng()}`) {
        dom.coordinates.val(`${position.lat().toPrecision(7)}, ${position.lng().toPrecision(7)}`)
      }
    })

  const flag = new google.maps.Marker({
    position: {lat: 50.104286, lng: 8.674835},
    map: map,
    icon: 'images/beachflag.png',
    draggable: true
  })
  google.maps.event.addListener(flag,
    'dragend',
    (event) => {
      let position = flag.getPosition()
      dom.destinationCoordinates.val(`${position.lat().toPrecision(7)}, ${position.lng().toPrecision(7)}`)
      onDestinationCoordinatesChanged(`${position.lat()}, ${position.lng()}`)
    })

  state.update('map', map)
  state.update('position/marker', marker)
  state.update('destination/marker', flag)
})

// .............................................................................................
// ui elements setup
dom.linkDemo.on('click', () => chrome.tabs.update({ url: 'https://codepen.io/cobi-bike/pen/VzBOqp?editors=0010' }))
dom.defaultTracks.on('change', () => {
  let value = dom.defaultTracks.val()
  if (value.startsWith('custom-')) {
    const filename = value.substring('custom-'.length)
    return state.update('track', state.get('user/tracks').get(filename))
  }
  backgroundPageConnection.postMessage({
    name: 'panel',
    tabId: chrome.devtools.inspectedWindow.tabId,
    track: value
  })
})

$('#btn-stop').hide().on('click', () => state.update('track/timeouts', [])) // clear old timeouts
dom.buttonPlay.hide().on('click', () => fakeInput(state.get('track')))
  .on('click', () => mapMarkerFollowsFakeInput(state.get('track')))

$('#input-file-link').on('click', () => dom.inputFile.click())
dom.inputFile.on('change', event => {
  const file = event.target.files[0]
  if (!file) return

  // helper function to avoid duplication
  // once we confirm that the file is a valid track. Add it to the options
  // and select it
  const onSuccess = (result) => {
    const currentTrack = state.get('track')
    if (lodash.isEqual(result, currentTrack)) {
      const newTracks = state.get('user/tracks')
        .set(file.name, currentTrack)
      // HACK: we are forced to store the content of the files because it is not
      // possible to trigger a file read from JS without the user manually
      // triggering it
      state.update('user/tracks', newTracks)
      dom.defaultTracks.append($('<option>', {
        value: `custom-${file.name}`,
        text: file.name,
        selected: true
      }))
      exec(log.info(`${file.name} load: DONE`))
    }
  }

  exec(log.info(`loading: ${file.name}`))
  // assume cobi track file
  if (file.type.endsWith('json')) {
    const trackReader = new FileReader()
    trackReader.onload = (evt) => {
      const result = onCobiTrackFileLoaded(JSON.parse(evt.target.result))
      onSuccess(result)
    }
    return trackReader.readAsText(file)
  }
  // xml otherwise
  const gpxReader = new FileReader()
  const parser = new DOMParser()
  gpxReader.onload = (event) => {
    const result = onGpxFileLoaded(parser.parseFromString(event.target.result, 'application/xml'))
    onSuccess(result)
  }
  gpxReader.readAsText(file)
})

dom.infinityLoader.hide()
$('#btn-state').on('click', () => exec(meta.state))
dom.touchUiToggle.on('click', () => setTouchInteraction(dom.touchUiToggle.is(':checked')))

// debounce in case of fast typing
dom.coordinates.on('input', util.debounce(event => event.keyCode !== ENTER ? onInputCoordinatesChanged(event) : null))
// change the coordinates immediately if the user pressed enter
dom.coordinates.keypress(event => event.keyCode === ENTER ? onInputCoordinatesChanged(event) : null)

// debounce in case of fast typing
dom.destinationCoordinates.on('input', util.debounce(event => event.keyCode !== ENTER ? onDestinationCoordinatesChanged() : null))
// change the coordinates immediately if the user pressed enter
dom.destinationCoordinates.keypress(event => event.keyCode === ENTER ? onDestinationCoordinatesChanged() : null)

dom.buttonCancel.on('click', () => dom.buttonApply.show())
dom.buttonCancel.on('click', () => dom.buttonCancel.hide())
dom.buttonCancel.hide().on('click', () => exec(meta.notify(spec.navigationService.status, 'NONE')))
dom.buttonApply.on('click', () => onDestinationCoordinatesChanged())

dom.tcType.on('change', () => state.update('thumbControllerType', dom.tcType.val()))

dom.nyonSelect.mouseenter(() => {
  dom.joystick.css('opacity', '1.0')
  dom.joystick.css('transition', 'opacity 0.2s ease-in-out')
})
dom.joystick.mouseleave(() => dom.joystick.css('opacity', '0'))
// thumb controllers - COBI.bike
$('#tc-up').on('click', () => thumbAction('UP'))
$('#tc-down').on('click', () => thumbAction('DOWN'))
$('#tc-right').on('click', () => thumbAction('RIGHT'))
$('#tc-left').on('click', () => thumbAction('LEFT'))
$('#tc-select').on('click', () => thumbAction('SELECT'))
$('#tc-bell').on('click', () => ringTheBell(true))
// thumb controllers - nyon
const thumbControllerActionUnavailable = () => exec(log.warn(`This thumb controller button is reserved for the native app`))
$('#nyn-plus').on('click', thumbControllerActionUnavailable)
$('#nyn-minus').on('click', thumbControllerActionUnavailable)
$('#nyn-home').on('click', thumbControllerActionUnavailable)
$('#nyn-up').on('click', () => thumbAction('UP'))
$('#nyn-down').on('click', () => thumbAction('DOWN'))
$('#nyn-right').on('click', () => thumbAction('RIGHT'))
$('#nyn-left').on('click', () => thumbAction('LEFT'))
dom.nyonSelect.on('click', () => thumbAction('SELECT'))
// thumb controllers - bosch
$('#iva-plus').on('click', () => thumbAction('UP'))
$('#iva-minus').on('click', () => thumbAction('DOWN'))
$('#iva-center').on('click', () => thumbAction('SELECT'))

function initializeCobiJs () {
  setTouchInteraction(dom.touchUiToggle.is(':checked'))
  setPosition(dom.coordinates.val())
  // only set the destination if the user didn't cancel it before
  if (dom.buttonCancel.is(':visible')) {
    onDestinationCoordinatesChanged(dom.destinationCoordinates.val())
  }
  exec(meta.notify(spec.hub.thumbControllerInterfaceId, state.get('thumbControllerType')))
}

/**
 * CDK-2 mock input data to test web apps
 */
function thumbAction (value) {
  exec(meta.notify(spec.hub.externalInterfaceAction, value))
}

/**
 * CDK-2 mock input data to test web apps
 * @param {Message[]} track a cobi track representation
 */
function fakeInput (track) {
  const emitters = track.map(msg => { return {...msg, expression: meta.notify(msg.path, msg.payload)} })

    .map(data => setTimeout(() => exec(data.expression), data.timestamp))

  state.update('track/timeouts', [...state.get('track/timeouts'), emitters])
}

/**
 * CDK-2 move the map marker and center based on fake locations
 * @param {Message[]} track a cobi track representation
 */
function mapMarkerFollowsFakeInput (track) {
  const mappers = track
    .filter(msg => msg.path === spec.mobile.location)
    .map(msg => {
      return {...msg,
        expression: () => changeMarkerPosition(msg.payload.coordinate.latitude, msg.payload.coordinate.longitude)
      }
    })
    .map(msg => setTimeout(msg.expression, msg.timestamp))

  state.update('track/timeouts', [...state.get('track/timeouts'), mappers])
}

/**
 * CDK-107 mock input data to test web apps
 * @param {*} raw a js object ... possibly a cobi track
 */
function onCobiTrackFileLoaded (raw) {
  const errors = util.cobiTrackErrors(raw)
  if (errors) {
    return exec(log.error(`Invalid COBI Track file passed: ${JSON.stringify(errors)}`))
  }
  const track = util.normalize(raw)

  return state.update('track', track)
}

/**
 * CDK-2 mock input data to test web apps
 * @param {Document} content the dom of the xml file
 */
function onGpxFileLoaded (content) {
  let errors = util.gpxErrors(content)
  if (errors) {
    return exec(log.error(`Invalid GPX file passed: ${JSON.stringify(errors)}`))
  }

  const geojson = toGeoJSON.gpx(content)
  if (!GJV.valid(geojson)) {
    return exec(log.error(`Invalid input file`))
  }

  const featLineStr = util.fetchLineStr(geojson)
  if (!featLineStr) {
    return exec(log.error('Invalid input file data'))
  }

  return state.update('track', util.geoToTrack(featLineStr))
}

/**
 * CDK-60 manually set the touch UI flag
 * @param {boolean} checked enabled or not
 */
function setTouchInteraction (checked) {
  exec(meta.notify(spec.app.touchInteractionEnabled, checked))
}

/**
 * CDK-61 mock the location of the user and deactivates fake events
 * @param {string} inputText a lat long text representation
 */
function setPosition (inputText) {
  const [lat, lon] = inputText.split(',')
    .map(text => text.trim())
    .map(parseFloat)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return exec(log.error(`Invalid coordinates
      - expected: latitude, longitude
      - instead got: ${inputText || 'null'}`))
  }

  changeMarkerPosition(lat, lon)

  const msg = util.partialMobileLocation(lon, lat)

  exec(meta.notify(spec.mobile.location, msg.payload))
}

/**
 * CDK-59 manually set the type of Thumb controller
 * @param {string} currentValue
 * @param {string} oldValue
 */
function onThumbControllerTypeChanged (currentValue, oldValue) {
  let newId = thumbControllerHTMLIds[currentValue]
  let oldId = thumbControllerHTMLIds[oldValue]

  if (currentValue !== oldValue) {
    exec(meta.notify(spec.hub.thumbControllerInterfaceId, currentValue))
  }

  if (newId !== oldId) {
    $(newId).show()
    $(oldId).hide()
  }
}

/**
 * CDK-107 update the position of the Marker in the Embedded Google Map
 * @param {number} lat
 * @param {number} lon
 */
function changeMarkerPosition (lat, lon) {
  state.get('position/marker').setPosition(new google.maps.LatLng(lat, lon))
  state.get('map').setCenter(new google.maps.LatLng(lat, lon))
}

/**
 * It is possible that the user reloaded the website without actually re-opening
 * the simulator so we need to retry every once in a while to check that
 * all necessary elements are there.
 */
function autoDetectCobiJs () {
  exec(meta.cobiJsToken, {}, (token) => state.update('cobiJsToken', token || null))
}
/**
 * wrapper around chrome eval function. This is mainly to hijack all evaluations
 * and provide custom defaults like frameURL
 * @param {string} expression a js expression to execute in the web page
 * @param {Object} [options]
 * @param {Function<Object, Object>} [callback] a callback which will receive the result of the execution
 * or an error otherwise
 */
function exec (expression, options, callback) {
  if (options && !options.frameURL && state.get('containerUrl')) {
    options.frameURL = state.get('containerUrl')
  } else if (!options) {
    options = {frameURL: state.get('containerUrl')}
  }
  if (!callback) {
    callback = errorHandler
  }
  chrome.devtools.inspectedWindow.eval(expression, options, callback)
}

/**
 * fake ringing the Hub Bell and sets a timeout to deactivate it
 * at a random point between 0 - 500 ms
 * @param {boolean} value
 */
function ringTheBell (value) {
  exec(meta.notify(spec.hub.bellRinging, value))
  if (value) {
    setTimeout(() => ringTheBell(false), 500 * Math.random()) // ms
  }
}

/**
 * attempts to read a gpx or cobi track file url
 * @param {string} fileUrl
 */
function onTrackUrlChanged (fileUrl) {
  if (fileUrl.endsWith('.gpx')) {
    return $.ajax({
      url: fileUrl,
      dataType: 'xml',
      success: (data) => onGpxFileLoaded(data)
    })
  }
  // json cobi track otherwise
  $.getJSON(fileUrl, onCobiTrackFileLoaded)
}

/**
 * reset the UI state according to the timeouts change
 * @param {Array<Array<number>>} timeouts a collection of timeouts sets to execute in the future
 * @param {Array<Array<number>>} oldTimeouts the previous collection of timeouts
 */
function onTrackTimeoutsChanged (timeouts, oldTimeouts) {
  // deactivate old waiting timeouts according to the current timeouts value
  // Remove the previous timeouts if any exists
  if (timeouts.length === 0 && oldTimeouts.length !== 0) {
    oldTimeouts.map(ids => ids.map(clearTimeout))
    exec(log.warn('Deactivating previous fake events'))
  }

  // reset the state of the play/stop button is something
  // triggered a change without the user clicking on the button
  if (timeouts.length === 0 && oldTimeouts.length !== 0) {
    dom.buttonPlay.show()
    $('#btn-stop').hide()
  } else if (timeouts.length !== 0 && oldTimeouts.length === 0) {
    dom.buttonPlay.hide()
    $('#btn-stop').show()
  }

  if (timeouts.length === 0) {
    setTouchInteraction(false)
    dom.touchUiToggle.prop('checked', false)
  }

  dom.touchUiToggle.prop('disabled', timeouts.length !== 0)
}

/**
 * cancels the current navigation and sets the inputText coordinates
 * as destination
 */
function onDestinationCoordinatesChanged () {
  const inputText = dom.destinationCoordinates.val()
  if (inputText.length === 0) {
    return exec(meta.notify(spec.navigationService.status, 'NONE'))
  }
  const [lat, lon] = inputText.split(',')
    .map(text => text.trim())
    .map(parseFloat)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return exec(log.error(`Invalid coordinates
      - expected: latitude, longitude
      - instead got: ${inputText}`))
  }

  exec(meta.fetch(spec.mobile.location), {}, (location) => {
    if (!location) {
      const error = `destination triggers navigation events which require the current position but
      none was found. Please set the current position and try again.`
      return exec(log.error(error))
    }

    const route = util.partialRoute(location.coordinate, {latitude: lat, longitude: lon})
    const distanceToDestination = math.beeLine(lat, lon, location.coordinate.latitude,
      location.coordinate.longitude)
    // 3600 = hours -> seconds, 1000 = seconds -> milliseconds
    const eta = Math.round((distanceToDestination / averageSpeed) * 3600 * 1000) + Date.now()

    // in meters according to COBI Spec: https://github.com/cobi-bike/COBI-Spec#navigation-service-channel
    exec(meta.notify(spec.navigationService.distanceToDestination, distanceToDestination * 1000))
    exec(meta.notify(spec.navigationService.eta, eta))
    exec(meta.notify(spec.navigationService.status, 'NAVIGATING'))
    exec(meta.notify(spec.navigationService.route, route.payload))

    dom.buttonApply.hide()
    dom.buttonCancel.show()
  })
}

/**
 * Fired whenever the user changed the content of the input text field
 * adding/removing/changing are taken into account
 * set the coordinates immediately if the user pressed enter
 * @param {KeyboardEvent} event
 */
function onInputCoordinatesChanged (event) {
  setPosition(dom.coordinates.val())
  state.update('track/timeouts', [])
}

/**
 * fake the initialization of cobi js if detected in the current website
 * @param {string} current
 * @param {string} previous
 */
function onCobiJsTokenChanged (current, previous) {
  if (current && current !== previous) {
    $(document).ready(initializeCobiJs)
  }
}

/**
 * @typedef {Object} ExceptionInfo
 * @property {string} code
 * @property {string} description
 * @property {*[]} details
 * @property {boolean} isError
 * @property {boolean} isException
 * @property {string} value
 */

/**
 * default handler for evaluations in the context of web apps
 * @param {Object} result
 * @param {ExceptionInfo} exceptionInfo
 */
function errorHandler (result, exceptionInfo) {
  if (exceptionInfo) {
    console.error('foreign evaluation failure:', exceptionInfo)
    // give a custom callback to avoid stack overflow
    exec(log.error(exceptionInfo.value ? exceptionInfo.value : exceptionInfo),
      {},
      () => console.error('double internal error'))
  }
}
