// @flow

module.exports = {
  log: (v: any) => `console.log(${JSON.stringify(v)})`,
  info: (v: any) => `console.info(${JSON.stringify(v)})`,
  warn: (v: any) => `console.warn(${JSON.stringify(v)})`,
  error: (v: any) => `console.error(${JSON.stringify(v)})`
}
