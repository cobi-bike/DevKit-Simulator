/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */
'use strict'

declare var chrome: {
  devtools: {
    network: {
      onNavigated: {
        addListener: (cb: (url: string) => void) => void,
        removeListener: (cb: () => void) => void,
      },
    },
    inspectedWindow: {
      // https://developer.chrome.com/extensions/devtools_inspectedWindow#method-eval
      eval: (code: string, options?: Object, cb?: (res: Object, err?: Object) => any) => void,
      tabId: number,
    },
    panels: {
      create: (title: string, icon: string, filename: string, cb: (panel: {
        onHidden: {
          addListener: (cb: (window: Object) => void) => void,
        },
        onShown: {
          addListener: (cb: (window: Object) => void) => void,
        }
      }) => void) => void,
    },
  },
  tabs: {
    executeScript: (tabId: number, options: Object, fn: () => void) => void,
  },
  runtime: {
    getURL: (path: string) => string,
    connect: (config: Object) => {
      disconnect: () => void,
      onMessage: {
        addListener: (fn: (message: Object) => void) => void,
      },
      onDisconnect: {
        addListener: (fn: (message: Object) => void) => void,
      },
      postMessage: (data: Object) => void,
    },
    onConnect: {
      addListener: (fn: (port: {
        name: string,
        sender: {
          tab: {
            id: number,
          },
        },
      }) => void) => void,
    },
  },
};
