const gulp = require('gulp')
const concat = require('gulp-concat')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')

const sourcesPath = 'src/chrome.hooks.js'
const babelConfig = {
  presets: [
    'flow',
    ['env', {
      'targets': {
        'browsers': ['Chrome >= 43']
      }
    }]
  ]
}

gulp.task('default', function () {
  const b = browserify(sourcesPath)
  b.transform(babelify, babelConfig)

  b.bundle()
    .pipe(source(sourcesPath))
    .pipe(buffer())
    .pipe(concat('index.js')) // output filename
    .pipe(gulp.dest('app/chrome/'))
})
