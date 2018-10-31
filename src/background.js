/* global chrome:false */

// Can use:
// chrome.tabs.*
// chrome.runtime.*
// chrome.extension.*

const panels = {} // devtool panels map
const pages = {} // devtool pages map
console.log('background', 'init')
chrome.runtime.onConnect.addListener(function (port) {
    console.log('background', 'init message received', port)

    // assign the listener function to a variable so we can remove it later
    const listener = message => onMessageReceived(port, message)

    port.onMessage.addListener(listener)
    port.onDisconnect.addListener(function (port) {
        console.log('background', 'port disconnected', port)
        port.onMessage.removeListener(listener)
        const container = port.name === 'page' ? pages : panels

        const tabs = Object.keys(container)
        for (let i = 0, len = tabs.length; i < len; i++) {
            if (container[tabs[i]] === port) {
                port.disconnect()
                console.log('background', `port removed`, port)
                return delete container[tabs[i]]
            }
        }
    })
})

/**
 * generic listener for any incoming message
 *
 * @param port
 * @param message
 * @param sender
 * @param sendResponse
 */
function onMessageReceived (port, message, sender, sendResponse) {
    console.log('background', 'message received', message)
    switch (port.name) {
    case 'panel':
        return replyToPanel(port, message)
    case 'page':
        return forwardToPage(port, message)
    }
}

/**
 * takes a message from the devtools page and forwards it to
 * the devtools panel
 */
function forwardToPage (port, message, sender, sendResponse) {
    // keep track of the devtool pages currently active
    if (message.tabId && !(message.tabId in pages)) {
        pages[message.tabId] = port
    }

    // forward message from devtool page to panel
    if (message.tabId && message.tabId in panels) {
        console.log('background', 'message forwarded', message)
        panels[message.tabId].postMessage(message)
    } else if (message.tabId) {
        console.warn('Tab not found in connection list.')
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
