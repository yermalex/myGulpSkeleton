"use strict";

const { src, dest } = require("gulp"); //чтение и запись файлов
const gulp = require("gulp");
const autoprefixer = require("gulp-autoprefixer"); //автоматические вендерные префиксы
const cssbeautify = require("gulp-cssbeautify"); //оформление CSS
const removeComments = require("gulp-strip-css-comments"); // убирает комменты
const rename = require("gulp-rename"); //переименование для вывода еще min файла
//const less = require("gulp-less"); //компилятор less
const sass = require("gulp-sass"); //компилятор sass
const cssnano = require("gulp-cssnano"); //сжитие оптимизация css 
const group_media = require("gulp-group-css-media-queries"); //группировка медиа вконце файла
const rigger = require("gulp-rigger"); //склеивать js файлы
const uglify = require("gulp-uglify"); //сжатие оптимизация js
const plumber = require("gulp-plumber"); //не дает ломатья гальпу, если были ошибки
const imagemin = require("gulp-imagemin"); //отптимизирует картинки
const webp = require("gulp-webp"); //конвертация картинки в webp
const webphtml = require("gulp-webp-html"); //автоматическое подключение webp в html
const webpcss = require("gulp-webpcss"); //автоматическое подключение webp в css
const svgSprite = require("gulp-svg-sprite"); //создание svg спрайта
const ttf2woff = require("gulp-ttf2woff"); //конвертация ttf в woff
const ttf2woff2 = require("gulp-ttf2woff2"); //конвертация ttf в woff2
const fonter = require("gulp-fonter"); //конвертация otf в ttf
const fs = require("fs"); //для подключения шрифтов в css
const del = require("del"); //очищает папку дист
const panini = require("panini"); //шаблоны для html
const browsersync = require("browser-sync").create(); //локальный сервер с лайв релоад

/* Paths */
var path = {
  build: {
    html: "dist/",
    js: "dist/assets/js/",
    css: "dist/assets/css/",
    images: "dist/assets/img/",
    fonts: "dist/assets/fonts/",
  },
  src: {
    html: "src/*.html",
    js: "src/assets/js/*.js",
    css: "src/assets/sass/style.scss",
    images: "src/assets/img/**/*.{jpg,png,svg,gif,ico,webp}",
    fonts: "src/assets/fonts/*.ttf",
  },
  watch: {
    html: "src/**/*.html",
    js: "src/assets/js/**/*.js",
    css: "src/assets/sass/**/*.scss",
    images: "src/assets/img/**/*.{jpg,png,svg,gif,ico,webp}",
  },
  clean: "./dist/",
};

/* Tasks */
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "./dist/",
    },
    port: 3000,
    notify: false
  });
}

function browserSyncReload(done) {
  browsersync.reload();
}

function html() {
  panini.refresh();
  return src(path.src.html, { base: "src/" })
    .pipe(plumber())
    .pipe(
      panini({
        root: "src/",
        layouts: "src/tpl/layouts/", //шаблоны
        partials: "src/tpl/partials/", //фрагменты кода, секции
        helpers: "src/tpl/helpers/",
        data: "src/tpl/data/",
      })
    )
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream());
}

function css() {
  return src(path.src.css, { base: "src/assets/sass/" })
    .pipe(plumber())
    .pipe(sass())
    .pipe(group_media())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ["last 5 versions"],
        cascade: true,
      })
    )
    .pipe(cssbeautify())
    .pipe(webpcss())
    .pipe(dest(path.build.css))
    .pipe(
      cssnano({
        zindex: false,
        discardComments: {
          removeAll: true,
        },
      })
    )
    .pipe(removeComments())
    .pipe(
      rename({
        suffix: ".min",
        extname: ".css",
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream());
}

function js() {
  return src(path.src.js, { base: "./src/assets/js/" })
    .pipe(plumber())
    .pipe(rigger())
    .pipe(gulp.dest(path.build.js))
    .pipe(uglify())
    .pipe(
      rename({
        suffix: ".min",
        extname: ".js",
      })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream());
}

function images() {
  return src(path.src.images)
    .pipe(
      webp({
        quality: 70
      })
    )
    .pipe(dest(path.build.images))
    .pipe(src(path.src.images))
    .pipe(
      imagemin({
        progressive: true,
        svgoPlugins: [{ removeViewBox: false}],
        interlaced: true,
        optimizationLevel: 3 // 0 to 7
      })
    )
    .pipe(dest(path.build.images))
    .pipe(browsersync.stream());
}

function fonts(params) {
  src(path.src.fonts)
    .pipe(ttf2woff())
    .pipe(dest(path.build.fonts));
  return src(path.src.fonts)
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts));
}

function clean() {
  return del(path.clean);
}

gulp.task('otf2ttf', function () {
  return src(['src/assets/fonts/*.otf'])
    .pipe(
      fonter({
        formats: ['ttf']
      })
    )
    .pipe(dest('src/assets/fonts/'))
})

gulp.task('svgSprite', function () {
  return gulp.src(['src/assets/img/iconsprite/*.svg'])
    .pipe(
      svgSprite({
        mode: {
          stack: {
            sprite: '../icons/icons.svg',
            // example: true
          }
        },
      })
    )
    .pipe(dest(path.build.images))
})

// JS-ФУНКЦИЯ ЗАПИСИ ИНФОРМАЦИИ В FONTS.SCSS
function fontsStyle(params) {
  let file_content = fs.readFileSync('src/assets/sass/fonts.scss');
  if (file_content == '') {
    fs.writeFile('src/assets/sass/fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split('.');
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile('src/assets/sass/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
          }
          c_fontname = fontname;
        }
      }
    })
  }
}

function cb() {}

function watchFiles() {
  gulp.watch([path.watch.html], html);
  gulp.watch([path.watch.css], css);
  gulp.watch([path.watch.js], js);
  gulp.watch([path.watch.images], images);
}

const build = gulp.series(clean, gulp.parallel(html, css, js, images, fonts), fontsStyle);
const watch = gulp.parallel(build, watchFiles, browserSync);

/* Exports Tasks */
exports.html = html;
exports.css = css;
exports.js = js;
exports.images = images;
exports.fonts = fonts;
exports.fontsStyle = fontsStyle;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = watch;
