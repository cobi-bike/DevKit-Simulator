// @flow
/* global chrome:false */
/* global FileReader:false */

chrome.devtools.panels.create('COBI',
    'app/images/cobi-icon.png',
    'app/index.html',
    function (panel) {
      // code invoked on panel creation
      let isEnabled = document.getElementById('is-cobi-supported')
      chrome.devtools.inspectedWindow.eval(
        'COBI !== null && COBI !== undefined',
        function (result, isException) {
          if (isException) {
            return isEnabled.innerHTML = 'ERROR ' + result
          }
          isEnabled.innerHTML = result
        })

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
          const channel = toMixedCase(val.channel)
          const property = toMixedCase(val.property)
          // var payload = val.payload
          setTimeout(function (value) {
            chrome.devtools.inspectedWindow.eval('console.log(' + value + ')')//, function(result, isException) {resultOut.innerHTML = value;});
          }.bind(null, JSON.stringify(channel + '/' + property + '= ' + val.payload))
          , 100 * counter)

          // ----------------
          setTimeout(sendCommand.bind(this, channel + '/' + property,
                                            JSON.stringify(val.payload))
                    , 100 * counter)
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

function sendCommand (path, value) {
  chrome.devtools.inspectedWindow.eval('COBI.__emitter.emit("' + path + '", ' + value + ')')
}

function toMixedCase (name: String) {
  const words = name.split('_')
                  .map(function (w) { return w[0].toUpperCase() + w.substr(1).toLowerCase() })
  return words[0].toLowerCase() + words.slice(1).join('')
}
