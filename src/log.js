// @flow

const log = (v: any) => `console.log(${JSON.stringify(v)})`
const info = (v: any) => `console.info(${JSON.stringify(v)})`
const warn = (v: any) => `console.warn(${JSON.stringify(v)})`
const error = (v: any) => `console.error(${JSON.stringify(v)})`

module.exports.log = log
module.exports.info = info
module.exports.error = error
module.exports.warn = warn
