const gulp = require('gulp')
const concat = require('gulp-concat')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')
const sourcemaps = require('gulp-sourcemaps')

function handleError (err) {
  console.error(err.toString())
  this.emit('end')
}

function transpile (src, dest) {
  const b = browserify(src, {debug: true})
  b.transform(babelify, {
    sourceMaps: true,
    presets: [
      ['@babel/env', {
        'targets': {
          'browsers': ['Chrome >= 45']}}]]
  })
  // run automatically on every update
  b.bundle()
    .on('error', handleError)
    .pipe(source(src))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(concat(dest)) // output filename
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('app/chrome/'))
}

// ---------- tasks
gulp.task('chrome.index', () => transpile('src/chrome.index.js', 'index.js'))
gulp.task('chrome.devtools', () => transpile('src/chrome.devtools.js', 'devtools.js'))
gulp.task('browser', ['chrome.index', 'chrome.devtools'])

gulp.task('resources', function () {
  return gulp.src('resources/**/*.*')
    .pipe(gulp.dest('app/chrome/'))
})

gulp.task('tracks', function () {
  return gulp.src('tracks/**/*.*')
    .pipe(gulp.dest('app/chrome/tracks'))
})

gulp.task('copy', ['resources', 'tracks'])
// build everything once, probably for production
gulp.task('once', ['browser', 'copy'])
// watch and rebuild everything on change
gulp.task('watch', () => {
  gulp.watch(['src/**/*.js', 'resources/**/*.*'], ['browser', 'copy'])
    .on('change', event => console.log(`\nFile ${event.path} was ${event.type}, running tasks...`))
})
