/* global chrome:false */

// Can use:
// chrome.tabs.*
// chrome.extension.*

let panels = {} // devtool panels map
let pages = {} // devtool pages map
console.log('background', 'init')
chrome.runtime.onConnect.addListener(function (port) {
    // assign the listener function to a variable so we can remove it later
    let listener = null
    console.log('background', 'init message received', port)
    if (port.name === 'panel') {
        listener = (message) => replyToPanel(port, message)
    } else if (port.name === 'page') {
        listener = (message) => forwardToPage(port, message)
    }
    // add the listener
    port.onMessage.addListener(listener)
    port.onDisconnect.addListener(function (port) {
        console.log('background', 'port disconnected', port)
        port.onMessage.removeListener(listener)
        const container = port.name === 'page' ? pages : panels

        var tabs = Object.keys(container)
        for (var i = 0, len = tabs.length; i < len; i++) {
            if (container[tabs[i]] === port) {
                console.log('background', `port removed`)
                return delete container[tabs[i]]
            }
        }
    })
})

/**
 * takes a message from the devtools page and forwards it to
 * the devtools panel
 */
function forwardToPage (port, message, sender, sendResponse) {
    if (message.tabId && !(message.tabId in pages)) {
        pages[message.tabId] = port
    }

    // forward message from devtool page to panel
    if (message.tabId && message.tabId in panels) {
    // attach the URL of the file if requested
        panels[message.tabId].postMessage(message)
        console.log('background', 'message forwarded', message)
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

/**
 * takes a message from the devtools panel and replies
 * to it if it contains a track URL request
 */
function replyToPanel (port, message, sender, sendResponse) {
    // set up the mapping between devtool panel and page to communicate them
    if (message.tabId && !panels[message.tabId]) {
        panels[message.tabId] = port
    }
    // the devtool panel might request the URL of a track file from
    // the background page
    if (message.tabId && message.track && panels[message.tabId]) {
        console.log('background', `track request: ${message}`)
        message.trackUrl = chrome.runtime.getURL(`tracks/${message.track}`)
        panels[message.tabId].postMessage(message)
    }
}
