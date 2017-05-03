// @flow
/* global chrome:false */
/* global FileReader:false */
/* global DOMParser:false */
import type {Map} from 'immutable'
import type {GeoJSONObject} from 'geojson-flow'

const Immutable = require('immutable')
const meta = require('./meta')
const util = require('./utils')
const toGeoJSON = require('togeojson')
const GJV = require('geojson-validation')

chrome.devtools.panels.create('COBI',
    'images/cobi-icon.png',
    'index.html',
    function (panel) {
      let trackReader = new FileReader()
      let gpxReader = new FileReader()
      // ----
      trackReader.onload = function (evt) {
        const content: Map<string, Map<string, any>> = Immutable.fromJS(JSON.parse(evt.target.result))
        const normals = util.normalize(content)
        if (util.waitingTimeouts()) {
          chrome.devtools.inspectedWindow.eval(meta.foreignWarn('Deactivating previous fake events'))
        }
        setUpFakeInput(normals)
      }

      gpxReader.onload = function (evt) {
        const parser = new DOMParser()
        const content = parser.parseFromString(evt.target.result, 'application/xml')

        let errors = util.gpxErrors(content)
        if (errors !== null) {
          return chrome.devtools.inspectedWindow.eval(meta.foreignError(`invalid GPX file passed: ${errors}`))
        }

        const geojson: GeoJSONObject = toGeoJSON.gpx(content)
        if (!GJV.valid(geojson)) {
          return chrome.devtools.inspectedWindow.eval(meta.foreignError(`invalid geojson`))
        }
        if (!GJV.isFeatureCollection(geojson)) {
          return chrome.devtools.inspectedWindow.eval(meta.foreignError(`not a geojson feature collection`))
        }
        return chrome.devtools.inspectedWindow.eval(meta.foreignLog(util.geoToTrack(geojson)))
        /*
        const normals = util.normalize(content)
        if (util.waitingTimeouts()) {
          chrome.devtools.inspectedWindow.eval(meta.foreignWarn('Deactivating previous fake events'))
        }
        setUpFakeInput(normals)
        */
      }

      // ----
      let track = document.getElementById('input-track')
      track.addEventListener('change', () => trackReader.readAsText(track.files[0]))
      let localizer = document.getElementById('input-gpx')
      localizer.addEventListener('change', () => gpxReader.readAsText(localizer.files[0]))

      // code invoked on panel creation
      let isEnabled = document.getElementById('is-cobi-supported')
      chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, result => { isEnabled.innerHTML = result })

      let tcUp = document.getElementById('tc-up')
      let tcDown = document.getElementById('tc-down')
      let tcRight = document.getElementById('tc-right')
      let tcLeft = document.getElementById('tc-left')
      let resultOut = document.getElementById('eval-output')
      tcUp.addEventListener('click', sendTcAction.bind(this, 'UP', resultOut))
      tcDown.addEventListener('click', sendTcAction.bind(this, 'DOWN', resultOut))
      tcLeft.addEventListener('click', sendTcAction.bind(this, 'LEFT', resultOut))
      tcRight.addEventListener('click', sendTcAction.bind(this, 'RIGHT', resultOut))
    }
)

function sendTcAction (value, container) {
  chrome.devtools.inspectedWindow.eval('COBI.__emitter.emit("hub/externalInterfaceAction", "' + value + '")',
    function (result: string) {
      container.innerHTML = 'tc: ' + result
    })
}

// TODO: implement a proper error handling strategy
const onEvalError = (result, isException) => {
  if (isException) {
    chrome.devtools.inspectedWindow.eval(meta.foreignError({result: result, msg: isException}))
  }
}

const setUpFakeInput = function (normals) {
  const emmiters = normals.map(v => {
    const path = util.path(v.get('channel'), v.get('property'))
    const expression = meta.emitStr(path, v.get('payload'))
    return () => chrome.devtools.inspectedWindow.eval(expression)
  }).map(setTimeout)

  const loggers = normals.map(v => {
    const path = util.path(v.get('channel'), v.get('property'))
    const expression = meta.foreignLog(`${path} = ${v.get('payload')}`)
    return () => chrome.devtools.inspectedWindow.eval(expression)
  }).map(setTimeout)

  util.updateTimeouts(emmiters, loggers)
}
