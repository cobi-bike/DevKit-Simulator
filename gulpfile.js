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
        'browsers': ['Chrome >= 45']}}]]}

function handleError (err) {
  console.error(err.toString())
  this.emit('end')
}

// ---------- tasks
gulp.task('browser', function () {
  console.log('\n')// only separating the log lines :)
  const chromePath = 'src/chrome.hooks.js'
  const b = browserify(chromePath)
  b.transform(babelify, babelBrowser)
  // run automatically on every update
  b.bundle()
      .on('error', handleError)
      .pipe(source(chromePath))
      .pipe(buffer())
      .pipe(concat('index.js')) // output filename
      .pipe(gulp.dest('app/chrome/'))
})

gulp.task('node', function () {
  return gulp.src('src/*.js')
    .pipe(babel({presets: ['flow']}))
    .on('error', handleError)
    .pipe(gulp.dest('lib'))
})

gulp.task('copy', function () {
  return gulp.src('resources/**/*.*')
             .pipe(gulp.dest('app/chrome/'))
})

// build everything once, probably for production
gulp.task('once', ['browser', 'node', 'copy'])
// watch and rebuild everything on change
gulp.task('watch', () => gulp.watch(['src/*.js', 'resources/**/*.*'], ['browser', 'node', 'copy']))
