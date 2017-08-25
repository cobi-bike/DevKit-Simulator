
# COBI DevKit Simulator

COBI DevKit Simulator is a Chrome Extension to test COBI Modules in the browser with simulated data sources. Continuous riding & fitness data can be simulated by one of our sample cobitrack or GPX files. 

This project is part of the [COBI DevKit](https://github.com/cobi-bike/devkit/).

![DevKit Simulator](/resources/DevKit%20Simulator.jpg)

Compatible with Chrome version 45+.

## Install

The easiest way to get the COBI DevKit Simulator is to install it directly from the
[Chrome Webstore](https://chrome.google.com/webstore/detail/cobi-jetpack-simulator/hpdhkapigojggienmiejhblkhenjdbno).

## Usage

You can find the DevKit Simulator in the *Chrome Devtools* in a tab named `COBI`.

The Simulator offers some basic manual controls:
* Thumb Controller actions 
* Thumb Controller type
* Simulate current location
* Set navigation destination
* Simulate availability of touch interaction

Furthermore it is also possible to load a `cobitrack` or `gpx` file which the simulator will convert into events and reproduce them in the same tempo as they were recorded.

You can find example files in the [tracks](tracks) folder.

## Contributing

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

### Install development version locally

* Launch `Chrome` and open `Window` -> `Extensions`
* Activate `Developer mode` on the top right
* Click `Load unpacked extension...` on the top left
* Select the `app/chrome` local folder
* You're ready to go!

### Debugging in Chrome

What to do if the extension breaks:

* Check the error console of devtools. Part of COBI Devtools runs code in the
context of your page, and is vulnerable to misbehaving polyfills.
* Open devtools out into a new window, and then hit the shortcut to open devtools again (cmd+option+i or ctrl+shift+i). This is the `debug devtools` debugger. Check the console there for errors. If you want to file a bug, please save the content of this console as described [here](https://developers.google.com/web/tools/chrome-devtools/console/#saving_the_history)
* Open chrome://extensions, find COBI, and click "background page" under
"Inspected views". You might find the errors there.
