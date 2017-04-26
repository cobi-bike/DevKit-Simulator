// @flow
/* global chrome:false */
/* global FileReader:false */

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
        const content = JSON.parse(evt.target.result)
        let counter = 1
        for (let msg in content) {
          const val = content[msg]
          const path = util.path(val.channel, val.property)
          const payload = JSON.stringify(val.payload)
          // var payload = val.payload
          setTimeout(log.bind(null, `${path} = ${payload}`), 100 * counter)
          // ----------------
          setTimeout(emit.bind(null, path, payload), 100 * counter)
          counter++
        };
      }

      let input = document.getElementById('input-file')
      input.addEventListener('change', function () {
        reader.readAsText(input.files[0])
        // resultOut.innerHTML = "input file:";
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
