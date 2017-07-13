
# COBI.js simulator

COBI DevKit Simulator is a browser-based IDE to simulate the expected behavior
of a web app for the COBI system.

It is currently only available for Chrome browsers version 48 or greater.

More information:
- [COBI.js library](https://github.com/cobi-bike/COBI.js)
- [COBI DevKit Forum](https://forums.cobi.bike/)

## install
The easiest way to get the COBI Devkit simulator is to install it directly from the
[Chrome Webstore](https://chrome.google.com/webstore/detail/cobi-jetpack-simulator/hpdhkapigojggienmiejhblkhenjdbno).

You need to be logged in as a *COBI employee* in order to access the previous link.

## usage
You can find the simulator in the *Chrome Devtools* in a tab named `COBI`.

You can use the simulator manually through its controllers or by replaying a
`cobitrack` or `gpx` file. Please note that some controllers are disabled during
file playback. You can find example playback files in the `assets` folder.

## contributing

The simulator is written using [flow](https://flow.org/), a powerful static type analyzer for Javascript.
Therefore it is recommended to use an IDE with `flow` support such as `Atom` or `Webstorm`.

The code is separated into modules which are transpiled and minified using `gulp`.
For best development experience I recommend you to run `npm run gulp watch` which
will retranspile all files if a change is detected.

If you just want to get a deployment version `npm run gulp once` will just do that.
The final files will be in the `app/chrome` folder.

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

What to do if the extension breaks.

- check the error console of devtools. Part of React Devtools runs scripts in the
context of your page, and is vulnerable to misbehaving polyfills.

- open devtools out into a new window, and then hit the shortcut to open devtools again (cmd+option+i or ctrl+shift+i). This is the "debug devtools" debugger. Check the console there for errors.

- open chrome://extensions, find COBI, and click "background page" under
"Inspected views". You might find the errors there.

## license

Copyright © 2017 COBI GmbH
