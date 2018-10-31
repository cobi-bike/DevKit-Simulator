
module.exports = {
    info: (v) => `console.info(${JSON.stringify(v)})`,
    warn: (v) => `console.warn(${JSON.stringify(v)})`,
    error: (v) => `console.error(${JSON.stringify(v)})`
}
