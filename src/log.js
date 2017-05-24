// @flow

const log = (v: any) => `console.log(${JSON.stringify(v)})`
const info = (v: any) => `console.log(${JSON.stringify(v)})`
const warn = (v: any) => `console.warn("COBI simulator", ${JSON.stringify(v)})`
const error = (v: any) => `console.warn("COBI simulator - internal error", ${JSON.stringify(v)})`

const level = {
  VERBOSE: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3
}

const amidst = (niveau: number, content: string) => {
  switch (niveau) {
    case level.VERBOSE:
      return log(content)
    case level.INFO:
      return info(content)
    case level.WARNING:
      return warn(content)
    case level.ERROR:
      return error(content)
    default:
      throw new Error(`unsupported log level: ${niveau}`)
  }
}

module.exports.log = log
module.exports.info = info
module.exports.error = error
module.exports.warn = warn
module.exports.level = level
module.exports.amidst = amidst
