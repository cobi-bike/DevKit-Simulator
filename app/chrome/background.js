// @flow
/* global chrome:false */

// Can use:
// chrome.tabs.*
// chrome.extension.*

// TODO we need to remove the mapping on disconnect to avoid leaking memory
let panels = {} // devtool panels map
let pages = {} // devtool pages map
console.log('background init')
chrome.runtime.onConnect.addListener(function (port) {
    // assign the listener function to a variable so we can remove it later
  let listener = null
  console.log(`init message received: ${JSON.stringify(port)}`)
  if (port.name === 'panel') {
    listener = function (message, sender, sendResponse) {
      console.log(`panel message received: ${JSON.stringify(message)}`)
      // set up the mapping between devtool panel and page to communicate them
      if (message.tabId && !panels[message.tabId]) {
        panels[message.tabId] = port
      }
    }
  } else if (port.name === 'page') {
    listener = function (message, sender, sendResponse) {
      console.log(`page message received: ${JSON.stringify(message)}`)
      if (message.tabId && !(message.tabId in pages)) {
        pages[message.tabId] = port
      }

      // forward message from devtool page to panel
      if (message.tabId && message.tabId in panels) {
        panels[message.tabId].postMessage(message)
      } else if (message.tabId) {
        console.warn('Tab not found in connection list.')
      }

      // TODO: the version of the spec should be checked against the Simulator
      // supported version
      if (!message.specVersion && message.tabId) {
        chrome.browserAction.setIcon({
          tabId: message.tabId,
          path: {
            '16': 'images/icons/cobi-invitation-16.png',
            '32': 'images/icons/cobi-invitation-32.png',
            '48': 'images/icons/cobi-invitation-64.png',
            '128': 'images/icons/cobi-invitation-128.png'
          }
        })
      }
    }
  }
  // add the listener
  port.onMessage.addListener(listener)
  port.onDisconnect.addListener(() => port.onMessage.removeListener(listener))
})
