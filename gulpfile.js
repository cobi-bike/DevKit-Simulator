const gulp = require('gulp')
const concat = require('gulp-concat')
const zip = require('gulp-zip')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const browserify = require('browserify')
const babelify = require('babelify')
const sourcemaps = require('gulp-sourcemaps')

function handleError (err) {
    console.error(err.toString())
    this.emit('end')
}

function adaptForBrowsers (src, dest) {
    const b = browserify(src, { debug: true })
    b.transform(babelify, {
        sourceMaps: true,
        presets: [
            ['@babel/env', {
                'targets': {
                    'browsers': ['Chrome >= 45'] } }]]
    })
    // run automatically on every update
    return b.bundle()
        .on('error', handleError)
        .pipe(source(src))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(concat(dest)) // output filename
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('app/chrome/'))
}

// ---------- tasks
const browser = gulp.parallel(() => adaptForBrowsers('src/panel.js', 'index.js'),
    () => adaptForBrowsers('src/background.js', 'background.js'),
    () => adaptForBrowsers('src/devtools.js', 'devtools.js'))

function copyResources () {
    return gulp.src('resources/**/*.*')
        .pipe(gulp.dest('app/chrome/'))
}

function copyCobiTracks () {
    return gulp.src('tracks/**/*.*')
        .pipe(gulp.dest('app/chrome/tracks'))
}

function compressChromeDir () {
    return gulp.src('app/chrome/**')
        .pipe(zip('chrome.zip'))
        .pipe(gulp.dest('app'))
}

const copy = gulp.parallel(copyResources, copyCobiTracks)

// build everything once, probably for production
const buildAndPack = gulp.series(gulp.parallel(browser, copy), compressChromeDir)

// watch and rebuild everything on change
function watchAndBuild () {
    gulp.watch('src/**/*.js', browser)
        .on('change', filename => console.log(`\n${filename} changed, rebuilding...`))
    gulp.watch('resources/**/*.*', copyResources)
        .on('change', filename => console.log(`\n${filename} modified, copying...`))
}

module.exports.build = buildAndPack
module.exports.watch = watchAndBuild
