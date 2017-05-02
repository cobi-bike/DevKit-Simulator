// @flow

const containsCOBIjs = 'COBI !== null && COBI !== undefined'
const foreignLog = (v: any) => `console.info(${JSON.stringify(v)})`
const foreignError = (v: any) => `console.warn("COBI simulator - internal error", ${JSON.stringify(v)})`

const emitStr = (path: string, value: any) => `COBI.__emitter.emit("${path}", ${JSON.stringify(value)})`

module.exports.containsCOBIjs = containsCOBIjs
module.exports.foreignLog = foreignLog
module.exports.foreignError = foreignError
module.exports.emitStr = emitStr
