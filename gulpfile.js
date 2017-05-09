const gulp = require('gulp')
const babel = require('gulp-babel')
const concat = require('gulp-concat')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')

// ------ configurations
const babelBrowser = {
  presets: [
    'flow',
    ['env', {
      'targets': {
        'browsers': ['Chrome >= 43']}}]]}

// ---------- tasks
gulp.task('browser', function () {
  const chromePath = 'src/chrome.hooks.js'
  const b = browserify(chromePath)
  b.transform(babelify, babelBrowser)
  // run automatically on every update
  b.bundle()
      .on('error', function (err) {
        console.error(err.toString())
        this.emit('end')
      })
      .pipe(source(chromePath))
      .pipe(buffer())
      .pipe(concat('index.js')) // output filename
      .pipe(gulp.dest('app/chrome/'))
})

gulp.task('node', function () {
  return gulp.src('src/*.js')
    .pipe(babel({presets: ['flow']}))
    .pipe(gulp.dest('lib'))
})

// build everything once, probably for production
gulp.task('once', ['browser', 'node'])
// watch and rebuild everything on change
gulp.task('watch', function () {
  gulp.watch('src/*.js', ['browser', 'node'])
})
