// @flow
/* global chrome:false */

// Can use:
// chrome.tabs.*
// chrome.extension.*
// TODO do we need this still? now the simulator changes the panel according
// to the current state
console.log('background init')
chrome.runtime.onConnect.addListener(function (devToolsConnection) {
    // assign the listener function to a variable so we can remove it later
  const devToolsListener = function (message, sender, sendResponse) {
    // Inject a content script into the identified tab
    console.log(`message received: ${JSON.stringify(message)}`)
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
    // add the listener
  devToolsConnection.onMessage.addListener(devToolsListener)
  devToolsConnection.onDisconnect.addListener(() => devToolsConnection.onMessage.removeListener(devToolsListener))
})
