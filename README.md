
# COBI.js simulator

COBI DevKit Simulator is a browser-based DevTools extension to simulate WebApp events without having to install them on your Smartphone nor connect them to the COBI Hub.

Currently it is only available for Chrome browsers version 45 or greater.

More information:
- [COBI DevKit Forum](https://forums.cobi.bike/)
- [COBI.js api docs](https://cobi-bike.github.io/COBI.js/)

![preview](/resources/SimulatorScreenShot.png)

## install
The easiest way to get the COBI Devkit simulator is to install it directly from the
[Chrome Webstore](https://chrome.google.com/webstore/detail/cobi-jetpack-simulator/hpdhkapigojggienmiejhblkhenjdbno).

## usage
You can find the simulator in the *Chrome Devtools* in a tab named `COBI`.

The simulator offers some basic manual controls:
- thumb controller selection
- thumb controller actions
- location
- touch interaction

Furthermore it is also possible to load a `cobitrack` or `gpx` file which the simulator will convert into events and reproduce them in the same tempo as they were recorded.

You can find some example files in the [tracks](tracks) folder.

## contributing

The simulator is written using [flow](https://flow.org/), a powerful static type analyzer for Javascript.
Therefore it is recommended to use an IDE with `flow` support such as `Atom` or `Webstorm`.

The code is separated into modules which are transpiled and minified using `gulp`.
For best development experience I recommend you to run `npm run gulp watch` which
will retranspile all files if a change is detected.

If you just want to get a deployment version `npm run gulp once` will just do that.
The final files will be in the [app/chrome](app/chrome) folder.

To test your changes simply run `npm test`

To read more about the community and guidelines for submitting pull requests,
please read the [Contributing](CONTRIBUTING.md) document.

- style: We use [ESLint](http://eslint.org/) `standard` javascript style. Please
make sure to conform to it before submitting a pull request.

### install development version locally
- go to `chrome settings` -> `extensions`
- activate `developer mode` on the top right
- click `load unpacked extension` on the top left
- select the `app/chrome` local folder
- welcome to the club :)

### Debugging (in Chrome)

What to do if the extension breaks:

- check the error console of devtools. Part of COBI Devtools runs code in the
context of your page, and is vulnerable to misbehaving polyfills.

- open devtools out into a new window, and then hit the shortcut to open devtools again (cmd+option+i or ctrl+shift+i). This is the `debug devtools` debugger. Check the console there for errors. If you want to file a bug, please save the content of this console as described [here](https://developers.google.com/web/tools/chrome-devtools/console/#saving_the_history)

- open chrome://extensions, find COBI, and click "background page" under
"Inspected views". You might find the errors there.

## license

Copyright © 2017 COBI GmbH
