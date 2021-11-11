const { src, dest, watch, parallel, series } = require('gulp');

let fs                    = require('fs');
const scss                = require('gulp-sass')(require('sass'));
const concat              = require('gulp-concat');
const sync                = require('browser-sync').create();
const autoprefixer        = require('gulp-autoprefixer');
const del                 = require('del');
const ttf2woff            = require('gulp-ttf2woff');
const ttf2woff2           = require('gulp-ttf2woff2');
const imagemin            = require('gulp-imagemin');
const webpackStream       = require('webpack-stream');
const imageCache          = require('gulp-cache');
const pug                 = require('gulp-pug');
const minimist            = require('minimist')

const { env } = minimist(process.argv.slice(2), {
  string: 'env',
  default: {
    env: process.env.NODE_ENV || 'development',
  },
});

const webpackConfig       = require('./webpack.config')({ mode: env })

// === FILES PATHS === //
const source_folder = '#app';
const dist = 'dist';
const scirptFileName = 'main';
  // if we want give rename dist folder to project folder name
// let project_folder = require("path").basename(__dirname); 

const path = {
  // get source folder paths
  src: {
    pug: source_folder + "/pages/*.pug",
    scss: source_folder + "/scss/style.scss",
    js: source_folder + `/js/${scirptFileName}.js`,
    img: source_folder + "/images/**/*.+(png|jpg|gif|ico|svg|webp)",
    fonts: source_folder + "/fonts/*.ttf",
  },

  // get production folder paths
  build: {
    html: dist + "/",
    css: dist + "/css/",
    js: dist + "/js/",
    img: dist + "/images/",
    fonts: dist + "/fonts/",
  },

  // get path files which need waching
  watch: {
    pug: source_folder + "/pages/**/*.pug",
    scss: source_folder + "/scss/**/*.scss",
    js: source_folder + "/js/**/*.js",
    img: source_folder + "/images/**/*.+(png|jpg|gif|ico|svg|webp)",
  }
};

// for reload browser when did some change
function browserSync() {
  sync.init({
    port: 3000,
    server: {
      baseDir: dist + "/" // dist + '/' // 'dist/
    },
  });
}

// for clean dist folder 
function cleanDist() {
  return del(dist)
}

// for min images and sage good quality
function images() {
  return src(path.src.img)
    .pipe(imageCache(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.mozjpeg({quality: 75, progressive: true}),
      imagemin.optipng({optimizationLevel: 5}),
      imagemin.svgo({
        plugins: [
          {removeViewBox: true},
          {cleanupIDs: false}
        ]
      })
    ])))
    .pipe(dest(path.build.img))
}

// for get html files and concat it
async function pugToHtml() {
  return src(path.src.pug)
    .pipe(pug({
      doctype: 'html',
      pretty: true
    }))
    .pipe(dest(path.build.html))
    .pipe(sync.stream())
}

// forking with scripts dev
function scripts() {
  return src([
    path.src.js
  ])
  // webpack
  .pipe(webpackStream({ ...webpackConfig }))
  // after send all of them in app/js folder
  .pipe(dest(path.build.js))
  // after reload browser
  .pipe(sync.stream())
  .on("end", sync.reload);
}

// forking with scripts production we should run npm productionScripts for that
function productionScripts() {
  return src(path.src.js)
                .pipe(webpackStream({
                    mode: 'production',
                    output: {
                        filename: `${scirptFileName}.min.js`
                    },
                    module: {
                        rules: [
                          {
                            test: /\.m?js$/,
                            exclude: /(node_modules|bower_components)/,
                            use: {
                              loader: 'babel-loader',
                              options: {
                                presets: [['@babel/preset-env', {
                                    corejs: 3,
                                    useBuiltIns: "usage"
                                }]]
                              }
                            }
                          }
                        ]
                      }
                }))
                .pipe(dest(path.build.js));
}

// the function for convert scss to css
function styles() {
  // get src of scss
  return src(path.src.scss)
    // convert to css by using gulp-sass
    .pipe(scss({outputStyle: 'compressed'})) // for default expanded scss({ outputStyle: 'expanded' }).on('error', scss.logError)
    // rename file css and minif it
    .pipe(concat('style.min.css'))
    // add prefixes for older browsers
    .pipe(autoprefixer({
      overrideBrowserslist: ['last 10 version'],
      grid: true
    }))
    // send the finish css file to the src
    .pipe(dest(path.build.css))
    // now tracking these file by using browserSync
    .pipe(sync.stream())
}

// convert .ttf2woff to woff2
function fonts() {
  src(path.src.fonts) //"app/fonts/*.ttf"
    .pipe(ttf2woff())
    .pipe(dest(path.build.fonts));
  return src(path.src.fonts)
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts));
}

// get all fonts and add path for them in fonts.scss and put them in build.css
function fontsStyle() {
  let fileContent = fs.readFileSync(source_folder + '/scss/0-base/_typography.scss');
  if (fileContent == '') {
    fs.writeFile(source_folder + '/scss/0-base/_typography.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let cFontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (cFontname != fontname) {
            fs.appendFile(source_folder + '/scss/0-base/_typography.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
          }
          cFontname = fontname;
        }
      }
    })
  }
}

function cb() {}

// function for tracking changes
function watching() {
  // gulp.watch starting to track the files and 
  watch([path.watch.pug], pugToHtml);
  // start using styles if it need
  watch([path.watch.scss], styles);
  // tracking all files js exept !main.min.js
  watch([path.watch.js, `!${source_folder}/js/main.min.js`], scripts);
  // tracking after all images
  watch(path.watch.img, images);
  // reload browser when has some changing in html file
  watch([path.watch.pug]).on('change', sync.reload);
}

// build production folder(dist) with all files 
let build       = series(cleanDist, parallel(scripts, styles, pugToHtml, images), fontsStyle, fonts); 
// when we starting gulp by write gulp the both function will be strated
exports.default =  parallel(build, watching, browserSync);

exports.build   = build;

