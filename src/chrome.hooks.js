// @flow
/* global chrome:false */
/* global FileReader:false */
import type {Map} from 'immutable'

const Immutable = require('immutable')
const meta = require('./meta')
const util = require('./utils')

chrome.devtools.panels.create('COBI',
    'images/cobi-icon.png',
    'index.html',
    function (panel) {
      // code invoked on panel creation
      let isEnabled = document.getElementById('is-cobi-supported')
      chrome.devtools.inspectedWindow.eval(meta.containsCOBIjs, result => { isEnabled.innerHTML = result })

      let tcUp = document.getElementById('tc-up')
      let tcDown = document.getElementById('tc-down')
      let tcRight = document.getElementById('tc-right')
      let tcLeft = document.getElementById('tc-left')
      let resultOut = document.getElementById('eval-output')

      let reader = new FileReader()
      reader.onload = function (evt) {
        const content: Map<string, Map<string, any>> = Immutable.fromJS(JSON.parse(evt.target.result))
        const normals = util.normalize(content)

        const emmiters = normals.map(v => {
          const path = util.path(v.get('channel'), v.get('property'))
          return emit.bind(null, path, v.get('payload'))
        }).map(setTimeout)

        const loggers = normals.map(v => {
          const path = util.path(v.get('channel'), v.get('property'))
          return log.bind(null, `${path} = ${v.get('payload')}`)
        }).map(setTimeout)
        // console.log(loggers.count)
        // console.log(emmiters.count)
      }

      let input = document.getElementById('input-file')
      input.addEventListener('change', function () {
        reader.readAsText(input.files[0])
      })

      tcUp.addEventListener('click', sendTcAction.bind(this, 'UP', resultOut))
      tcDown.addEventListener('click', sendTcAction.bind(this, 'DOWN', resultOut))
      tcLeft.addEventListener('click', sendTcAction.bind(this, 'LEFT', resultOut))
      tcRight.addEventListener('click', sendTcAction.bind(this, 'RIGHT', resultOut))
    }
)

function sendTcAction (value, container) {
  chrome.devtools.inspectedWindow.eval('COBI.__emitter.emit("hub/externalInterfaceAction", "' + value + '")',
    function (result, isException) {
      container.innerHTML = 'tc: ' + result
    })
}

const emit = function (path, value) {
  chrome.devtools.inspectedWindow.eval(meta.emitStr(path, value))
}

const log = function (s) {
  chrome.devtools.inspectedWindow.eval(meta.foreignLog(s))
}
