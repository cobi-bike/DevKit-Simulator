/**
 * Some websites might include one or more iframes in which COBI.js might be
 * included. So if we fail to find COBI.js in the top frame, we try to search
 * in the embedded iframes if any exists.
 *
 * Note: we use the prototype because website might decide to have their own
 * implementation of Array which would break our code
 * @returns {Array<string>} the return value of chrome eval
 */
module.exports.IframeUrls = `Array.prototype.slice.call(document.getElementsByTagName('iframe')).map(frame => frame.src)`

/**
 * this code should be injected to a webpage containing COBI.js in order
 * to create an echo server for read/write messages
 * It basically monkey patches the parts that are expected to be there
 * when running on an iOS system, but that are not on a Chrome browser
 */
module.exports.fakeiOSWebkit = `
  (function () {
    if (!window.webkit) {
      window.webkit = {
        messageHandlers: {
          cobiAuth: {
            postMessage: (request) => window.COBI.__authenticated({confirmed: true, apiKey: request.token})
          },
          cobiShell: {
            cache: {},
            postMessage: (msg) => {
              switch (msg.action) {
                case 'WRITE':
                  window.webkit.messageHandlers.cobiShell.cache[msg.path] = msg.payload
                  return setTimeout(() => COBI.__receiveMessage({action: 'NOTIFY', path: msg.path, payload: msg.payload}),
                                    2 * Math.random()) // 0 to 2 seconds. Fake asynchronisity
                case 'READ':
                  if (window.webkit.messageHandlers.cobiShell.cache[msg.path]) {
                    setTimeout(() => COBI.__receiveMessage({action: 'NOTIFY', path: msg.path, payload: window.webkit.messageHandlers.cobiShell.cache[msg.path]}),
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
      var oldReceiver = COBI.__receiveMessage
      COBI.__receiveMessage = function (message) {
        console.log(message.path + ' = ' + JSON.stringify(message.payload))
        window.webkit.messageHandlers.cobiShell.cache[event] = message.payload
        oldReceiver(message)
      }
    }
  })()`

module.exports.fetchCOBIjsVersion = 'COBI ? COBI.specVersion : null'
module.exports.cobiJsToken = 'COBI ? COBI.__authentication() : null'
/**
 * sends a message to COBI.js in the web page
 * @param {String} path the COBI Spec property to notify
 * @param {*} value
 * @returns {string}
 */
module.exports.notify = (path, value) => `COBI.__receiveMessage({action: 'NOTIFY', path: "${path}", payload: ${JSON.stringify(value)}})`
/**
 * retrieves the last known value for property path
 * @param {String} path the COBI Spec property
 * @returns {string}
 */
module.exports.fetch = (path) => `window.webkit.messageHandlers.cobiShell.cache['${path}']`
module.exports.state = `console.log("COBI.js state:", window.webkit.messageHandlers.cobiShell.cache)`
