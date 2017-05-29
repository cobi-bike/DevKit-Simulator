// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */

import type {Map, List} from 'immutable'
import type {FeatureCollection} from 'geojson-flow'

const Immutable = require('immutable')
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

      // code invoked on panel creation
      let isEnabled = document.getElementById('is-cobi-supported')
      chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, {}, result => { isEnabled.innerHTML = result })

      let tcUp = document.getElementById('tc-up')
      let tcDown = document.getElementById('tc-down')
      let tcRight = document.getElementById('tc-right')
      let tcLeft = document.getElementById('tc-left')
      if (tcUp) tcUp.addEventListener('click', thumbAction.bind(this, 'UP'))
      if (tcDown) tcDown.addEventListener('click', thumbAction.bind(this, 'DOWN'))
      if (tcLeft) tcLeft.addEventListener('click', thumbAction.bind(this, 'LEFT'))
      if (tcRight) tcRight.addEventListener('click', thumbAction.bind(this, 'RIGHT'))
    }
)

const thumbAction = function (value) {
  const expression = meta.emitStr('hub/externalInterfaceAction', value)
  chrome.devtools.inspectedWindow.eval(expression)
  logOut(log.level.VERBOSE, `"hub/externalInterfaceAction" = ${value}`)
}

const fakeInput = function (normals) {
  const emmiters = normals.map(([t, msg]) => {
    const path = util.path(msg.get('channel'), msg.get('property'))
    const expression = meta.emitStr(path, msg.get('payload'))
    return [() => chrome.devtools.inspectedWindow.eval(expression), t]
  }).map(([fn, t]) => setTimeout(fn, t))

  const loggers = normals.map(([t, msg]) => {
    const path = util.path(msg.get('channel'), msg.get('property'))
    return [() => logOut(log.level.VERBOSE, `${path} = ${msg.get('payload')}`), t]
  }).map(([fn, t]) => setTimeout(fn, t))

  util.updateTimeouts(Immutable.List([emmiters, loggers]))
}

const onCobiTrackFileLoaded = function (evt) {
  // timestampt and cobibus msg
  const content: List<[number, Map<string, any>]> = Immutable.List(JSON.parse(evt.target.result))
  const normals = util.normalize(content)
  if (util.waitingTimeouts()) {
    logOut(log.level.WARNING, 'Deactivating previous fake events')
  }
  fakeInput(normals)
}

const onGpxFileLoaded = function (evt) {
  const parser = new DOMParser()
  const content = parser.parseFromString(evt.target.result, 'application/xml')

  let errors = util.gpxErrors(content)
  if (errors !== null) {
    return logOut(log.level.ERROR, `invalid GPX file passed: ${JSON.stringify(errors)}`)
  }

  const geojson: FeatureCollection = toGeoJSON.gpx(content)
  if (!GJV.valid(geojson)) {
    return logOut(log.level.ERROR, `invalid input file`)
  }

  const featLineStr = util.fetchLineStr(geojson)
  if (!featLineStr) {
    return logOut(log.level.ERROR, `input file elements not supported`)
  }

  if (util.waitingTimeouts()) {
    logOut(log.level.WARNING, 'Deactivating previous fake events')
  }

  fakeInput(util.geoToTrack(featLineStr))
}

// TODO: log only if current log level is greater than or equal passed log level
const logOut = function (level, content) {
  const logger = log.amidst(level, content)
  chrome.devtools.inspectedWindow.eval(logger)
}
