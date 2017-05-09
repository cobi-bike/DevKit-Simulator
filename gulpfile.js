const gulp = require('gulp')
const concat = require('gulp-concat')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')
const watchify = require('watchify')

// ------ configurations
const chromePath = 'src/chrome.hooks.js'
const srcGlob = 'src/*.js'

const watchifyOpts = {
  cache: {},
  packageCache: {},
  plugin: [watchify]
}
const babelBrowser = {
  presets: [
    'flow',
    ['env', {
      'targets': {
        'browsers': ['Chrome >= 43']}}]]}

const babelNode = {presets: ['flow']}

// ---------- tasks
gulp.task('browser', function () {
  const b = browserify(chromePath, watchifyOpts)
  b.transform(babelify, babelBrowser)
  // run automatically on every update
  const bundleBrowser = function () {
    b.bundle()
      .on('error', function (err) {
        console.error(err.toString())
        this.emit('end')
      })
      .pipe(source(chromePath))
      .pipe(buffer())
      .pipe(concat('index.js')) // output filename
      .pipe(gulp.dest('app/chrome/'))
  }
  // build once and wait for updates
  b.on('update', bundleBrowser)
  b.on('log', console.info)
  bundleBrowser()
})
