// @flow

const containsCOBIjs = 'COBI !== null && COBI !== undefined'
const emitStr = (path: string, value: any) => `COBI.__emitter.emit("${path}", ${JSON.stringify(value)})`

module.exports.containsCOBIjs = containsCOBIjs
module.exports.emitStr = emitStr
