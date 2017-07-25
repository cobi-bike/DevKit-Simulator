// @flow
/* global chrome:false */

// Can use
// devtools.inspectedWindow
// devtools.network
// devtools.panels
const fetchCOBIjsVersion = 'window.COBI ? window.COBI.specVersion : null'
const currentSupportedMajorVersion = 0
let COBIpanelCreated = false

setInterval(autoDetectCobiJs, 1000) // 1 seconds

// Create a connection to the background page
const backgroundPageConnection = chrome.runtime.connect({
  name: 'devtools-page'
})

/**
 * It is possible that the user reloaded the website without actually re-opening
 * the simulator so we need to retry every once in a while to check that
 * all necessary elements are there.
 */
function autoDetectCobiJs () {
  chrome.devtools.inspectedWindow.eval(fetchCOBIjsVersion, {}, (result) => {
    // Relay the tab ID to the background page
    backgroundPageConnection.postMessage({
      specVersion: result,
      tabId: chrome.devtools.inspectedWindow.tabId
    })
    if (result) {
      // fake iOS native webkit if cobi.js is detected
      chrome.devtools.inspectedWindow.eval(fakeiOSWebkit)
    }
    if (!COBIpanelCreated) { // prevent trying to create the panel twice
      let panel = ''
      if (result === null || result === undefined) {
        panel = 'popups/invitation.html'
      } else if (parseInt(result.split('.')[0]) > currentSupportedMajorVersion) {
        panel = 'popups/error.html'
      } else {
        panel = 'panel.html'
      }
      /**
       * By default the simulator is disabled. So depending on the presence of
       * COBI.js library we display one of three options:
       * - an invitation panel if no cobi.js was FOUND
       * - an error panel if the current cobi.js version is not compatible with the simulator
       * - the simulator panel otherwise
       */
      chrome.devtools.panels.create('COBI',
        'images/cobi-default-64.png',
        panel)
      COBIpanelCreated = true
    }
  })
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
          console.log(event + ' = ' + JSON.stringify(arguments[1]))
          window.webkit.messageHandlers.cobiShell.cache[event] = arguments[1]
        }
        oldEmit.apply(COBI.__emitter, arguments)
      }
    }
  })()`
