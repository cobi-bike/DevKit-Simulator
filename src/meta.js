// @flow

const containsCOBIjs = 'COBI !== null && COBI !== undefined'
const emitStr = (path: string, value: any) => `COBI.__emitter.emit("${path}", ${JSON.stringify(value)})`

/**
 * this code should be injected to a webpage containing COBI.js in order
 * to create an echo server for read/write messages
 * It basically monkey patches the parts that are expected to be there
 * when running on an iOS system, but that are not on a Chrome browser
 */
const fakeiOSWebkit =
  `(function () {
    if (!window.webkit) {
      window.webkit = {
        messageHandlers: {
          cobiAuth: {
            postMessage: (authKey) => {
              window.COBI.__apiKey = authKey
              console.info('COBI.js api key confirmed !!')
            }
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

module.exports.containsCOBIjs = containsCOBIjs
module.exports.emitStr = emitStr
module.exports.fakeiOSWebkit = fakeiOSWebkit
module.exports.welcome = welcome
