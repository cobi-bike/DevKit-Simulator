// @flow

const containsCOBIjs = 'COBI !== null && COBI !== undefined'
const foreignLog = (v: any) => `console.log(${JSON.stringify(v)})`
const emitStr = (path: string, value: any) => `COBI.__emitter.emit("${path}", ${JSON.stringify(value)})`

module.exports.containsCOBIjs = containsCOBIjs
module.exports.foreignLog = foreignLog
module.exports.emitStr = emitStr
