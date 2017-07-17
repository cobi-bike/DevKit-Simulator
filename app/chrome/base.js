
const fetchCOBIjsVersion = 'COBI ? COBI.specVersion : null'
const devkitInvitation = `This website doesnt contain the COBI.js library. Please
visit https://github.com/cobi-bike/COBI.js for more information.`

let COBIpanelCreated = false
let devkitInvitationPrinted = false

autoDetectCobiJs()

/**
 * It is possible that the user reloaded the website without actually re-opening
 * the simulator so we need to retry every once in a while to check that
 * all necessary elements are there.
 */
function autoDetectCobiJs () {
  chrome.devtools.inspectedWindow.eval(fetchCOBIjsVersion, {}, (result) => {
    if (result) {
      chrome.devtools.inspectedWindow.eval(fakeiOSWebkit)
      if (!COBIpanelCreated) {
        COBIpanelCreated = true // prevent trying to create the panel twice
        createCOBIpanel()
      }
    }

    if(!result && !devkitInvitationPrinted) {
      chrome.devtools.inspectedWindow.eval(`console.warn('${devkitInvitation}')`)
      devkitInvitationPrinted = true
    }
    setTimeout(autoDetectCobiJs, 1000) // 1 seconds
  })
}

/**
 * By default the simulator is disabled. So once we detect the presence of the
 * COBI.js library in the current website we create the COBI panel
 *
 * The index.html file contains a index.js script which setups all necessary
 * event listeners
 */
function createCOBIpanel() {
  chrome.devtools.panels.create('COBI',
       'images/cobi-icon.png',
       'index.html')
}

/**
 * this code should be injected to a webpage containing COBI.js in order
 * to create an echo server for read/write messages
 * It basically monkey patches the parts that are expected to be there
 * when running on an iOS system, but that are not on a Chrome browser
 */
const fakeiOSWebkit = `
  (function () {
    if (!window.webkit) {
      window.webkit = {
        messageHandlers: {
          cobiAuth: {
            postMessage: (authKey) => window.COBI.__authenticated({confirmed: true, apiKey: authKey})
          },
          cobiShell: {
            cache: {},
            postMessage: (msg) => {
              switch (msg.action) {
                case 'WRITE':
                  window.webkit.messageHandlers.cobiShell.cache[msg.path] = msg.payload
                  return setTimeout(() => COBI.__emitter.emit(msg.path, msg.payload),
                                    2 * Math.random()) // 0 to 2 seconds. Fake asynchronisity
                case 'READ':
                  if (window.webkit.messageHandlers.cobiShell.cache[msg.path]) {
                    setTimeout(() => COBI.__emitter.emit(msg.path, window.webkit.messageHandlers.cobiShell.cache[msg.path]),
                               2 * Math.random()) // 0 to 2 seconds. Fake asynchronisity
                  }
                  return
              }
              throw new Error('wrong action passed: ' + msg.action)
            }
          }
        }
      }
      // monkey path the emit function to hijack all cobi events
      // and put them in the cache
      var oldEmit = COBI.__emitter.emit
      COBI.__emitter.emit = function () {
        var event = arguments[0]
        if (typeof event === 'string' && event.match(/^\\w+\\/\\w+$/)) {
          window.webkit.messageHandlers.cobiShell.cache[event] = arguments[1]
        }
        oldEmit.apply(COBI.__emitter, arguments)
      }
    }
  })()`
