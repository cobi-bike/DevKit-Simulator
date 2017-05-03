const gulp = require('gulp')
const concat = require('gulp-concat')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')
const watchify = require('watchify')

const sourcesPath = 'src/chrome.hooks.js'
const watchifyOpts = {
  cache: {},
  packageCache: {},
  plugin: [watchify]
}
const babelConfig = {
  presets: [
    'flow',
    ['env', {
      'targets': {
        'browsers': ['Chrome >= 43']}}]]}
const bundle = function () {
  b.bundle()
    .on('error', function (err) {
      console.error(err.toString())
      this.emit('end')
    })
    .pipe(source(sourcesPath))
    .pipe(buffer())
    .pipe(concat('index.js')) // output filename
    .pipe(gulp.dest('app/chrome/'))
}

// --------------------------------
const b = browserify(sourcesPath, watchifyOpts)
b.transform(babelify, babelConfig)
b.on('update', bundle)
b.on('log', console.info)

gulp.task('default', bundle)
