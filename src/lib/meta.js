// @flow

const fetchCOBIjsVersion = 'COBI ? COBI.specVersion : null'
const cobiJsToken = 'COBI ? COBI.__apiKey : null'
/**
 * Some websites might include one or more iframes in which COBI.js might be
 * included. So if we fail to find COBI.js in the top frame, we try to search
 * in the embedded iframes if any exists.
 *
 * Note: we use the prototype because website might decide to have their own
 * implementation of Array which would break our code
 * @returns {Array<string>} the return value of chrome eval
 */
const fetchIframeUrls = `Array.prototype.slice.call(document.getElementsByTagName('iframe')).map(frame => frame.src)`
const emitStr = (path: string, value: any) => `COBI.__emitter.emit("${path}", ${JSON.stringify(value)})`
const fetch = (path: string) => `window.webkit.messageHandlers.cobiShell.cache['${path}']`

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

const welcome = `
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++#+##++++++++++++++++++++++++++++++++++++++
+++++++++++++#.     :+++++++++#,:,,,::;+++++++#         ;+++++++# +++++++++
++++++++++++. '##+## #+++++++::'+++++#::#++++++++++++++@ '++++++# +++++++++
+++++++++++  #++++++++++++++,,+++++++++#:++++++++++++++++ #+++++# +++++++++
++++++++++' +++++++++++++++:,+++++++++++#:#++++++++++++++; +++++# +++++++++
+++++++++# +++++++++++++++#:+++++++++++++;,++++++++++++++# +++++# +++++++++
+++++++++ ;+++++++++++++++:;++++++++++++++:#+++++++++++++# +++++# +++++++++
+++++++++ ++++++++++++++++:#++++++++++++++:;+++++++++++++ :+++++# +++++++++
++++++++# ++++++++++++++++'+++++++++++++++#,++++++++++++. ++++++# +++++++++
+++++++++ ++++++++++++++++++++++++++++++++#,+++++        +++++++# +++++++++
+++++++++ ++++++++++++++++++++++++++++++++#,++++#;;;;;;.  ++++++# +++++++++
++++++++# +++++++++++++++ +++++++++++++++++,+++++++++++++ '+++++# +++++++++
+++++++++ #++++++++++++++ ++++++++++++++++:;+++++++++++++# +++++# +++++++++
+++++++++ .+++++++++++++ '++++++++++++++++:#++++++++++++++ @++++# +++++++++
+++++++++# #+++++++++++' ++++++++++++++++::+++++++++++++++ @++++# +++++++++
++++++++++; #+++++++++@ @+++++++++++++++':++++++++++++++++ #++++# +++++++++
+++++++++++, ++++++++, #++++++#++++++++;:#+++++++++++++++  +++++# +++++++++
++++++++++++#  ,##+.  #+++++++::#+++#':,#++++++########+  ++++++# +++++++++
++++++++++++++#'   .#++++++++++;,::::,#+++++++#         ;+++++++# +++++++++
++++++++++++++++++++++++++++++++++#++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
`

module.exports.fetchCOBIjsVersion = fetchCOBIjsVersion
module.exports.cobiJsToken = cobiJsToken
module.exports.emitStr = emitStr
module.exports.welcome = welcome
module.exports.fetch = fetch
module.exports.IframeUrls = fetchIframeUrls
module.exports.fakeiOSWebkit = fakeiOSWebkit
