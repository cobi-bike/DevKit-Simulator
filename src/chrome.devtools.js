// @flow
/* global chrome:false */

// Can use
// chrome.devtools.inspectedWindow
// chrome.devtools.network
// chrome.devtools.panels

const meta = require('./lib/meta')

let COBIpanelCreated = false
let iframeContainerUrl = null

autoDetectCobiJs()
setInterval(autoDetectCobiJs, 2000) // 2 seconds

// Create a connection to the background page
const backgroundPageConnection = chrome.runtime.connect({
  name: 'page'
})

/**
 * It is possible that the user reloaded the website without actually re-opening
 * the simulator so we need to retry every once in a while to check that
 * all necessary elements are there.
 */
function autoDetectCobiJs () {
  const options = iframeContainerUrl === null ? {} : {frameURL: iframeContainerUrl}
  chrome.devtools.inspectedWindow.eval(meta.fetchCOBIjsVersion, options, (version) => {
    // Relay the tab ID to the background page
    backgroundPageConnection.postMessage({
      specVersion: version || null,
      tabId: chrome.devtools.inspectedWindow.tabId,
      containerUrl: iframeContainerUrl
    })
    if (version) { // fake iOS native webkit if cobi.js is detected
      chrome.devtools.inspectedWindow.eval(meta.fakeiOSWebkit, options)
    } else if (iframeContainerUrl === null) {
      // find out if the current page has iframe containers with a COBI.js in any of them
      // we purposedly neglect the case of more than one iframe with a COBI.js in it
      // for simplicity
      chrome.devtools.inspectedWindow.eval(meta.IframeUrls, {}, (urls) => {
        if (urls && urls.length !== 0) {
          urls.filter(url => url) // ignore empty strings - from weird iframes
              .forEach(url => chrome.devtools.inspectedWindow.eval(meta.fetchCOBIjsVersion,
                                {frameURL: url},
                                (version2) => {
                                  if (version2) {
                                    iframeContainerUrl = url
                                  }
                                }
                              ))
        }
      })
    }
    if (!COBIpanelCreated) { // prevent trying to create the panel twice
      chrome.devtools.panels.create('COBI',
        'images/cobi-default-64.png',
        'panel.html')
      COBIpanelCreated = true
    }
  })
}
