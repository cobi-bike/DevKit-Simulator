
const spec = require('./spec')
const GJV = require('geojson-validation')

/**
 * A COBI json message representation
 * @typedef {Object} Message
 * @property {string} action - read, write or notify
 * @property {string} path - the cobi spec property path
 * @property {number} timestamp - the unix timestamp for the creation of the message in milliseconds
 * @property {*} payload - the value of the property
 */

/**
 * converts a log of COBI.bike Bus events from their absolute epoch value
 * to a relative one with the lowest epoch as base.
 * @param {Message[]} cobiTrack
 * @returns {Message[]}
 */
module.exports.normalize = function (cobiTrack) {
    const start = Math.min(...cobiTrack.map(m => m.timestamp)) // first timestamp
    return cobiTrack.map(message => { return { ...message, timestamp: message.timestamp - start } })
}

/**
 * take a feature collection and returns the first linestring feature that
 * also contains timestamp (coordTimes)
 * @param {FeatureCollection} geojson
 * @returns {Feature || null} a geojson linestring feature if any was found
 */
module.exports.fetchLineStr = function (geojson) {
    return geojson.features.find(v => {
        return GJV.isFeature(v) && v.geometry && GJV.isLineString(v.geometry) &&
          Array.isArray(v.geometry.coordinates) && v.properties &&
          Array.isArray(v.properties.coordTimes) &&
          v.properties.coordTimes.length === v.geometry.coordinates.length
    })
}

/**
 * converts a geojson feature and returns a cobitrack compatible
 * js representation with relative timestamps
 * @param {Feature} geoTrack a geojson linestring with timestamps inside
 */
module.exports.geoToTrack = function (geoTrack) {
    const times = geoTrack.properties.coordTimes.map(Date.parse)
    const start = times[0]
    const ntimes = times.map(v => v - start)

    if (geoTrack.geometry && geoTrack.geometry.coordinates) {
        return geoTrack.geometry.coordinates
            .map(([lon, lat], index) => { return { ...module.exports.partialMobileLocation(lon, lat), timestamp: ntimes[index] } })
    }
}

/**
 * create a cobi spec location using only lat and lon values
 * @param {number} longitude
 * @param {number} latitude
 * @returns {{action: string, path: string, payload: {altitude: number, bearing: number, coordinate: {latitude: *, longitude: *}, speed: number}}}
 */
module.exports.partialMobileLocation = function (longitude, latitude) {
    return {
        'action': 'NOTIFY',
        'path': spec.mobile.location,
        'payload': {
            'altitude': 0,
            'bearing': 0,
            'coordinate': {
                'latitude': latitude,
                'longitude': longitude
            },
            'speed': 0
        }
    }
}

/**
 * creates a navigation service start navigation control
 * @param {number} longitude
 * @param {number} latitude
 * @returns {{action: string, path: string, payload: {action: string, destination: {latitude: number, longitude: number}}}}
 */
module.exports.partialStartControl = function (longitude, latitude) {
    return {
        'action': 'NOTIFY',
        'path': spec.navigationService.control,
        'payload': {
            'action': 'START',
            'destination': {
                'latitude': latitude,
                'longitude': longitude
            }
        }
    }
}

/**
 * @typedef latlng
 * @property {number} longitude
 * @property {number} latitude
 */

/**
 * creates a navigation service route message
 * @param {latlng} origin
 * @param {latlng} destination
 * @returns {{action: string, path: string, payload: {origin: {name: string, address: string, category: string, coordinate: latlng}, destination: {name: string, address: string, category: string, coordinate: latlng}}}}
 */
module.exports.partialRoute = function (origin, destination) {
    return {
        'action': 'NOTIFY',
        'path': spec.navigationService.route,
        'payload': {
            'origin': {
                'name': 'Solmsstraße',
                'address': 'Frankfurt am Main',
                'category': 'BICYCLE_RELEVANT',
                'coordinate': origin
            },
            'destination': {
                'name': 'Wonderland',
                'address': 'Neverland',
                'category': 'NIGHTLIFE',
                'coordinate': destination
            } }
    }
}

/**
 * check if there is any errors on the gpx file, returns null when no errors occurs
 * @param {Document} oDOM an xml DOM
 */
module.exports.gpxErrors = function (oDOM) {
    // print the name of the root element or error message
    if (oDOM.documentElement && oDOM.documentElement.nodeName === 'parsererror') {
        return 'parser error reading xml file'
    }
    return null
}

/**
 * check if the raw object is a valid cobitrack object
 * Returns an error message if so, otherwise undefined
 * @param {*} raw any js object
 */
module.exports.cobiTrackErrors = function (raw) {
    if (!Array.isArray(raw)) return `root element must be an Array`

    const notMessages = raw.filter(message => !(message.action &&
                                              message.path &&
                                              message.timestamp !== null &&
                                              message.payload !== null))
    if (notMessages.length > 0) {
        return `Every message MUST contain "action", "path" and "payload".
    the following elements failed: ${JSON.stringify(notMessages)}`
    }
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * @param {Function} func the function to debounce
 * @param {number} [wait] the amount of time to debounce
 * @param {boolean} [immediate] whether to call the function immediately the first time
 */
module.exports.debounce = function (func, wait, immediate) {
    const wait2 = wait || 500
    let timeout = null
    return () => {
        const later = function () {
            timeout = null
            if (!immediate) {
                func.apply(this, arguments)
            }
        }
        const callNow = immediate && !timeout
        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(later, wait2)
        if (callNow) {
            func.apply(this, arguments)
        }
    }
}
