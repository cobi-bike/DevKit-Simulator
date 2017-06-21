
# COBI.js simulator

COBI DevKit Simulator is a browser-based IDE to simulate the expected behavior
of a web app for the COBI system.

It is currently only available for Chrome browsers version 48 or greater.

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

### install development version locally
- go to `chrome settings` -> `extensions`
- activate `developer mode` on the top right
- click `load unpacked extension` on the top left
- select the `app/chrome` local folder
- welcome to the club :)

## license

Copyright © 2017 COBI GmbH
